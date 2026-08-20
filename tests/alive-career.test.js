// =============================================================================
// tests/alive-career.test.js — inbox by contract role, quiet rounds, club projects.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function freshGame(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  return g;
}

function reserve(overrides) {
  return {
    role: 'reserve',
    injuredFor: 0,
    _promisedMatch: null,
    seasonForm: 0,
    morale: 50,
    fatigue: 0,
    promisedRole: 'prospect',
    preferredRole: 'prospect',
    ...overrides,
  };
}

test('reserveAskChance follows contract role, not a blanket form roll', () => {
  const g = freshGame(61);
  const gp = g.PPM.gameplay;
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'starter', seasonForm: 12 })), 0);
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'prospect', seasonForm: 4 })), 0);
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'prospect', seasonForm: 8 })), 0.07);
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'rotation', seasonForm: 5 })), 0.16);
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'rotation', seasonForm: 3 })), 0.06);
  assert.equal(gp.reserveAskChance(reserve({ promisedRole: 'rotation', seasonForm: 2 })), 0);
});

test('inbox can stay quiet: prospects without a hot season do not write', () => {
  const g = freshGame(62);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.matchday = 1;
  G.players.filter((p) => p.teamId === myId && p.role === 'reserve').forEach((p) => {
    p.promisedRole = 'prospect';
    p.preferredRole = 'prospect';
    p.seasonForm = 2;
    p.morale = 50;
    p.fatigue = 0;
    p.injuredFor = 0;
    p._promisedMatch = null;
  });
  G.players.filter((p) => p.teamId === myId && p.role === 'starter').forEach((p) => { p.fatigue = 10; });
  const before = (G.inbox || []).length;
  gp.generateInboxForMatchday();
  assert.equal((G.inbox || []).length, before, 'no filler mail when nothing matured');
});

test('upgradeInfra at max level buys a club project instead of a higher peak', () => {
  const g = freshGame(63);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  G.infraHall = 5;
  G.infraProjects = { hall: 0, med: 0, academy: 0, merch: 0 };
  gp.myTeam().budget = 500000;
  const cost = gp.infraProjectCost('hall');
  const budgetBefore = gp.myTeam().budget;
  gp.upgradeInfra('hall');
  assert.equal(G.infraHall, 5, 'level stays at the soft cap');
  assert.equal(G.infraProjects.hall, 1, 'a hall project was bought');
  assert.equal(gp.myTeam().budget, budgetBefore - cost);
  assert.ok(gp.hallCapacity() > g.PPM.constants.INFRA_HALL[5].capacity, 'project adds seats, not OVR');
});
