const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('infrastructure has a meaningful late-game runway without repricing legacy levels', () => {
  const g = boot(540);
  const c = g.PPM.constants;
  const tables = [c.INFRA_HALL, c.INFRA_MED, c.INFRA_ACADEMY, c.INFRA_MERCH];
  tables.forEach((levels) => assert.equal(levels.length, 8, 'levels 0..7 are available'));
  assert.equal(c.INFRA_HALL[5].cost, 145000);
  assert.equal(c.INFRA_MED[5].cost, 118000);
  assert.equal(c.INFRA_ACADEMY[5].cost, 138000);
  assert.equal(c.INFRA_MERCH[5].cost, 150000);

  const fullPathCost = tables.reduce((sum, levels) => sum + levels.reduce((s, level) => s + level.cost, 0), 0);
  assert.ok(fullPathCost >= 4000000 && fullPathCost <= 4500000, `full portfolio is a long project (${fullPathCost})`);
  tables.forEach((levels) => {
    for (let i = 2; i < levels.length; i++) {
      assert.ok(levels[i].cost > levels[i - 1].cost, `capital costs rise at level ${i}`);
    }
  });
});

test('late infrastructure benefits improve but do not jump as fast as their price', () => {
  const g = boot(541);
  const { INFRA_HALL: hall, INFRA_MED: med, INFRA_ACADEMY: academy, INFRA_MERCH: merch } = g.PPM.constants;
  assert.ok(hall[7].trainingBonus > hall[5].trainingBonus && hall[7].trainingBonus <= 1);
  assert.ok(med[7].injBonus > med[5].injBonus && med[7].injBonus <= 0.85);
  assert.ok(academy[7].ceilHi > academy[5].ceilHi && academy[7].ceilHi <= 96);
  assert.ok(merch[7].income > merch[5].income && merch[7].income <= 0.27);
  assert.ok(hall[7].cost / hall[5].cost > hall[7].trainingBonus / hall[5].trainingBonus);
  assert.ok(med[7].cost / med[5].cost > med[7].injBonus / med[5].injBonus);
});

test('one facility upkeep contract charges player and AI clubs by the same tables', () => {
  const g = boot(542);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.infraHall = 5;
  G.infraMed = 5;
  G.infraAcademy = 5;
  G.infraMerchandising = 5;
  Object.assign(G.teams.find((t) => t.id === G.myTeamId), {
    infraHall: 5, infraMed: 5, infraAcademy: 5, infraMerchandising: 5,
  });
  const mine = { ...gp.facilityUpkeep(G.myTeamId) };
  assert.deepEqual(mine, { hall: 12000, med: 9000, academy: 30000, merch: 7000, total: 58000 });

  const ai = G.teams.find((t) => t.id !== G.myTeamId);
  Object.assign(ai, { infraHall: 5, infraMed: 5, infraAcademy: 5, infraMerchandising: 5 });
  assert.deepEqual({ ...gp.facilityUpkeep(ai.id) }, mine);
});

test('elite AI projects are strategy-led exceptions rather than a universal academy rush', () => {
  const g = boot(543);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const ordinary = G.teams.find((t) => t.id !== G.myTeamId && t.league === 1);
  ordinary.principal.strategy = 'winnow';
  const youth = { ...ordinary, principal: { ...ordinary.principal, strategy: 'youth' } };
  const ordinaryAcademy6 = gp.aiInfrastructureInvestmentChance(ordinary, 'infraAcademy', 6);
  const youthAcademy6 = gp.aiInfrastructureInvestmentChance(youth, 'infraAcademy', 6);
  assert.ok(ordinaryAcademy6 > 0 && ordinaryAcademy6 < 0.04);
  assert.ok(youthAcademy6 > ordinaryAcademy6 * 2, 'youth strategy has a meaningful academy identity');
  assert.ok(gp.aiInfrastructureInvestmentChance(ordinary, 'infraAcademy', 7) < ordinaryAcademy6);

  const lower = { ...youth, league: 2 };
  assert.equal(gp.aiInfrastructureInvestmentChance(lower, 'infraAcademy', 7), 0, 'world-class projects require top-flight resources');
});
