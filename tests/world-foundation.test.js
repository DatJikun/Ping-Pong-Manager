// World-foundation contracts shared by simulation and UI.
// Every assertion describes player-visible behaviour rather than source layout.

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (part) => sorted[Math.floor((sorted.length - 1) * part)];
  return { min: sorted[0], p10: at(0.1), median: at(0.5), p90: at(0.9), max: sorted.at(-1) };
}

test('rating profile maps current and peak OVR onto exactly five star slots', () => {
  const g = boot(731);
  const gp = g.PPM.gameplay;

  assert.equal(typeof gp.ratingProfile, 'function', 'simulation exposes the shared rating contract');
  assert.deepEqual(
    { ...gp.ratingProfile(20, 100) },
    { currentOvr: 20, peakOvr: 100, currentStars: 1, peakStars: 5, slots: 5 },
  );
  assert.deepEqual(
    { ...gp.ratingProfile(46, 58) },
    { currentOvr: 46, peakOvr: 58, currentStars: 2.3, peakStars: 2.9, slots: 5 },
  );
});

test('rating profile clamps malformed values and never shows peak below current', () => {
  const g = boot(732);
  const gp = g.PPM.gameplay;

  assert.deepEqual(
    { ...gp.ratingProfile(120, 40) },
    { currentOvr: 100, peakOvr: 100, currentStars: 5, peakStars: 5, slots: 5 },
  );
  assert.deepEqual(
    { ...gp.ratingProfile('not-a-number', -10) },
    { currentOvr: 0, peakOvr: 0, currentStars: 0, peakStars: 0, slots: 5 },
  );
});

test('physiotherapist attributes are ratings, not literal percentage reductions', () => {
  const g = boot(734);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const teamId = G.myTeamId;
  G.staff = G.staff.filter((staff) => staff.teamId !== teamId || staff.type !== 'physio');

  assert.deepEqual(
    { ...gp.physioEffectProfile(teamId) },
    {
      fatigueGainMultiplier: 1,
      restBonus: 0,
      injuryChanceReduction: 0,
      injuryDurationReduction: 0,
    },
  );

  const install = (rating) => {
    G.staff = G.staff.filter((staff) => staff.teamId !== teamId || staff.type !== 'physio');
    G.staff.push({
      id: 90000 + rating,
      type: 'physio',
      teamId,
      age: 45,
      peakAge: 52,
      recovery: rating,
      prevention: rating,
      injReduction: rating,
    });
    return gp.physioEffectProfile(teamId);
  };

  const ordinary = install(50);
  assert.ok(ordinary.fatigueGainMultiplier >= 0.91 && ordinary.fatigueGainMultiplier <= 0.93,
    `ordinary physio trims about 8% net fatigue, got ${ordinary.fatigueGainMultiplier}`);
  assert.equal(ordinary.restBonus, 4);
  assert.ok(ordinary.injuryChanceReduction >= 0.12 && ordinary.injuryChanceReduction <= 0.14);
  assert.ok(ordinary.injuryDurationReduction >= 0.16 && ordinary.injuryDurationReduction <= 0.18);

  const elite = install(90);
  assert.ok(elite.fatigueGainMultiplier >= 0.84 && elite.fatigueGainMultiplier <= 0.86,
    `elite physio trims about 15% net fatigue, got ${elite.fatigueGainMultiplier}`);
  assert.equal(elite.restBonus, 7);
  assert.ok(elite.injuryChanceReduction >= 0.23 && elite.injuryChanceReduction <= 0.25);
  assert.ok(elite.injuryDurationReduction >= 0.29 && elite.injuryDurationReduction <= 0.31);
  assert.ok(elite.fatigueGainMultiplier < ordinary.fatigueGainMultiplier);
  assert.ok(elite.injuryChanceReduction > ordinary.injuryChanceReduction);
  assert.ok(elite.injuryDurationReduction > ordinary.injuryDurationReduction);
});

test('medical infrastructure and physiotherapist cannot erase rehabilitation time', () => {
  const g = boot(735);
  const gp = g.PPM.gameplay;

  assert.ok(Math.abs(gp.combinedRehabReduction(0.30, 0.20) - 0.44) < 1e-9);
  assert.equal(gp.combinedRehabReduction(0.82, 0.30), 0.80,
    'elite staff and infrastructure stop at 80% combined reduction');
  assert.equal(gp.combinedRehabReduction(2, 2), 0.80,
    'malformed legacy values cannot bypass the cap');
});

test('every generated staff profession uses a credible shared 0..100 quality scale', () => {
  const g = boot(733);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;

  for (const type of ['coach', 'physio', 'psychologist', 'scout']) {
    const stats = distribution(Array.from({ length: 400 }, () => gp.staffOvr(gp.genStaff(type, 'PL'))));
    assert.ok(stats.p10 <= 35, `${type} market still contains affordable low-end staff: ${JSON.stringify(stats)}`);
    assert.ok(stats.median >= 40 && stats.median <= 60,
      `${type} median represents a competent journeyman: ${JSON.stringify(stats)}`);
    assert.ok(stats.p90 >= 68, `${type} market has a real high-quality tail: ${JSON.stringify(stats)}`);
    assert.ok(stats.max >= 75, `${type} can produce an elite candidate: ${JSON.stringify(stats)}`);
  }
});

test('fresh first-division clubs employ credible staff and outclass the second division', () => {
  for (const country of ['PL', 'DE', 'CN', 'JP', 'SE', 'KR']) {
    const g = boot(740);
    g.PPM.gameplay.newGame(0, country);
    const G = g.PPM.state.G;
    const gp = g.PPM.gameplay;
    const leagueOf = (staff) => G.teams.find((team) => team.id === staff.teamId)?.league;
    const roleRatings = (type, league) => G.staff
      .filter((staff) => staff.type === type && leagueOf(staff) === league)
      .map(gp.staffOvr);

    const coaches = distribution(roleRatings('coach', 1));
    const physios = distribution(roleRatings('physio', 1));
    assert.ok(coaches.p10 >= 35, `${country} L1 avoids implausible bottom-tier coaches: ${JSON.stringify(coaches)}`);
    assert.ok(coaches.median >= 52, `${country} L1 coach median is credible: ${JSON.stringify(coaches)}`);
    assert.ok(physios.p10 >= 30, `${country} L1 avoids implausible bottom-tier physios: ${JSON.stringify(physios)}`);
    assert.ok(physios.median >= 45, `${country} L1 physio median is credible: ${JSON.stringify(physios)}`);

    const teamStaffAverage = (team) => {
      const ratings = G.staff
        .filter((staff) => staff.teamId === team.id && ['coach', 'physio', 'psychologist'].includes(staff.type))
        .map(gp.staffOvr);
      return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
    };
    const l1 = G.teams.filter((team) => team.league === 1 && !team.isPlayer).map(teamStaffAverage);
    const l2 = G.teams.filter((team) => team.league === 2).map(teamStaffAverage);
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(mean(l1) >= mean(l2) + 6,
      `${country} L1 staff should be materially stronger than L2 (${mean(l1).toFixed(1)} vs ${mean(l2).toFixed(1)})`);
  }
});

test('staff-market policy varies by season and never exposes the old quota of 80', () => {
  const g = boot(750);
  const gp = g.PPM.gameplay;
  assert.equal(typeof gp.staffMarketPolicy, 'function', 'simulation exposes staff-market policy');

  for (const type of ['coach', 'physio', 'psychologist', 'scout', 'pr']) {
    const policies = Array.from({ length: 8 }, (_, index) => gp.staffMarketPolicy(type, 24, index + 1, 'PL'));
    assert.ok(new Set(policies.map((policy) => policy.intakeTarget)).size >= 3,
      `${type} has visibly different hiring years`);
    for (const policy of policies) {
      assert.ok(policy.floor >= 12, `${type} safety floor prevents an empty market`);
      assert.ok(policy.intakeTarget > policy.floor, `${type} intake sits above its floor`);
      assert.ok(policy.hardCap > policy.intakeTarget, `${type} hard cap remains an emergency bound`);
      assert.notEqual(policy.intakeTarget, 80, `${type} no longer rebuilds to the old quota`);
    }
  }
});

test('fresh and regenerated staff markets follow varied role policies', () => {
  const g = boot(751);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const counts = () => ({
    coach: G.staffPool.filter((staff) => staff.type === 'coach').length,
    physio: G.staffPool.filter((staff) => staff.type === 'physio').length,
    psychologist: G.staffPool.filter((staff) => staff.type === 'psychologist').length,
    scout: G.scoutPool.filter((staff) => !staff.hired && staff.teamId === null).length,
    pr: G.prDirectorPool.filter((staff) => staff.teamId === null).length,
  });
  const assertWithinPolicy = (snapshot) => {
    for (const [type, count] of Object.entries(snapshot)) {
      const policy = gp.staffMarketPolicy(type, G.teams.length, G.season, G.countryId);
      assert.ok(count >= policy.floor && count <= policy.hardCap,
        `${type} count ${count} within ${JSON.stringify(policy)}`);
      assert.notEqual(count, 80, `${type} does not expose the old exact quota`);
    }
  };

  assertWithinPolicy(counts());
  const oldIds = new Set([
    ...G.staffPool.map((staff) => staff.id),
    ...G.scoutPool.filter((staff) => !staff.hired).map((staff) => staff.id),
    ...G.prDirectorPool.map((staff) => staff.id),
  ]);
  G.staffPool.forEach((staff) => { staff.age = 71; });
  G.scoutPool.filter((staff) => !staff.hired).forEach((staff) => { staff.age = 71; });
  G.prDirectorPool.forEach((staff) => { staff.age = 76; });
  gp.replenishStaffPools();
  assertWithinPolicy(counts());
  const regeneratedIds = [
    ...G.staffPool.map((staff) => staff.id),
    ...G.scoutPool.filter((staff) => !staff.hired).map((staff) => staff.id),
    ...G.prDirectorPool.map((staff) => staff.id),
  ];
  assert.ok(regeneratedIds.every((id) => !oldIds.has(id)), 'retired candidates are replaced by fresh people');
});

test('free-agent intake responds to retirements and varies between seasons', () => {
  const g = boot(760);
  const gp = g.PPM.gameplay;
  assert.equal(typeof gp.freeAgentMarketPolicy, 'function', 'simulation exposes free-agent population policy');

  const quietYears = Array.from({ length: 8 }, (_, index) =>
    gp.freeAgentMarketPolicy(24, index + 1, 'PL', 0));
  const intakeCounts = quietYears.map((policy) => policy.externalIntake);
  const softTargets = quietYears.map((policy) => policy.softTarget);
  const retirementYear = gp.freeAgentMarketPolicy(24, 4, 'PL', 18).externalIntake;
  assert.ok(new Set(intakeCounts).size >= 4, `quiet-year intake still varies: ${intakeCounts.join(', ')}`);
  assert.ok(new Set(softTargets).size >= 5, `market comfort range changes visibly: ${softTargets.join(', ')}`);
  assert.ok(retirementYear > intakeCounts[3], 'a large retirement class attracts more new players');
  assert.ok(intakeCounts.every((count) => count >= 2 && count <= 18), 'external intake stays plausible');
  assert.ok(softTargets.every((count) => count >= 70 && count <= 130), 'normal market range stays broad but useful');
  assert.ok(softTargets.some((count) => count < 100) && softTargets.some((count) => count > 100),
    'some years are scarce and others abundant');
  assert.ok(gp.freeAgentMarketPolicy(24, 1, 'PL', 0).emergencyCap > 140,
    'safety ceiling is well above a normal market and is not the old visible target');
});

test('free-agent lifecycle protects fresh and scouted players but removes stale weak candidates cleanly', () => {
  const g = boot(761);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  assert.equal(typeof gp.updateFreeAgentLifecycle, 'function', 'simulation exposes yearly market lifecycle');
  const make = (id, marketSeasons, value) => {
    const player = gp.genPlayer(null, 32, 'PL');
    player.id = id;
    player.teamId = null;
    player.contractYears = 0;
    player.marketSeasons = marketSeasons;
    for (const stat of g.PPM.constants.SK) player[stat] = value;
    G.players.push(player);
    G.playerHistory[id] = [{ season: 1, ovr: value }];
    return player;
  };
  const fresh = make(91001, 0, 42);
  const stale = make(91002, 6, 18);
  const scouted = make(91003, 6, 18);
  G.scoutResults.push({ realId: scouted.id, reported: { ...scouted } });
  G.transferMarket.push({ playerId: stale.id, type: 'fa', fee: 0 });
  G.marketShortlist = [stale.id];
  g.PPM.ui.marketCompare = [stale.id];

  gp.updateFreeAgentLifecycle();
  gp.pruneCareerData();

  assert.ok(G.players.some((player) => player.id === fresh.id), 'freshly released player gets a real chance');
  assert.ok(G.players.some((player) => player.id === scouted.id), 'paid scouting result cannot disappear');
  assert.ok(!G.players.some((player) => player.id === stale.id), 'stale weak candidate leaves the active world');
  assert.equal(G.playerHistory[stale.id], undefined, 'departed player history is removed');
  assert.ok(!G.transferMarket.some((row) => row.playerId === stale.id), 'departed market row is removed');
  assert.ok(!G.marketShortlist.includes(stale.id), 'departed shortlist row is removed');
  assert.ok(!g.PPM.ui.marketCompare.includes(stale.id), 'departed comparison row is removed');
});

test('an extreme release wave is absorbed organically before the emergency cap', () => {
  const g = boot(762);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  while (G.players.filter((player) => player.teamId === null && !player.retired).length < 300) {
    const player = gp.genPlayer(null, 29, 'PL');
    player.teamId = null;
    player.contractYears = 0;
    player.marketSeasons = 0;
    for (const stat of g.PPM.constants.SK) player[stat] = 45;
    G.players.push(player);
  }
  const policy = gp.freeAgentMarketPolicy(G.teams.length, G.season, G.countryId, 0);

  gp.updateFreeAgentLifecycle();

  const remaining = G.players.filter((player) => player.teamId === null && !player.retired).length;
  assert.ok(remaining < policy.emergencyCap,
    `natural departures absorb the wave before emergency pruning (${remaining} < ${policy.emergencyCap})`);
  assert.notEqual(remaining, policy.softTarget, 'soft target creates pressure but is never a hard trim point');
});
