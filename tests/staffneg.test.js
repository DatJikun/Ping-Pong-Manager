// =============================================================================
// tests/staffneg.test.js — staff now negotiate wage + signing bonus + years
// (previously only contract length could be set).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function setup() {
  const g = boot(5);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.teams.find((t) => t.isPlayer).budget = 5_000_000;
  return { g, gp: g.PPM.gameplay, G };
}

test('staffNegResponse drives an acceptance indicator (like players)', () => {
  const { gp, G } = setup();
  const s = G.staffPool[0];
  const exp = gp.staffWageForOvr(gp.staffOvr(s));
  const fair = gp.staffNegResponse(s, Math.round(exp * 1.1), Math.round(exp * 0.2), 2);
  const lowball = gp.staffNegResponse(s, Math.round(exp * 0.6), 0, 1);
  const rescued = gp.staffNegResponse(s, Math.round(exp * 0.82), Math.round(exp * 0.6), 3);
  assert.ok(fair.mood >= 0 && fair.score >= 0, 'fair offer accepted');
  assert.ok(lowball.mood < 0 && lowball.score < 0, 'lowball rejected');
  assert.ok(rescued.score >= 0, 'a strong bonus rescues a low staff salary too');
});

test('a lowball wage offer is rejected', () => {
  const { g, gp, G } = setup();
  const cand = G.staffPool[0];
  const exp = gp.staffWageForOvr(gp.staffOvr(cand));
  g.window._staffNegSal = Math.round(exp * 0.5);
  g.window._staffNegBonus = 0;
  g.window._staffNegYrs = 2;
  gp.doHireStaff(cand.id);
  assert.ok(!G.staff.some((s) => s.id === cand.id), 'lowballed staff not hired');
});

test('a fair offer hires the staff at the negotiated wage and charges the bonus', () => {
  const { g, gp, G } = setup();
  const mt = G.teams.find((t) => t.isPlayer);
  const cand = G.staffPool[0];
  const exp = gp.staffWageForOvr(gp.staffOvr(cand));
  const wage = Math.round(exp * 1.2);
  const bonus = 10000;
  g.window._staffNegSal = wage;
  g.window._staffNegBonus = bonus;
  g.window._staffNegYrs = 3;
  const before = mt.budget;
  gp.doHireStaff(cand.id);
  const hired = G.staff.find((s) => s.id === cand.id);
  assert.ok(hired, 'staff hired on a fair offer');
  assert.equal(hired.salary, wage, 'negotiated wage applied');
  assert.equal(hired.contractYears, 3, 'negotiated years applied');
  assert.ok(before - mt.budget >= bonus, 'signing bonus charged to budget');
});
