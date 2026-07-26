// =============================================================================
// tests/wages.test.js — EUR wage curves + no renewal "shock".
//
// The owner's pain point: starting wages were far below what renewals demanded
// (2-3x jump). Initial generation and renewal expectations now share one wage
// curve, so for a freshly generated squad the renewal demand should be close to
// the current wage (only legit situational mods + a premium for stars above their
// league differ).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('wage curve is convex and ordered (top OVR costs disproportionately more)', () => {
  const g = boot(1);
  const gp = g.PPM.gameplay;
  g.PPM.gameplay.newGame(0, 'PL');
  const w = (o) => gp.playerWageForOvr(o);
  assert.ok(w(60) < w(70) && w(70) < w(80) && w(80) < w(90), 'monotonic');
  // convex: each +10 OVR roughly doubles+ the wage
  assert.ok(w(80) / w(70) > 2.5, '70→80 jump is steep');
  assert.ok(w(90) / w(80) > 2.5, '80→90 jump is steep');
  // staff ceiling far below players
  assert.ok(gp.staffWageForOvr(90) < gp.playerWageForOvr(90) / 3, 'staff much cheaper than star players');
});

test('a fresh squad has no blanket renewal shock', () => {
  const g = boot(7);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const squad = G.players.filter((p) => p.teamId !== null && !p.retired && p.role === 'starter');
  const ratios = squad.map((p) => gp.contractExpect(p, p.teamId).salary / Math.max(1, p.salary));
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  // Most renewals should be near parity; the old bug averaged ~2.5-3x.
  assert.ok(avg < 1.7, `avg renewal ratio should be modest, got ${avg.toFixed(2)}`);
  const median = ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
  assert.ok(median < 1.5, `median renewal ratio should be near parity, got ${median.toFixed(2)}`);
});

test('a generous signing bonus can rescue a slightly-low salary offer', () => {
  const g = boot(7);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const p = G.players.find((x) => x.teamId !== null && !x.retired && x.role === 'starter');
  const exp = gp.contractExpect(p, p.teamId);
  const lowSal = Math.round(exp.salary * 0.82);
  const noBonus = gp.negResponse(p, lowSal, exp.years, 0, exp.role, p.teamId);
  const bigBonus = gp.negResponse(p, lowSal, exp.years, Math.round(exp.signingBonus * 2.5), exp.role, p.teamId);
  assert.ok(noBonus.score < 0, 'low salary alone is rejected');
  assert.ok(bigBonus.score > noBonus.score + 5, 'a big bonus materially improves the deal');
  assert.ok(bigBonus.score >= 0, 'low salary + big bonus can close the deal');
});

test('clubs can afford their squad at the new EUR scale', () => {
  const g = boot(3);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  for (const t of G.teams.filter((x) => x.league === 1)) {
    const wages = G.players.filter((p) => p.teamId === t.id && !p.retired).reduce((s, p) => s + p.salary, 0);
    assert.ok(wages < t.budget * 1.1, `${t.name} wages (${wages}) not wildly above budget (${t.budget})`);
    assert.ok(t.budget > 100000, `L1 club budget on EUR scale (${t.budget})`);
  }
});
