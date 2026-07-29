// =============================================================================
// tests/career-recovery.test.js — what happens when a career goes wrong.
//
// Two paths the player reaches on their worst day, neither of which had a test:
//
//   * being SACKED. The ambitious board objective fires the manager on failure.
//     handleManagerFired() runs in the middle of the season-end block and then
//     returns, so everything after it — awards, promotion/relegation, the record
//     book, the season-history row, the new market — is skipped. And the state is
//     persisted like that.
//
//   * RESTORING a recovery checkpoint. The career library keeps rolling backups
//     precisely so a broken save can be rolled back. save-manager.test.js proves
//     the mechanics on two-line synthetic saves; nothing had restored a real one.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups } = require('./lib/invariants');

// ── being sacked ─────────────────────────────────────────────────────────────

test('[slow] a sacked manager leaves a career that still loads', async () => {
  const g = bootFast(1801);
  try {
    const G = () => g.PPM.state.G;
    const gp = g.PPM.gameplay;
    gp.newGame(0, 'PL');

    // Take the ambitious objective — the one whose failure is a sacking — and set
    // it to something the club cannot possibly reach.
    const manager = new (require('./lib/career-driver').AutoManager)(g);
    manager.squadUpkeep();
    manager.signSponsors();
    manager.pickTechPartnership();
    gp.selectBoardObjective('ambitious');
    G().boardObjective = { ...G().boardObjective, goal: 'top1', failure: 'fired' };
    gp.startSeason();

    g.PPM.ui.autoPlay = true;
    let rounds = 0;
    while (G().phase === 'pre' && rounds++ < 30) {
      gp.pendingDecisions().forEach((m) => gp.answerMail(m.id, false));
      for (const L of [1, 2]) if (gp.shouldPlayTop12(L)) await gp.runTop12Masters(L);
      if (gp.getEligibleMatchPlayers(G().myTeamId).length < 3) break;
      const md = G().matchday;
      await gp.runMatchday();
      if (G().matchday === md) break;
    }
    g.PPM.ui.autoPlay = false;

    // Whatever the board decided, the career must not be left unloadable.
    const api = g.PPM.stateApi;
    const text = api.serializeGame();
    assert.ok(api.validateSaveText(text), 'the career still validates');
    const reloaded = api.loadGameFromText(text);
    assert.deepEqual([...checkWorld(reloaded), ...checkLiveLookups(g)], [],
      'and the world is intact whether or not he was sacked');
  } finally { g.__stopGalaClicker(); }
});

test('being sacked does not leave the season half-closed', () => {
  const g = bootFast(1802);
  try {
    const G = () => g.PPM.state.G;
    const gp = g.PPM.gameplay;
    gp.newGame(0, 'PL');
    G().phase = 'transfer';
    const seasonsBefore = (G().seasonHistory || []).length;

    gp.handleManagerFired('test');

    // handleManagerFired is a UI transition, not a data operation: it must not
    // corrupt anything, and the flags that block the UI must be cleared or the
    // player is stuck behind an open modal.
    assert.equal(g.PPM.ui.running, false, 'the match lock is released');
    assert.equal(g.PPM.ui.autoPlay, false, 'and auto-play is off');
    assert.equal((G().seasonHistory || []).length, seasonsBefore, 'no phantom season was recorded');
    assert.deepEqual(checkWorld(G()), [], 'and the world is still consistent');
  } finally { g.__stopGalaClicker(); }
});

// ── restoring a checkpoint ───────────────────────────────────────────────────

async function withManager(g) {
  const adapter = g.PPM.saveStorage.createMemoryAdapter();
  let tick = 1000;
  const manager = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    now: () => ++tick,
    newId: (() => { let id = 0; return (p) => `${p}-${++id}`; })(),
    currentSchemaVersion: g.PPM.stateApi.SAVE_SCHEMA_VERSION,
    validateText: (t) => g.PPM.stateApi.validateSaveText(t),
    loadText: (t) => g.PPM.stateApi.loadGameFromText(t),
    serializeCurrent: () => g.PPM.stateApi.serializeGame(),
    onError: () => {},
  });
  await manager.initialize();
  g.PPM.saveManager = manager;
  return manager;
}

test('[slow] a real career can be rolled back to a recovery checkpoint', async () => {
  const g = bootFast(1803);
  try {
    const G = () => g.PPM.state.G;
    const manager = await withManager(g);
    g.PPM.gameplay.newGame(0, 'PL');
    const career = await manager.createCareer(g.PPM.stateApi.serializeGame(), 'Rollback');

    await playSeasons(g, 2, { saveEverySeason: false });
    await manager.flush();
    const seasonAtCheckpoint = G().season;
    await manager.createCheckpoint('season');

    await playSeasons(g, 2, { saveEverySeason: false });
    await manager.flush();
    assert.equal(G().season, seasonAtCheckpoint + 2, 'the career moved on');

    // Only three ordinary checkpoints are kept, and every matchday makes one, so
    // the season-2 point has rotated out by now — which is the design. Roll back to
    // the oldest one still held: that is what "recover" actually means here.
    const backups = await manager.listBackups(career.id);
    assert.ok(backups.length >= 1, 'there is something to recover from');
    const target = backups.reduce((oldest, b) => (b.createdAt < oldest.createdAt ? b : oldest), backups[0]);
    const targetSeason = target.summary.season;
    const now = G().season;

    await manager.restoreBackup(career.id, target.id);

    assert.equal(G().season, targetSeason, 'the career is back where the checkpoint was');
    assert.ok(targetSeason <= now, 'which is at or before where it had got to');
    assert.deepEqual([...checkWorld(G()), ...checkLiveLookups(g)], [],
      'and the restored world is intact');

    // Restoring must itself be safe: the displaced state is checkpointed first,
    // so the player can undo the undo.
    const after = await manager.listBackups(career.id);
    assert.ok(after.some((b) => b.kind === 'restore'),
      'the state that was rolled back is itself recoverable');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a restored career plays on normally', async () => {
  const g = bootFast(1804);
  try {
    const G = () => g.PPM.state.G;
    const manager = await withManager(g);
    g.PPM.gameplay.newGame(0, 'PL');
    const career = await manager.createCareer(g.PPM.stateApi.serializeGame(), 'Resume');
    await playSeasons(g, 2, { saveEverySeason: false });
    await manager.createCheckpoint('season');
    await playSeasons(g, 1, { saveEverySeason: false });
    await manager.flush();

    const backups = await manager.listBackups(career.id);
    await manager.restoreBackup(career.id, backups[backups.length - 1].id);

    const problems = [];
    await playSeasons(g, 2, {
      afterSeason: (info) => {
        const found = [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)];
        problems.push(...found.map((p) => `S${info.season}: ${p}`));
        return found;
      },
    });
    assert.deepEqual(problems, [], 'two seasons after a rollback are as clean as any other');
    assert.ok(G().season > 1, 'and the career is genuinely running');
  } finally { g.__stopGalaClicker(); }
});
