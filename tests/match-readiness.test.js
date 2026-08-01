const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('offseason recovery leaves even a fully exhausted player ready for preseason', () => {
  const g = boot(509);
  const recover = g.PPM.gameplay.offseasonFatigue;
  assert.equal(typeof recover, 'function');
  assert.deepEqual([0, 30, 70, 90, 100].map(recover), [0, 0, 8, 12, 14]);
});

test('nomination rules follow each country protocol instead of one global reserve requirement', () => {
  const expected = {
    PL: ['superliga', 3, 2, 5], DE: ['superliga', 3, 2, 5], SE: ['superliga', 3, 2, 5],
    CN: ['olympic', 3, 2, 5], KR: ['olympic', 3, 2, 5], JP: ['tleague', 3, 2, 5],
  };
  for (const [countryId, [protocol, requiredBase, maxReserves, recommendedTotal]] of Object.entries(expected)) {
    const g = boot(510);
    g.PPM.gameplay.newGame(0, countryId);
    const rules = { ...g.PPM.gameplay.matchNominationRules() };
    assert.equal(rules.protocol, protocol, `${countryId} protocol`);
    assert.equal(rules.requiredBase, requiredBase, `${countryId} base`);
    assert.equal(rules.maxReserves, maxReserves, `${countryId} reserve slots`);
    assert.equal(rules.recommendedTotal, recommendedTotal, `${countryId} recommended squad`);
    assert.equal(rules.reservesUsedInMatch, protocol === 'superliga', `${countryId} reserve use`);
    const auto = g.PPM.gameplay.autoNomination(g.PPM.state.G.myTeamId);
    assert.equal(auto.base.length, 3, `${countryId} auto base`);
    assert.ok(auto.reserves.length <= maxReserves, `${countryId} auto nomination respects reserve cap`);
  }
});

test('a saved nomination is valid for one matchday only', () => {
  const g = boot(511);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const automatic = gp.autoNomination(G.myTeamId).base.map((p) => p.id);
  const eligible = gp.getEligibleMatchPlayers(G.myTeamId);
  const staleBase = eligible.slice(-3).map((p) => p.id).reverse();
  G.matchNomination = {
    season: G.season,
    matchday: G.matchday - 1,
    base: staleBase,
    reserves: [],
  };
  assert.deepEqual(
    Array.from(gp.getMatchNomination(G.myTeamId).base, (p) => p.id),
    automatic,
    'previous-round selection falls back to a fresh automatic nomination',
  );
});

test('sparring profile is the single readable contract for bench development value', () => {
  const g = boot(512);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const squad = G.players.filter((p) => p.teamId === G.myTeamId && !p.retired);
  squad.forEach((p) => { p.role = 'senior'; p.isYouth = false; p.traits = []; p.injuredFor = 2; });
  const base = squad.slice(0, 3);
  const partners = squad.slice(3, 6);
  [...base, ...partners].forEach((p) => { p.injuredFor = 0; });
  G.lastMatchSelection = { base: base.map((p) => p.id), reserves: partners.slice(0, 2).map((p) => p.id) };
  const styles = ['DEFENDER', 'FH_LOOPER', 'BLOCKER'];
  partners.forEach((p, i) => {
    p.role = i === 2 ? 'youth' : 'senior';
    p.isYouth = i === 2;
    p.playStyle = styles[i];
    p.fh = p.bh = p.srv = p.ret = p.men = 70;
  });
  squad[0].traits = ['MENTOR'];
  const profile = { ...gp.getSparringProfile(G.myTeamId) };
  assert.equal(profile.partnerCount, 3);
  assert.equal(profile.mentorCount, 1);
  assert.deepEqual(Array.from(profile.styles), styles);
  const expectedAverage = Number((partners.reduce((sum, p) => sum + gp.ovrBase(p), 0) / partners.length).toFixed(1));
  const expectedMultiplier = Number((1 + 0.5 * (expectedAverage / 70) * 0.18 + 0.1).toFixed(3));
  assert.equal(profile.averageOvr, expectedAverage);
  assert.equal(profile.developmentMultiplier, expectedMultiplier);
  assert.equal(profile.developmentBonusPct, Number(((expectedMultiplier - 1) * 100).toFixed(1)));
});

test('healthy sparring partners create a small capped preparation lift against represented styles', () => {
  const g = boot(513);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const opponent = G.teams.find((t) => t.id !== G.myTeamId && t.league === gp.myLeague());
  const ours = gp.getClubSeniorPlayers(G.myTeamId);
  const theirs = gp.getClubSeniorPlayers(opponent.id);
  ours.forEach((p) => { p.role = 'senior'; p.injuredFor = 0; });
  theirs.forEach((p) => {
    p.role = 'senior'; p.injuredFor = 0;
    p.fh = p.bh = p.srv = p.ret = p.foot = p.men = 35;
  });
  theirs.slice(0, 3).forEach((p, i) => {
    p.playStyle = ['DEFENDER', 'FH_LOOPER', 'BLOCKER'][i];
    p.fh = p.bh = p.srv = p.ret = p.foot = p.men = 60;
  });
  G.lastMatchSelection = { base: ours.slice(0, 3).map((p) => p.id), reserves: ours.slice(3, 5).map((p) => p.id) };
  ours.slice(3).forEach((p, i) => {
    p.playStyle = ['DEFENDER', 'FH_LOOPER'][i % 2];
    p.fh = p.bh = p.srv = p.ret = p.men = 70;
  });
  const prepared = { ...gp.getMatchPreparation(G.myTeamId, opponent.id) };
  assert.equal(prepared.targetStyleCount, 3);
  assert.equal(prepared.coveredStyleCount, 2);
  assert.deepEqual(Array.from(prepared.coveredStyles).sort(), ['DEFENDER', 'FH_LOOPER'].sort());
  assert.ok(prepared.ratingBonus > 0 && prepared.ratingBonus <= 1.2);

  const duel = gp.simIndividual(ours[0], theirs[0], null, null, {
    homePreparationBonus: prepared.ratingBonus,
    awayPreparationBonus: 0,
  });
  assert.deepEqual(
    { ...duel.preparation },
    { home: prepared.ratingBonus, away: 0 },
    'the point engine consumes the preparation contract',
  );

  ours.slice(3).forEach((p) => { p.injuredFor = 2; });
  assert.equal(gp.getMatchPreparation(G.myTeamId, opponent.id).ratingBonus, 0, 'injured partners cannot prepare the team');
});
