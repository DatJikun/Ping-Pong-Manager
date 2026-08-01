const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('auto-season configuration is normalized, deduplicated and persisted in the career', () => {
  const g = boot(520);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const cfg = { ...gp.setAutoSeasonConfig({
    lineupMode: 'fixed',
    basePlayerIds: [3, 3, 2, 'bad'],
    reservePlayerIds: [2, 4, 4],
    matchLimit: 999,
    paceMs: 10,
    stopOn: { injury: false, playerRequest: false, selectedUnavailable: false },
  }) };
  assert.equal(cfg.lineupMode, 'fixed');
  assert.deepEqual(Array.from(cfg.basePlayerIds), [3, 2]);
  assert.deepEqual(Array.from(cfg.reservePlayerIds), [4]);
  assert.equal(cfg.matchLimit, 22);
  assert.equal(cfg.paceMs, 250);
  assert.equal(cfg.stopOn.injury, false);
  assert.equal(cfg.stopOn.playerRequest, false);
  assert.equal(cfg.stopOn.selectedUnavailable, false);
  assert.equal(cfg.stopOn.otherDecision, true, 'unspecified safety default remains on');
  assert.deepEqual(
    JSON.parse(JSON.stringify(g.PPM.state.G.autoSeasonConfig)),
    JSON.parse(JSON.stringify(cfg)),
    'normalized policy is durable career state',
  );
});

test('fixed auto-season nomination respects the selected order and protocol reserve cap', () => {
  const g = boot(521);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const eligible = gp.getEligibleMatchPlayers(G.myTeamId);
  const baseIds = eligible.slice(2, 5).map((p) => p.id).reverse();
  const reserveIds = eligible.slice(5, 7).map((p) => p.id).reverse();
  const cfg = gp.setAutoSeasonConfig({ lineupMode: 'fixed', basePlayerIds: baseIds, reservePlayerIds: reserveIds });
  const nomination = gp.selectAutoSeasonNomination(G.myTeamId, cfg);
  assert.deepEqual(Array.from(nomination.base, (p) => p.id), baseIds);
  assert.deepEqual(Array.from(nomination.reserves, (p) => p.id), reserveIds);

  G.countryId = 'CN';
  const olympic = gp.selectAutoSeasonNomination(G.myTeamId, cfg);
  assert.deepEqual(Array.from(olympic.reserves, (p) => p.id), reserveIds,
    'Olympic protocol carries the same two reserves even though it cannot substitute them');

  const baseOnly = gp.selectAutoSeasonNomination(G.myTeamId, {
    lineupMode: 'fixed', basePlayerIds: baseIds, reservePlayerIds: [],
  });
  assert.equal(baseOnly.reserves.length, 2, 'automation fills every available squad slot up to five');
});

test('rotation mode prefers a rested comparable player over a tired one', () => {
  const g = boot(522);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const pool = gp.getEligibleMatchPlayers(G.myTeamId).slice(0, 5);
  pool.forEach((p) => {
    p.fh = p.bh = p.srv = p.ret = p.men = 60;
    p.seasonForm = 0;
    p.fatigue = 0;
  });
  pool[0].fatigue = 100;
  const cfg = gp.setAutoSeasonConfig({
    lineupMode: 'rotation',
    basePlayerIds: pool.slice(0, 3).map((p) => p.id),
    reservePlayerIds: pool.slice(3).map((p) => p.id),
  });
  const nomination = gp.selectAutoSeasonNomination(G.myTeamId, cfg);
  assert.ok(!nomination.base.some((p) => p.id === pool[0].id), 'exhausted player rotates out');
  assert.ok(nomination.base.some((p) => p.id === pool[3].id), 'rested selected player rotates in');
});

test('player requests can stop auto-season or be explicitly declined with consequences', () => {
  const stopCase = boot(523);
  stopCase.PPM.gameplay.newGame(0, 'PL');
  const stopG = stopCase.PPM.state.G;
  const stopGp = stopCase.PPM.gameplay;
  const reserve = stopGp.getClubSeniorPlayers(stopG.myTeamId).at(-1);
  stopGp.pushMail({ type: 'decision', from: reserve.name, subject: 'x', body: 'x', decision: { kind: 'reserveRequest', playerId: reserve.id } });
  const stopCfg = stopGp.setAutoSeasonConfig({ stopOn: { playerRequest: true } });
  const stopped = stopGp.prepareAutoSeasonDecisions(stopCfg);
  assert.equal(stopped.stopReason, 'playerRequest');
  assert.equal(stopG.inbox.at(-1).answered, false, 'stopping leaves the choice to the manager');

  const ignoreCase = boot(524);
  ignoreCase.PPM.gameplay.newGame(0, 'PL');
  const ignoreG = ignoreCase.PPM.state.G;
  const ignoreGp = ignoreCase.PPM.gameplay;
  const ignoredReserve = ignoreGp.getClubSeniorPlayers(ignoreG.myTeamId).at(-1);
  const moraleBefore = ignoredReserve.morale;
  ignoreGp.pushMail({ type: 'decision', from: ignoredReserve.name, subject: 'x', body: 'x', decision: { kind: 'reserveRequest', playerId: ignoredReserve.id } });
  const ignoreCfg = ignoreGp.setAutoSeasonConfig({ stopOn: { playerRequest: false } });
  const ignored = ignoreGp.prepareAutoSeasonDecisions(ignoreCfg);
  assert.equal(ignored.stopReason, null);
  assert.equal(ignoreG.inbox.at(-1).answered, true);
  assert.equal(ignoreG.inbox.at(-1).answer, false);
  assert.ok(ignoredReserve.morale < moraleBefore, 'automatic refusal keeps the normal morale cost');
});

test('auto-season plays the configured number of matches and records why it stopped', async () => {
  const g = boot(525);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.phase = 'pre';
  const before = G.matchday;
  gp.setAutoSeasonConfig({ matchLimit: 1, paceMs: 250, stopOn: { playerRequest: false, injury: false } });
  await gp.autoPlaySeason();
  assert.equal(G.matchday, before + 1);
  assert.equal(G.autoSeasonLastStop.code, 'matchLimit');
  assert.equal(G.autoSeasonLastStop.matchesPlayed, 1);
});
