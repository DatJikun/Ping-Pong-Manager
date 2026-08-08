const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('equipment partner profiles are trade-offs rather than a sporting ladder', () => {
  const g = boot(2501);
  const { EQUIPMENT, TECH_PARTNERSHIPS } = g.PPM.constants;

  assert.deepEqual(new Set(TECH_PARTNERSHIPS.map((partner) => partner.profileId)),
    new Set(['offensive', 'control', 'speed', 'development', 'commercial']));
  assert.equal(new Set(TECH_PARTNERSHIPS.map((partner) => partner.id)).size, 6);
  assert.ok(TECH_PARTNERSHIPS.every((partner) => partner.rubberId));
  assert.deepEqual(Object.keys(EQUIPMENT.rubberProfiles).sort(), [
    'balanced', 'commercial', 'control', 'development', 'legacy_pro',
    'legacy_stock', 'legacy_tournament', 'offensive', 'speed',
  ]);
  assert.deepEqual(EQUIPMENT.rubberProfiles.legacy_tournament.mods, { fh: 1, srv: 1 });
  assert.deepEqual(EQUIPMENT.rubberProfiles.legacy_pro.mods, { fh: 2, srv: 1, ret: 1 });
});

test('new careers begin without an equipment contract', () => {
  const g = boot(2502);
  g.PPM.gameplay.newGame(0, 'PL');

  assert.equal(g.PPM.state.G.techContract, null);
  assert.equal(Object.hasOwn(g.PPM.state.G, 'rubberTier'), false);
  assert.equal(g.PPM.constants.EQUIPMENT.rubberTiers, undefined);
  assert.equal(g.PPM.gameplay.clubRubberTier, undefined);
});

test('contract terms adjust annual cashflow and snapshot the selected partner', () => {
  const g = boot(2503);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');

  assert.equal(gp.techContractAnnualCashflow({ annualCashflow: -1000 }, 2), -960);
  assert.equal(gp.techContractAnnualCashflow({ annualCashflow: -1000 }, 3), -920);
  assert.equal(gp.techContractAnnualCashflow({ annualCashflow: 1000 }, 2), 1030);
  assert.equal(gp.techContractAnnualCashflow({ annualCashflow: 1000 }, 3), 1060);

  gp.selectTechPartnership('tp_local', 2);
  assert.deepEqual(g.PPM.state.G.techContract, {
    partnerId: 'tp_local', rubberId: 'development', termYears: 2, yearsLeft: 2,
    signedSeason: 1, annualCashflow: -960,
  });
  assert.equal(g.PPM.state.G.techPartnership, 'tp_local');
  assert.equal(gp.getTechContract().partnerId, 'tp_local');

  const clamp = boot(2511);
  clamp.PPM.gameplay.newGame(0, 'PL');
  clamp.PPM.gameplay.selectTechPartnership('tp_local', 99);
  assert.equal(clamp.PPM.state.G.techContract.termYears, 3, 'terms clamp at three seasons');
});

test('technical partnerships can only be signed once during preseason', () => {
  const g = boot(2504);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;

  G.phase = 'season';
  gp.selectTechPartnership('tp_local', 1);
  assert.equal(G.techContract, null, 'in-season signing is rejected');

  G.phase = 'preseason';
  gp.selectTechPartnership('tp_local', 3);
  const signed = JSON.stringify(G.techContract);
  gp.selectTechPartnership('tp_regional', 1);
  assert.equal(JSON.stringify(G.techContract), signed, 'a live contract cannot be replaced');
  assert.equal(G.techPartnership, 'tp_local');
});

test('early termination requires confirmation and sufficient budget, then records the fee', () => {
  const g = boot(2505);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  gp.selectTechPartnership('tp_local', 2);
  const fee = gp.techContractBreakFee(G.techContract);
  assert.equal(fee, 3000);

  const club = G.teams.find((team) => team.id === G.myTeamId);
  club.budget = fee - 1;
  gp.terminateTechPartnership();
  assert.ok(G.techContract, 'a club below the fee keeps its contract');

  club.budget = fee;
  g.confirm = () => false;
  gp.terminateTechPartnership();
  assert.ok(G.techContract, 'cancelling confirmation keeps its contract');

  g.confirm = () => true;
  gp.terminateTechPartnership();
  assert.equal(G.techContract, null);
  assert.equal(G.techPartnership, null);
  assert.equal(club.budget, 0);
  assert.equal(G.seasonFinance.brandCosts, fee);
});

test('season settlement pays the snapshot once, carries remaining terms, then expires', async () => {
  const g = boot(2506);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  gp.selectTechPartnership('tp_local', 2);
  G.budgetLog.push({ season: G.season, techPartnership: 0, net: 0 });

  await gp.endSeason();
  assert.equal(G.techContract.yearsLeft, 1);
  assert.equal(G.techPartnership, 'tp_local');
  assert.equal(G.budgetLog.at(-1).techPartnership, -960);

  G.budgetLog.push({ season: G.season, techPartnership: 0, net: 0 });
  await gp.endSeason();
  assert.equal(G.techContract, null);
  assert.equal(G.techPartnership, null);
  assert.equal(G.budgetLog.at(-1).techPartnership, -960);
});

test('a carried equipment contract fulfils the preseason start requirement', () => {
  const g = boot(2509);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  (G.sponsorOffers || []).slice(0, 3).forEach((offer) => gp.signSponsorPreseason(offer.id, 1));
  gp.selectTechPartnership('tp_local', 2);
  gp.selectBoardObjective('safe');
  gp.startSeason();

  assert.equal(G.phase, 'pre');
});

test('development partnership applies its bonus once to player-club yearly growth', () => {
  const plain = boot(2510);
  const partnered = boot(2510);
  plain.PPM.gameplay.newGame(0, 'PL');
  partnered.PPM.gameplay.newGame(0, 'PL');
  const pG = plain.PPM.state.G;
  const cG = partnered.PPM.state.G;
  const keepId = pG.players.find((player) => player.teamId === pG.myTeamId && player.age <= 22).id;
  [pG, cG].forEach((G) => {
    G.players.forEach((player) => { if (player.id !== keepId) player.retired = true; });
    const player = G.players.find((entry) => entry.id === keepId);
    player.age = 18; player.peakAge = 32; player.ceiling = 90; player.willPlateau = false;
  });
  partnered.PPM.gameplay.selectTechPartnership('tp_local', 1);

  for (let season = 0; season < 4; season++) {
    plain.PPM.gameplay.applyGrowth();
    partnered.PPM.gameplay.applyGrowth();
  }
  const total = (player) => ['fh', 'bh', 'srv', 'ret', 'foot', 'men']
    .reduce((sum, stat) => sum + player[stat], 0);
  assert.ok(total(cG.players.find((player) => player.id === keepId))
    > total(pG.players.find((player) => player.id === keepId)), 'local development package adds growth once');
});
