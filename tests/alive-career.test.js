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

test('starter guarantee breach is rare and only for a benched first-team contract', () => {
  const g = freshGame(64);
  const gp = g.PPM.gameplay;
  assert.equal(gp.starterGuaranteeBreachChance(reserve({ promisedRole: 'prospect' })), 0);
  assert.equal(gp.starterGuaranteeBreachChance(reserve({ promisedRole: 'rotation' })), 0);
  const ch = gp.starterGuaranteeBreachChance(reserve({ promisedRole: 'starter', preferredRole: 'starter' }));
  assert.ok(ch > 0 && ch < 0.35, `breach chance is real but not spam (${ch})`);
});

test('injury care is a once-per-injury decision that can shorten the layoff', () => {
  const g = freshGame(65);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.matchday = 2;
  G.inbox = [];
  G.players.filter((x) => x.teamId === myId && x.role === 'reserve').forEach((p) => {
    p.promisedRole = 'prospect';
    p.preferredRole = 'prospect';
    p.seasonForm = 0;
  });
  const p = G.players.find((x) => x.teamId === myId && x.role === 'starter' && !x.retired);
  p.injuredFor = 3;
  p._injMd = 1;
  gp.myTeam().budget = 80000;
  gp.generateInboxForMatchday();
  const mail = G.inbox.find((m) => m.decision?.kind === 'injuryCare' && m.decision.playerId === p.id);
  assert.ok(mail, 'injury care arrived');
  assert.ok(mail.effectsYes && mail.effectsNo, 'consequences are visible before the click');
  gp.answerMail(mail.id, true);
  assert.equal(p.injuredFor, 2, 'specialist shortens the remaining layoff');
});

test('family leave / rest removes the player from the next nomination pool', () => {
  const g = freshGame(66);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  const p = G.players.find((x) => x.teamId === myId && x.role === 'starter' && !x.retired && !x.injuredFor);
  p._skipNextMatch = true;
  const eligible = gp.getEligibleMatchPlayers(myId).map((x) => x.id);
  assert.ok(!eligible.includes(p.id), 'absent player is not match-eligible');
});

test('life events never push the matchday inbox past 3 new items', () => {
  const g = freshGame(67);
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.matchday = 5;
  G.inbox = [];
  G.players.filter((x) => x.teamId === myId && !x.retired).forEach((p) => {
    p.role = p.role === 'youth' ? 'youth' : 'starter';
    p.promisedRole = 'prospect';
    p.injuredFor = 3;
    p._injMd = 1;
    p.fatigue = 10;
  });
  gp.generateInboxForMatchday();
  assert.ok(G.inbox.length <= 3, `0–3 mails (${G.inbox.length})`);
});
