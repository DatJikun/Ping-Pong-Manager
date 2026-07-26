// =============================================================================
// tests/robustness.test.js — the engine must never crash on degenerate state.
//
// A long career (100 seasons) surfaced a crash: simTeamMatch threw when a club
// had zero available players. The engine now treats that as a forfeit. (See the
// manual long-run probe in tests/stress.js — not part of `npm test` because it
// takes minutes.)
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('simTeamMatch forfeits instead of crashing when a club cannot field anyone', () => {
  const g = boot(1);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;

  const homeId = G.teams.find((t) => t.league === 1 && !t.isPlayer).id;
  const awayId = G.teams.find((t) => t.league === 1 && t.id !== homeId).id;

  // Empty the away club entirely.
  G.players.filter((p) => p.teamId === awayId).forEach((p) => { p.teamId = null; });

  const r = gp.simTeamMatch(homeId, awayId, false);
  assert.equal(r.forfeit, true, 'flagged as a forfeit');
  assert.equal(r.homeWin, true, 'the club that can field wins');
  assert.ok(Number.isFinite(r.homePoints) && Number.isFinite(r.awayPoints));
  // applyResult must also survive a forfeit result
  assert.doesNotThrow(() => gp.applyResult(r));
});

test('both clubs empty → draw, still no crash', () => {
  const g = boot(2);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const a = G.teams[0].id, b = G.teams[1].id;
  G.players.filter((p) => p.teamId === a || p.teamId === b).forEach((p) => { p.teamId = null; });
  const r = gp.simTeamMatch(a, b, false);
  assert.equal(r.isDraw, true);
  assert.doesNotThrow(() => gp.applyResult(r));
});
