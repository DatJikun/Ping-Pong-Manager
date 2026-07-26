// =============================================================================
// tests/academy.test.js — the academy system (vertical slice).
//
// Locks the owner-agreed design: intake quality scales with the academy LEVEL
// (not throughput), juniors carry a banded ceiling + small training-baked wage,
// ~10% bust, the 3-group age curve (physical fades first, mental/technical hold),
// per-level upkeep with a free downgrade escape valve, and youth sales.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function freshGame(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  return g;
}
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

test('intake quality scales with the academy LEVEL (band, not a single optimum)', () => {
  const g = freshGame(11);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  function batchCeil(lv) {
    G.infraAcademy = lv;
    const c = [];
    for (let i = 0; i < 60; i++) c.push(gp.genYouthPlayer(myId, 'PL').ceiling);
    return avg(c);
  }
  const lo = batchCeil(1), mid = batchCeil(3), hi = batchCeil(5);
  assert.ok(hi > mid && mid > lo, `ceiling rises with level (L1 ${lo.toFixed(0)} < L3 ${mid.toFixed(0)} < L5 ${hi.toFixed(0)})`);
  assert.ok(hi - lo >= 8, 'the level gap is meaningful');
});

test('a junior carries a banded ceiling and a small training-baked wage', () => {
  const g = freshGame(12);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.infraAcademy = 3;
  for (let i = 0; i < 80; i++) {
    const p = gp.genYouthPlayer(myId, 'PL');
    assert.ok(p.ceiling > gp.ovrBase(p), 'ceiling is above current OVR');
    assert.ok(p.salary >= 500 && p.salary <= 1500, `junior wage in band (${p.salary})`);
    assert.equal(p.role, 'youth');
    assert.ok(p.isYouth);
  }
});

test('AI juniors are graded by THEIR academy level, not the player\'s (old bug)', () => {
  const g = freshGame(13);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  G.infraAcademy = 1; // player has a weak academy
  const ai = G.teams.find((t) => !t.isPlayer);
  ai.infraAcademy = 5; // but this AI club has the best academy
  const c = [];
  for (let i = 0; i < 50; i++) c.push(gp.genYouthPlayer(ai.id, 'PL').ceiling);
  assert.ok(avg(c) >= 70, `AI L5 juniors reflect the AI club's level (avg ceiling ${avg(c).toFixed(0)}), not the player's L1`);
});

test('~10% of juniors are flagged to bust (plateau short of peak)', () => {
  const g = freshGame(14);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.infraAcademy = 3;
  let bust = 0; const N = 400;
  for (let i = 0; i < N; i++) if (gp.genYouthPlayer(myId, 'PL').willPlateau) bust++;
  const pct = bust / N;
  assert.ok(pct > 0.04 && pct < 0.17, `bust rate ~10% (got ${(pct * 100).toFixed(1)}%)`);
});

test('age curve: physical (foot) fades before mental (men)/technical (srv)', () => {
  const g = freshGame(15);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  // A 28-year-old at his peak, all stats equal; remove the coach so the curve is clean.
  G.staff = G.staff.filter((s) => !(s.teamId === myId && s.type === 'coach'));
  const p = { id: 91000, teamId: myId, name: 'Vet', age: 28, role: 'starter', isYouth: false, fh: 75, bh: 75, srv: 75, ret: 75, foot: 75, men: 75, peakAge: 28, traits: [], retired: false, careerSeasons: 0, contractYears: 40, loyalty: 0, seasonForm: 0, stamina: 60, willPlateau: false, ceiling: 75 };
  G.players.push(p);
  for (let i = 0; i < 9; i++) { gp.applyGrowth(); p.role = 'starter'; } // age 28 -> 37
  assert.ok(p.foot < p.men, `physical decays faster than mental (foot ${p.foot} < men ${p.men})`);
  assert.ok(p.foot < p.srv, `physical decays faster than technical (foot ${p.foot} < srv ${p.srv})`);
});

test('academy upkeep scales with level and a free downgrade cuts it (no refund)', () => {
  const g = freshGame(16);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  G.infraAcademy = 5;
  const up5 = gp.academyUpkeep();
  assert.ok(up5 >= 25000, `top academy has a heavy upkeep (${up5})`);
  const budgetBefore = gp.myTeam().budget;
  gp.downgradeInfra('academy');
  assert.equal(G.infraAcademy, 4, 'downgraded one level');
  assert.ok(gp.academyUpkeep() < up5, 'upkeep dropped');
  assert.equal(gp.myTeam().budget, budgetBefore, 'downgrade is free (no refund, no charge)');
});

test('selling a player brings in a transfer fee and moves him to an AI club', () => {
  const g = freshGame(17);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  const p = G.players.find((x) => x.teamId === myId && !x.retired);
  const budgetBefore = gp.myTeam().budget;
  const fee = gp.youthSaleValue(p);
  assert.ok(fee > 0, 'sale value is positive');
  gp.sellPlayer(p.id); // harness confirm() => true
  const after = G.players.find((x) => x.id === p.id);
  assert.notEqual(after.teamId, myId, 'player left our club');
  assert.ok(gp.myTeam().budget > budgetBefore, `budget rose by the fee (${budgetBefore} -> ${gp.myTeam().budget})`);
});

test('even a weak academy can occasionally unearth a gem far above its band', () => {
  const g = freshGame(21);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.infraAcademy = 1; // weakest academy: band ceiling 56-66
  const ceils = [];
  for (let i = 0; i < 400; i++) ceils.push(gp.genYouthPlayer(myId, 'PL').ceiling);
  const gems = ceils.filter((c) => c >= 78); // well above the L1 band
  assert.ok(gems.length >= 1, `at least one rare gem appears (${gems.length}/400 >= 78)`);
  assert.ok(gems.length < 80, 'but gems are rare, not the norm');
});

test('sponsor offers include some no-requirement (guaranteed) deals', () => {
  const g = freshGame(22);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  // Aggregate a few rolls so the ~1/3 chance is reliably represented.
  let none = 0, total = 0;
  for (let i = 0; i < 6; i++) { gp.genSponsorOffers(30); const offers = G.sponsorOffers || []; total += offers.length; none += offers.filter((o) => o.goal === 'none').length; }
  assert.ok(none > 0, `some sponsors ask for nothing (${none}/${total})`);
  assert.ok(none < total, 'but not all of them');
});

test('mini-tournament costs €10k, yields 3, and you keep exactly one', () => {
  const g = freshGame(18);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.infraAcademy = 3;
  gp.myTeam().budget = 50000;
  const before = gp.myTeam().budget;
  gp.runAcademyMiniTournament(); // confirm() => true
  assert.equal((G.academyTrial || []).length, 3, '3 trial candidates');
  assert.equal(before - gp.myTeam().budget, 10000, 'charged €10k');
  const rosterBefore = G.players.filter((x) => x.teamId === myId).length;
  gp.signTrialProspect(0);
  assert.equal((G.academyTrial || []).length, 0, 'the other candidates leave');
  assert.equal(G.players.filter((x) => x.teamId === myId).length, rosterBefore + 1, 'exactly one joined');
});
