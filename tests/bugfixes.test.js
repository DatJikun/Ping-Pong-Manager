// =============================================================================
// tests/bugfixes.test.js — regression tests for the 2026-07-02 bug-fix batch.
//
// Covers: the _pid save/resume ID-counter corruption, double-aging of AI
// players in applyGrowth, buildBudgetEntry dropping cup/Top12 prize money,
// loaned-out players leaking into the transfer market, boardOrder being
// ignored by simTeamMatch, infra mirroring to the team object, and the
// ui.running soft-lock on the manager-fired path.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('persistGame + resume keeps the ID counter ahead of every existing entity', () => {
  const g = boot(11);
  g.PPM.gameplay.newGame(0, 'PL');
  const ui = g.PPM.ui;
  const pidAtSave = ui._pid;
  g.PPM.stateApi.persistGame();
  // Simulate closing the tab and resuming: the counter must not rewind.
  ui._pid = 0;
  g.PPM.stateApi.loadPersistedGame();
  assert.ok(ui._pid >= pidAtSave, `counter restored (${ui._pid}) >= value at save (${pidAtSave})`);
  const maxId = Math.max(...g.PPM.state.G.players.map((p) => p.id));
  assert.ok(ui._pid > maxId, 'counter is above every existing player id');
  // A newly generated player must not collide with an existing one.
  const np = g.PPM.gameplay.genPlayer(null, 25, 'PL');
  assert.ok(!g.PPM.state.G.players.find((p) => p.id === np.id), 'new player id is unique');
});

test('loading an old save without a trustworthy _pid floors the counter at max(id)+1', () => {
  const g = boot(12);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const save = JSON.parse(JSON.stringify(G));
  save._pid = 3; // stale counter, like pre-fix saves
  g.PPM.stateApi.loadGameFromText(JSON.stringify(save));
  const maxId = Math.max(...g.PPM.state.G.players.map((p) => p.id));
  assert.ok(g.PPM.ui._pid > maxId, `floored (${g.PPM.ui._pid}) above max existing id (${maxId})`);
});

test('applyGrowth ages every player exactly once per season (AI players were aged twice)', () => {
  const g = boot(13);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const aiPlayer = G.players.find((p) => p.teamId !== null && p.teamId !== G.myTeamId && !p.retired);
  const myPlayer = G.players.find((p) => p.teamId === G.myTeamId && !p.retired);
  const aiAge = aiPlayer.age, myAge = myPlayer.age;
  const aiHist = G.playerHistory[aiPlayer.id].length;
  g.PPM.gameplay.applyGrowth();
  assert.equal(aiPlayer.age, aiAge + 1, 'AI player aged exactly +1');
  assert.equal(myPlayer.age, myAge + 1, 'my player aged exactly +1');
  if (!aiPlayer.retired) {
    assert.equal(G.playerHistory[aiPlayer.id].length, aiHist + 1,
      'AI player got exactly ONE new history snapshot (double-aging pushed two)');
  }
});

test('buildBudgetEntry keeps cup/Top12 premia accumulated in seasonFinance.prize', () => {
  const g = boot(14);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.seasonFinance.prize = 97500; // league 62 500 + cup 35 000 already accumulated
  const entry = g.PPM.gameplay.buildBudgetEntry(100000, 62500, 20000, 30000);
  assert.equal(entry.prize, 97500, 'entry.prize is the accumulated total, not the league-only param');
});

test('a player loaned out never appears in his own club\'s transfer market', () => {
  const g = boot(15);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const p = g.PPM.gameplay.getClubSeniorPlayers(G.myTeamId)[0];
  const otherTeam = G.teams.find((t) => t.id !== G.myTeamId);
  // Minimal loan state, as doLoanOut sets it: borrower's teamId + loanedOut flag.
  p.teamId = otherTeam.id;
  p.loanedOut = true;
  p.contractYears = 1; // pre-fix this deterministically produced a presign listing
  for (let i = 0; i < 10; i++) { // transfer listing is probabilistic → try repeatedly
    g.PPM.gameplay.buildMarket();
    assert.ok(!G.transferMarket.find((m) => m.playerId === p.id),
      'loaned-out player is not listed as fa/transfer/presign');
  }
});

test('simTeamMatch pairs boards in the persisted match selection order', () => {
  const g = boot(16);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  const seniors = g.PPM.gameplay.getEligibleMatchPlayers(myId);
  assert.ok(seniors.length >= 5, 'have a full match squad to reorder');
  const byOvrAsc = [...seniors].sort((a, b) => g.PPM.gameplay.ovr(a) - g.PPM.gameplay.ovr(b)).slice(0, 5);
  G.lastMatchSelection = { base: byOvrAsc.slice(0, 3).map((p) => p.id), reserves: byOvrAsc.slice(3).map((p) => p.id) };
  const opponent = G.teams.find((t) => t.id !== myId && t.league === g.PPM.gameplay.myLeague());
  const r = g.PPM.gameplay.simTeamMatch(myId, opponent.id, true);
  assert.equal(r.matchups[0].homePlayer, byOvrAsc[0].id, 'table 1 duel uses saved slot A');
  assert.equal(r.matchups[1].homePlayer, byOvrAsc[1].id, 'table 2 duel uses saved slot B');
});

test('upgradeInfra mirrors the new level onto the player team object', () => {
  const g = boot(17);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const mt = G.teams.find((t) => t.id === G.myTeamId);
  mt.budget = 10_000_000;
  const before = G.infraHall || 0;
  g.PPM.gameplay.upgradeInfra('hall');
  assert.equal(G.infraHall, before + 1, 'state field upgraded');
  assert.equal(mt.infraHall, G.infraHall, 'team object mirrors the state field');
});

test('handleManagerFired clears ui.running so the start screen can render', () => {
  const g = boot(18);
  g.PPM.gameplay.newGame(0, 'PL');
  g.PPM.ui.running = true;
  g.PPM.gameplay.handleManagerFired('test');
  assert.equal(g.PPM.ui.running, false, 'running flag cleared — no soft-lock');
});
