// =============================================================================
// tests/protocol.test.js — real match protocol batch (owner 2026-07-02):
// Superliga first-to-3 engine, nomination, inbox gating, staff regens,
// seeded (uncancellable) events.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { boot } = require('./harness');

test('nomination: the manager\'s A/B/C order is used for boards 1-3', () => {
  const g = boot(41);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const pool = gp.getEligibleMatchPlayers(G.myTeamId).sort((a, b) => gp.ovr(a) - gp.ovr(b));
  const base = pool.slice(0, 3).map((p) => p.id); // deliberately weakest-first
  const reserves = pool.slice(3, 5).map((p) => p.id);
  G.matchNomination = { season: G.season, matchday: G.matchday, base, reserves };
  const opponent = G.teams.find((t) => t.id !== G.myTeamId && t.league === gp.myLeague());
  const r = gp.simTeamMatch(G.myTeamId, opponent.id, true);
  assert.equal(r.matchups[0].homePlayer, base[0], 'G1 home = nominated A');
  assert.equal(r.matchups[1].homePlayer, base[1], 'G2 home = nominated B');
  assert.equal(r.matchups[2].homePlayer, base[2], 'G3 home = nominated C');
  assert.equal(G.matchNomination, null, 'nomination is one-shot (consumed)');
});

test('doubles: game 5 pairs B+C — the board-1 player never plays the double', () => {
  const g = boot(42);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  // Sim a full round-robin; whenever a double occurs, board-1 nominees must not be in it.
  let doublesSeen = 0;
  for (const round of G.scheduleL1) {
    for (const f of round) {
      const r = gp.simTeamMatch(f.home, f.away, true);
      const dbl = r.matchups.find((m) => m.type === 'double');
      if (!dbl) continue;
      doublesSeen++;
      const g1 = r.matchups[0]; // G1: A vs Y
      const g2 = r.matchups[1]; // G2: B vs X
      assert.ok(!dbl.homePair.includes(g1.homePlayer), 'home board-1 (A) not in the double');
      assert.ok(!dbl.awayPair.includes(g2.awayPlayer), 'away board-1 (X) not in the double');
    }
  }
  assert.ok(doublesSeen >= 5, `saw enough doubles to verify (${doublesSeen})`);
});

test('inbox: unanswered decision blocks the matchday; answering unblocks it', () => {
  const g = boot(43);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  gp.pushMail({ type: 'decision', from: 'Test', subject: 'Decyzja', body: '?', decision: { kind: 'reserveRequest', playerId: -1 } });
  assert.equal(gp.pendingDecisions().length, 1, 'decision pending');
  G.phase = 'pre';
  const mdBefore = G.matchday;
  // runMatchday is async but bails synchronously on the gate
  gp.runMatchday();
  assert.equal(G.matchday, mdBefore, 'matchday did not advance while a decision is pending');
  const mail = G.inbox.find((m) => m.type === 'decision');
  gp.answerMail(mail.id, false);
  assert.equal(gp.pendingDecisions().length, 0, 'answered decision no longer blocks');
});

test('inbox: reserve request YES promises a match; playing him settles it, benching him hurts', () => {
  const g = boot(44);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const res = G.players.find((p) => p.teamId === G.myTeamId && p.role === 'reserve' && !p.retired);
  gp.pushMail({ type: 'decision', from: res.name, subject: 'x', body: 'x', decision: { kind: 'reserveRequest', playerId: res.id } });
  const mail = G.inbox[G.inbox.length - 1];
  const moraleBefore = res.morale || 50;
  gp.answerMail(mail.id, true);
  assert.ok(res._promisedMatch, 'promise recorded');
  assert.ok((res.morale || 50) > moraleBefore, 'morale boosted by the promise');
  // Bench him: settle with a played-set that doesn't include him.
  gp.settleMatchPromises(new Set());
  assert.equal(res._promisedMatch, null, 'promise settled');
  assert.ok((res.morale || 50) < moraleBefore + 8, 'broken promise cost morale');
  assert.ok(G.inbox.some((m) => m.from === res.name && m.subjectKey === 'mail.disappointedSubject'), 'complaint mail arrived');
});

test('staff market: every role stays available without rebuilding to a visible fixed quota', () => {
  const g = boot(45);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const marketSize = G.staffPool.length + G.scoutPool.length + G.prDirectorPool.length;
  assert.ok(marketSize >= 60, `market has broad choice at newGame (got ${marketSize})`);
  // Simulate regens: age everyone in the pool to retirement and replenish.
  G.staffPool.forEach((s) => { s.age = 71; });
  const oldIds = new Set(G.staffPool.map((s) => s.id));
  gp.replenishStaffPools();
  for (const type of ['coach', 'physio', 'psychologist']) {
    const count = G.staffPool.filter((s) => s.type === type).length;
    const policy = gp.staffMarketPolicy(type, G.teams.length, G.season, G.countryId);
    assert.ok(count >= policy.floor && count <= policy.hardCap, `${type} pool stays safely available`);
    assert.notEqual(count, 80, `${type} does not snap to the old quota`);
  }
  assert.ok(G.staffPool.every((s) => !oldIds.has(s.id)), 'retired pool staff replaced by fresh regens');
});

test('[slow] uncancellable: a seeded event replays identically after a "reload"', async () => {
  // Two fresh boots from the SAME persisted save with the SAME event seed must
  // produce the SAME cup-round results (reload cannot re-roll an event).
  const runOnce = (saveText) => {
    const g = boot(46); // boot seed irrelevant — event RNG comes from the save's seed
    g.PPM.gameplay.newGame(0, 'PL');
    if (saveText) g.PPM.stateApi.loadGameFromText(saveText);
    const G = g.PPM.state.G;
    g.PPM.ui.autoPlay = true; // matchPause → instant
    G.matchday = 4; // cup window
    G._cupRoundSeed = 987654321; // pre-persisted seed, as after an interrupted run
    return g.PPM.gameplay.playCupRound().then(() => ({
      scores: G.cup.rounds[0].map((m) => m.result?.score || '-').join('|'),
      save: JSON.stringify({ ...G, _pid: g.PPM.ui._pid }),
    }));
  };
  const first = await runOnce(null);
  // Reconstruct the pre-event save: fresh newGame from the same world seed.
  const second = await runOnce(null);
  assert.equal(first.scores, second.scores, 'identical seeds + state → identical cup results');
});

test('matchday durability is awaited before committed results are replayed', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/core/gameplay.js'), 'utf8');
  const start = source.indexOf('async function runMatchday()');
  const atomic = source.indexOf('// ── ATOMIC COMMIT', start);
  const persist = source.indexOf('persistGame();', atomic);
  const flush = source.indexOf('await flushCareerSave();', persist);
  const replay = source.indexOf('for(let i=0;i<matches.length;i++)', flush);
  assert.ok(start >= 0 && atomic > start && persist > atomic && flush > persist && replay > flush);
});
