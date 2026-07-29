// =============================================================================
// tests/save-durability-long.test.js — the DURABLE save path, over real seasons.
//
// tests/save-manager.test.js proves the manager's mechanics on synthetic
// two-line saves. tests/soak.js proves a career survives, but it serialises
// directly — it never touches the career library the player actually uses.
//
// Nothing covered the two together: a real multi-megabyte career pushed through
// queued autosaves, per-matchday recovery checkpoints and backup rotation, for
// season after season. That is the path a player's data actually travels, and
// the one where a slow or lossy write costs them a career rather than a test.
//
// Marked [slow]: it plays real seasons.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld } = require('./lib/invariants');

// Wires a production-shaped save manager (real validate/load/serialize) onto an
// in-memory adapter, and installs it where persistGame() will find it.
async function installManager(g, { failWrites = false } = {}) {
  const base = g.PPM.saveStorage.createMemoryAdapter();
  const writeMs = [];
  const adapter = {
    ...base,
    commit: async (payload) => {
      if (failWrites) throw new Error('storage full');
      const t = Date.now();
      const r = await base.commit(payload);
      writeMs.push(Date.now() - t);
      return r;
    },
  };
  const errors = [];
  let tick = 1000;
  const manager = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    now: () => ++tick,
    newId: (() => { let id = 0; return (prefix) => `${prefix}-${++id}`; })(),
    currentSchemaVersion: g.PPM.stateApi.SAVE_SCHEMA_VERSION,
    validateText: (text) => g.PPM.stateApi.validateSaveText(text),
    loadText: (text) => g.PPM.stateApi.loadGameFromText(text),
    serializeCurrent: () => g.PPM.stateApi.serializeGame(),
    onError: (e) => errors.push(e.message),
  });
  await manager.initialize();
  g.PPM.saveManager = manager;
  return { manager, adapter, errors, writeMs };
}

test('[slow] a real career survives seasons of queued autosaves and checkpoints', async () => {
  const g = bootFast(7301);
  try {
    const { manager, errors, writeMs } = await installManager(g);
    g.PPM.gameplay.newGame(0, 'PL');
    await manager.createCareer(g.PPM.stateApi.serializeGame(), 'Soak career');

    await playSeasons(g, 3, { saveEverySeason: false });
    await manager.flush();

    assert.deepEqual(errors, [], 'no write ever failed');

    // What the player would resume from must BE the career they just played.
    const careers = await manager.listCareers();
    assert.equal(careers.length, 1, 'one career, updated in place — not one per save');
    const stored = careers[0];
    assert.equal(stored.summary.season, g.PPM.state.G.season,
      'the stored snapshot is the season actually reached');

    // And it must load back into a world that still holds together.
    const parsed = g.PPM.stateApi.validateSaveText(stored.data);
    assert.ok(parsed, 'the stored career validates');
    const fresh = bootFast(7302);
    try {
      const reloaded = fresh.PPM.stateApi.loadGameFromText(stored.data);
      assert.deepEqual(checkWorld(reloaded), [], 'the resumed world is intact');
      assert.equal(reloaded.season, g.PPM.state.G.season);
    } finally { fresh.__stopGalaClicker(); }

    // Recovery checkpoints are a rolling window, not a growing pile: three
    // ordinary ones, however many matchdays and seasons went past.
    const backups = await manager.listBackups();
    assert.ok(backups.length <= 3,
      `recovery checkpoints stay bounded (found ${backups.length} after 3 seasons)`);
    assert.ok(backups.length >= 1, 'and there is something to recover from');

    // A write that takes long enough to be felt would show up here; the whole
    // point of the queue is that the player never waits for one.
    const median = writeMs.slice().sort((a, b) => a - b)[Math.floor(writeMs.length / 2)];
    assert.ok(writeMs.length > 10, `the career actually wrote (${writeMs.length} commits)`);
    assert.ok(median < 250, `median autosave commit stays quick (${median}ms over ${writeMs.length} writes)`);
  } finally { g.__stopGalaClicker(); }
});

test('[slow] autosave coalesces instead of queueing one write per matchday', async () => {
  const g = bootFast(7303);
  try {
    const { manager, adapter } = await installManager(g);
    g.PPM.gameplay.newGame(0, 'PL');
    await manager.createCareer(g.PPM.stateApi.serializeGame(), 'Coalesce');

    let commits = 0;
    const realCommit = adapter.commit;
    adapter.commit = async (p) => { commits++; return realCommit(p); };

    await playSeasons(g, 1, { saveEverySeason: false });
    await manager.flush();

    // A season is 22 matchdays, each persisting more than once (result commit,
    // inbox, finances). If every call became its own write the player would be
    // paying megabytes of I/O per round.
    assert.ok(commits < 22 * 6,
      `writes must coalesce, not track every persistGame() call (${commits} commits in one season)`);
    assert.ok(commits > 0, 'and the season did reach storage');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a career survives a storage failure without losing the last good save', async () => {
  const g = bootFast(7304);
  try {
    const { manager, adapter, errors } = await installManager(g);
    g.PPM.gameplay.newGame(0, 'PL');
    await manager.createCareer(g.PPM.stateApi.serializeGame(), 'Failure');
    await playSeasons(g, 1, { saveEverySeason: false });
    await manager.flush();
    const good = (await manager.listCareers())[0];
    assert.ok(good.data.length > 1000, 'a real career is stored');

    // Storage goes away mid-career, exactly as a full disk would.
    const realCommit = adapter.commit;
    adapter.commit = async () => { throw new Error('storage full'); };
    await playSeasons(g, 1, { saveEverySeason: false });
    await manager.flush();

    assert.ok(errors.length >= 1, 'the failure is reported');
    assert.equal(errors.length, 1, 'and reported once, not once per write');
    const afterFailure = (await manager.listCareers())[0];
    assert.equal(afterFailure.data, good.data,
      'the last good career is still there, untouched by the failed writes');

    // Storage comes back; the next save must land.
    adapter.commit = realCommit;
    g.PPM.stateApi.persistGame();
    await manager.flush();
    const recovered = (await manager.listCareers())[0];
    assert.notEqual(recovered.data, good.data, 'the career resumes saving once storage returns');
    assert.ok(g.PPM.stateApi.validateSaveText(recovered.data), 'and what it wrote is valid');
  } finally { g.__stopGalaClicker(); }
});
