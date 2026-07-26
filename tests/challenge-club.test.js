// =============================================================================
// tests/challenge-club.test.js — the "Akademia Orłów" youth-only challenge club
// (first Layer-2 club trait): starts near-broke and may only build through its
// own academy (no external signings).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('the challenge club exists: near-broke, youth-only, the weakest in the league', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const ch = G.teams.find((t) => t.name === 'Akademia Orłów');
  assert.ok(ch, 'challenge club exists');
  assert.equal(ch.league, 2);
  assert.ok(ch.budget <= 10000, `near-broke budget (${ch.budget})`);
  assert.ok(ch.traits.includes('youthOnly'), 'has the youthOnly trait');
  assert.ok(ch.infraAcademy >= 1, 'has an academy to develop juniors');
  const l2 = G.teams.filter((t) => t.league === 2);
  const l2avg = l2.reduce((s, t) => s + gp.teamOvr(t.id), 0) / l2.length;
  const chOvr = gp.teamOvr(ch.id);
  const weakest = Math.min(...l2.map((t) => gp.teamOvr(t.id)));
  assert.equal(chOvr, weakest, `is the weakest L2 club (${chOvr})`);
  assert.ok(chOvr < l2avg - 2, `and clearly below the L2 average (${chOvr} vs ${l2avg.toFixed(0)})`);
});

test('a youth-only club cannot sign external players', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const chId = g.PPM.state.G.teams.find((t) => t.name === 'Akademia Orłów').id;
  g.PPM.gameplay.newGame(chId, 'PL'); // take charge of the challenge club
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  assert.ok(G.teams.find((t) => t.id === myId).traits.includes('youthOnly'));
  const ext = G.players.find((p) => p.teamId !== null && p.teamId !== myId && !p.retired);
  G.teams.find((t) => t.id === myId).budget = 999999;
  g.window._negSal = 8000; g.window._negYrs = 2; g.window._negBonus = 0;
  const before = ext.teamId;
  g.PPM.gameplay.doNegotiate(ext.id);
  assert.equal(g.PPM.state.G.players.find((p) => p.id === ext.id).teamId, before, 'external signing blocked');
});
