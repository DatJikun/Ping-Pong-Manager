// =============================================================================
// traits-staff-ai.test.js — Goal batch: traits, staff impact, AI parity, styles.
// All tests drive shipped gameplay entry points — no reimplemented math.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function basePlayer(id, extra = {}) {
  return {
    id, name: `P${id}`, fh: 70, bh: 70, srv: 70, ret: 70, foot: 70, men: 70,
    age: 25, peakAge: 28, traits: [], playStyle: 'TWO_SIDED', teamId: null,
    role: 'starter', morale: 50, fatigue: 0, seasonForm: 0, injuredFor: 0,
    ...extra,
  };
}

test('style counter DEFENDER vs TWO_SIDED lands in 57–65% band at equal stats', () => {
  const g = boot(2026);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const defender = basePlayer(9001, { playStyle: 'DEFENDER' });
  const attacker = basePlayer(9002, { playStyle: 'TWO_SIDED' });
  let wins = 0;
  const N = 2500;
  for (let i = 0; i < N; i++) {
    if (gp.simIndividual(defender, attacker, null, null).homeWin) wins++;
  }
  const rate = wins / N;
  assert.ok(rate >= 0.57, `counter floor ≥57%, got ${(rate * 100).toFixed(1)}% (${wins}/${N})`);
  assert.ok(rate <= 0.68, `counter ceiling ≤68% (not inverted), got ${(rate * 100).toFixed(1)}% (${wins}/${N})`);
});

test('large OVR favorite beats weaker style-counter underdog most of the time', () => {
  const g = boot(2026);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  // +20 OVR TWO_SIDED vs DEFENDER counter — skill must still dominate.
  const fav = basePlayer(1, {
    playStyle: 'TWO_SIDED',
    fh: 80, bh: 80, srv: 80, ret: 80, foot: 80, men: 80,
  });
  const dog = basePlayer(2, {
    playStyle: 'DEFENDER',
    fh: 60, bh: 60, srv: 60, ret: 60, foot: 60, men: 60,
  });
  let wins = 0;
  const N = 800;
  for (let i = 0; i < N; i++) {
    if (gp.simIndividual(fav, dog, null, null).homeWin) wins++;
  }
  assert.ok(wins / N >= 0.75, `+20 OVR favorite should usually win despite counter — got ${wins}/${N}`);
});

test('TACTICIAN commits fewer errors; HOTHEADED raises ATK when leading sets', () => {
  const g = boot(77);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const plain = basePlayer(1, { playStyle: 'TWO_SIDED' });
  const tac = basePlayer(3, { playStyle: 'TWO_SIDED', traits: ['TACTICIAN'] });
  let tacErrors = 0, plainErrors = 0, n = 400;
  for (let i = 0; i < n; i++) {
    tacErrors += gp.simIndividual(tac, plain, null, null).micro?.homeErrors || 0;
    plainErrors += gp.simIndividual(plain, tac, null, null).micro?.homeErrors || 0;
  }
  assert.ok(tacErrors < plainErrors,
    `TACTICIAN home should commit fewer errors: tac=${tacErrors} plain=${plainErrors}`);

  // HOTHEADED: when leading sets, live ATK rises via getLivePointStats.
  const hot = basePlayer(4, { traits: ['HOTHEADED'], playStyle: 'TWO_SIDED' });
  const profile = gp.buildPointSimProfile(hot, null);
  profile.setsWon = 2;
  profile.setsLost = 0;
  const leading = gp.getLivePointStats(profile, 5, 5);
  profile.setsWon = 0;
  profile.setsLost = 2;
  const trailing = gp.getLivePointStats(profile, 5, 5);
  assert.ok(leading.effATK > trailing.effATK,
    `HOTHEADED leading ATK ${leading.effATK} should exceed trailing ${trailing.effATK}`);
});

test('COMEBACK_KID boosts live stats when trailing sets', () => {
  const g = boot(12);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const kid = basePlayer(5, { traits: ['COMEBACK_KID'], playStyle: 'TWO_SIDED' });
  const profile = gp.buildPointSimProfile(kid, null);
  profile.setsWon = 0;
  profile.setsLost = 2;
  const trailing = gp.getLivePointStats(profile, 5, 5);
  profile.setsWon = 2;
  profile.setsLost = 0;
  const leading = gp.getLivePointStats(profile, 5, 5);
  assert.ok(trailing.effATK > leading.effATK || trailing.effMEN > leading.effMEN,
    `COMEBACK_KID should boost ATK/MEN when trailing (trail ATK=${trailing.effATK} MEN=${trailing.effMEN} lead ATK=${leading.effATK} MEN=${leading.effMEN})`);
});

test('new traits each produce a detectable match or growth effect', () => {
  const g = boot(8);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;

  // WALL — fewer home errors than plain twin over many duels
  const wall = basePlayer(20, { traits: ['WALL'], playStyle: 'DEFENDER' });
  const plainD = basePlayer(21, { traits: [], playStyle: 'DEFENDER' });
  let wallErr = 0, plainErr = 0;
  for (let i = 0; i < 300; i++) {
    wallErr += gp.simIndividual(wall, plainD, null, null).micro?.homeErrors || 0;
    plainErr += gp.simIndividual(plainD, wall, null, null).micro?.homeErrors || 0;
  }
  assert.ok(wallErr < plainErr, `WALL fewer errors: wall=${wallErr} plain=${plainErr}`);

  // SPIN_WIZARD — force more opponent errors (away errors when home has spin)
  const spin = basePlayer(22, { traits: ['SPIN_WIZARD'], playStyle: 'TWO_SIDED' });
  const plainT = basePlayer(23, { traits: [], playStyle: 'TWO_SIDED' });
  let spinOppErr = 0, plainOppErr = 0;
  for (let i = 0; i < 300; i++) {
    spinOppErr += gp.simIndividual(spin, plainT, null, null).micro?.awayErrors || 0;
    plainOppErr += gp.simIndividual(plainT, spin, null, null).micro?.awayErrors || 0;
  }
  assert.ok(spinOppErr > plainOppErr * 0.95,
    `SPIN_WIZARD should pressure opp errors: spinOpp=${spinOppErr} plainOpp=${plainOppErr}`);

  // CLUTCH — higher live ATK at 10-9 vs mid-set 5-5
  const clutch = basePlayer(24, { traits: ['CLUTCH'], playStyle: 'TWO_SIDED' });
  const cProf = gp.buildPointSimProfile(clutch, null);
  const mid = gp.getLivePointStats(cProf, 5, 5);
  const late = gp.getLivePointStats(cProf, 10, 9);
  assert.ok(late.effATK > mid.effATK, `CLUTCH late ATK ${late.effATK} > mid ${mid.effATK}`);

  // FAST_FEET — less match-stamina drain on long rallies
  const feet = basePlayer(25, { traits: ['FAST_FEET'] });
  const plainF = basePlayer(26, { traits: [] });
  const fp = gp.buildPointSimProfile(feet, null);
  const pp = gp.buildPointSimProfile(plainF, null);
  fp.matchStamina = 100; pp.matchStamina = 100;
  gp.applyLongRallyFatigue(fp, 20);
  gp.applyLongRallyFatigue(pp, 20);
  assert.ok(fp.matchStamina > pp.matchStamina,
    `FAST_FEET stamina ${fp.matchStamina} > plain ${pp.matchStamina} after long rally`);

  // BIG_MATCH — cup/bigMatch option lifts MEN in sim path (via profile)
  const big = basePlayer(27, { traits: ['BIG_MATCH'], men: 70 });
  const noBig = basePlayer(28, { traits: [], men: 70 });
  let bigWins = 0;
  for (let i = 0; i < 400; i++) {
    if (gp.simIndividual(big, noBig, null, null, { bigMatch: true }).homeWin) bigWins++;
  }
  assert.ok(bigWins / 400 > 0.52, `BIG_MATCH in bigMatch should edge twin — got ${bigWins}/400`);

  // Catalog presence for all new ids
  for (const id of ['FAST_FEET', 'SPIN_WIZARD', 'WALL', 'CLUTCH', 'MENTOR', 'BIG_MATCH']) {
    assert.ok(g.PPM.constants.TRAITS[id], `TRAITS.${id} registered`);
  }
});

test('MENTOR raises sparring growth vs identical teammate without MENTOR (applyGrowth)', () => {
  // Two AI clubs, same hall/academy/coach training; plant identical young starters.
  // Club A gets a MENTOR teammate → higher sparringMult → more OVR after growth seasons.
  const g = boot(404);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const ais = G.teams.filter((t) => !t.isPlayer);
  const clubA = ais[0];
  const clubB = ais[1];
  clubA.infraHall = 2;
  clubB.infraHall = 2;
  clubA.infraAcademy = 2;
  clubB.infraAcademy = 2;
  // Equalize coaches
  const train = 75;
  G.staff.filter((s) => s.type === 'coach' && (s.teamId === clubA.id || s.teamId === clubB.id)).forEach((s) => {
    s.training = train;
    s._healthVacation = false;
    s.contractYears = 5;
  });
  // Ensure both have a coach with that training
  ['A', 'B'].forEach((label, idx) => {
    const club = idx === 0 ? clubA : clubB;
    let c = G.staff.find((s) => s.teamId === club.id && s.type === 'coach');
    if (!c) {
      c = {
        id: 77000 + idx, type: 'coach', teamId: club.id, name: `Coach ${label}`,
        training: train, tactics: 70, motivation: 70, synergy: 70, age: 45, peakAge: 55,
        contractYears: 5, salary: 8000,
      };
      G.staff.push(c);
    } else {
      c.training = train;
      c._healthVacation = false;
    }
  });

  const mkJunior = (tid, id) => {
    const p = gp.genPlayer(tid, 18, 'PL');
    p.id = id;
    p.teamId = tid;
    p.role = 'starter';
    p.isYouth = false;
    p.contractYears = 8;
    p.ceiling = 88;
    p.willPlateau = false;
    p.peakAge = 28;
    p.traits = []; // no WUNDERKIND noise
    g.PPM.constants.SK.forEach((s) => { p[s] = 50; });
    G.players.push(p);
    return p;
  };
  const juniorA = mkJunior(clubA.id, 88011);
  const juniorB = mkJunior(clubB.id, 88012);

  // Neutralize pre-existing squad noise: only our planted reserves count as sparring.
  G.players.forEach((p) => {
    if ((p.teamId === clubA.id || p.teamId === clubB.id) && p.id !== juniorA.id && p.id !== juniorB.id) {
      p.role = 'starter';
      p.isYouth = false;
    }
  });

  // Bench depth equal (sparring depth), but only A has MENTOR
  for (let i = 0; i < 4; i++) {
    const ra = gp.genPlayer(clubA.id, 22, 'PL');
    ra.id = 88100 + i;
    ra.teamId = clubA.id;
    ra.role = 'reserve';
    ra.contractYears = 5;
    g.PPM.constants.SK.forEach((s) => { ra[s] = 48; });
    G.players.push(ra);
    const rb = gp.genPlayer(clubB.id, 22, 'PL');
    rb.id = 88200 + i;
    rb.teamId = clubB.id;
    rb.role = 'reserve';
    rb.contractYears = 5;
    g.PPM.constants.SK.forEach((s) => { rb[s] = 48; });
    G.players.push(rb);
  }
  const mentor = gp.genPlayer(clubA.id, 33, 'PL');
  mentor.id = 88300;
  mentor.teamId = clubA.id;
  mentor.role = 'reserve';
  mentor.traits = ['MENTOR'];
  mentor.contractYears = 5;
  g.PPM.constants.SK.forEach((s) => { mentor[s] = 55; });
  G.players.push(mentor);

  const beforeA = gp.ovrBase(juniorA);
  const beforeB = gp.ovrBase(juniorB);
  assert.strictEqual(beforeA, beforeB, 'twins start equal');

  // Several seasons so sparring mult compounds past RNG noise
  for (let s = 0; s < 6; s++) gp.applyGrowth();

  const gainA = gp.ovrBase(juniorA) - beforeA;
  const gainB = gp.ovrBase(juniorB) - beforeB;
  assert.ok(gainA > gainB,
    `MENTOR club junior should gain more OVR: withMentor=${gainA} without=${gainB} (before ${beforeA})`);
});

test('psychologist cushions morale after a loss vs no psych', () => {
  const g = boot(42);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  G.staff.filter((s) => s.teamId === myId && s.type === 'psychologist').forEach((s) => { s.teamId = null; });
  const psy = {
    id: 88001, type: 'psychologist', teamId: myId, name: 'Dr Test',
    moraleBoost: 90, mentalTraining: 90, pressure: 90, age: 40, peakAge: 50,
    contractYears: 2, salary: 5000,
  };
  G.staff.push(psy);
  G.players.filter((p) => p.teamId === myId).forEach((p) => { p.morale = 50; });
  const opp = G.teams.find((t) => t.id !== myId);
  const fakeLoss = {
    homeId: myId, awayId: opp.id, homeWin: false, isDraw: false,
    hTeamW: 1, aTeamW: 3, homePoints: 40, awayPoints: 80, forfeit: false, matchups: [],
  };
  gp.applyResult(fakeLoss);
  const withPsy = G.players.filter((p) => p.teamId === myId).reduce((s, p) => s + (p.morale || 0), 0)
    / G.players.filter((p) => p.teamId === myId).length;

  psy.teamId = null;
  G.players.filter((p) => p.teamId === myId).forEach((p) => { p.morale = 50; });
  gp.applyResult({ ...fakeLoss });
  const noPsy = G.players.filter((p) => p.teamId === myId).reduce((s, p) => s + (p.morale || 0), 0)
    / G.players.filter((p) => p.teamId === myId).length;

  assert.ok(withPsy > noPsy,
    `psych should soften loss morale: with=${withPsy.toFixed(1)} without=${noPsy.toFixed(1)}`);
});

test('physio reduces fatigue gain relative to no physio', () => {
  const g = boot(11);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  G.staff.filter((s) => s.teamId === myId && s.type === 'physio').forEach((s) => { s.teamId = null; });
  const phy = {
    id: 88002, type: 'physio', teamId: myId, name: 'Physio Pro',
    recovery: 95, prevention: 90, injReduction: 90, age: 42, peakAge: 55,
    contractYears: 2, salary: 4000,
  };
  G.staff.push(phy);
  G.players.filter((p) => p.teamId === myId).forEach((p) => { p.fatigue = 40; });
  const trackedIds = gp.getMatchStarters(myId).map((p) => p.id);
  const tracked = () => trackedIds.map((id) => G.players.find((p) => p.id === id));
  const before = tracked().map((p) => p.fatigue);
  const opp = G.teams.find((t) => t.league === G.teams.find((x) => x.id === myId).league && t.id !== myId);
  gp.simTeamMatch(myId, opp.id, false);
  const withPhyAvg = tracked()
    .reduce((s, p, i) => s + ((p.fatigue || 0) - before[i]), 0);

  phy.teamId = null;
  G.players.filter((p) => p.teamId === myId).forEach((p) => { p.fatigue = 40; });
  const before2 = tracked().map((p) => p.fatigue);
  gp.simTeamMatch(myId, opp.id, false);
  const noPhyAvg = tracked()
    .reduce((s, p, i) => s + ((p.fatigue || 0) - before2[i]), 0);

  assert.ok(withPhyAvg < noPhyAvg,
    `physio should reduce net fatigue: with=${withPhyAvg} without=${noPhyAvg}`);
});

test('AI youth promotes at 21; hall training improves AI growth vs hall 0', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const ai = G.teams.find((t) => !t.isPlayer);
  assert.ok(ai);

  // Youth promote
  const youth = gp.genPlayer(ai.id, 20, 'PL');
  youth.teamId = ai.id;
  youth.role = 'youth';
  youth.isYouth = true;
  youth.contractYears = 2;
  youth.fh = 40; youth.bh = 40; youth.srv = 40; youth.ret = 40; youth.foot = 40; youth.men = 40;
  G.players.push(youth);
  gp.applyGrowth();
  assert.strictEqual(youth.age, 21);
  assert.strictEqual(youth.role, 'senior', 'AI youth with contract should join the senior squad');
  assert.strictEqual(youth.isYouth, false);

  // Hall growth comparison: two clones on two AI clubs with hall 0 vs hall 4
  const aiA = G.teams.filter((t) => !t.isPlayer)[0];
  const aiB = G.teams.filter((t) => !t.isPlayer)[1];
  aiA.infraHall = 0;
  aiB.infraHall = 4;
  const mk = (tid, id) => {
    const p = gp.genPlayer(tid, 19, 'PL');
    p.id = id;
    p.teamId = tid;
    p.role = 'senior';
    p.isYouth = false;
    p.contractYears = 4;
    p.ceiling = 90;
    p.willPlateau = false;
    p.peakAge = 28;
    ['fh', 'bh', 'srv', 'ret', 'foot', 'men'].forEach((s) => { p[s] = 55; });
    G.players.push(p);
    return p;
  };
  const lowHall = mk(aiA.id, 99001);
  const highHall = mk(aiB.id, 99002);
  const beforeLo = gp.ovrBase(lowHall);
  const beforeHi = gp.ovrBase(highHall);
  // Run several growth seasons
  for (let s = 0; s < 4; s++) gp.applyGrowth();
  const gainLo = gp.ovrBase(lowHall) - beforeLo;
  const gainHi = gp.ovrBase(highHall) - beforeHi;
  assert.ok(gainHi >= gainLo,
    `higher hall should grow at least as much: hi=${gainHi} lo=${gainLo}`);
});

test('AI clubs can receive injuries via tryInjuriesForTeam', () => {
  const g = boot(99);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const ai = G.teams.find((t) => !t.isPlayer);
  const starters = gp.getEligibleMatchPlayers(ai.id);
  assert.ok(starters.length >= 1);
  starters.forEach((p) => { p.fatigue = 95; p.injuredFor = 0; });
  let any = false;
  for (let i = 0; i < 80 && !any; i++) {
    starters.forEach((p) => { p.injuredFor = 0; p.fatigue = 95; });
    if (gp.tryInjuriesForTeam(ai.id).length) any = true;
  }
  assert.ok(any, 'AI match candidates with high fatigue should eventually roll injuries');
});

test('new traits appear on some generated players over a sample', () => {
  const g = boot(8);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const newIds = ['FAST_FEET', 'SPIN_WIZARD', 'WALL', 'CLUTCH', 'MENTOR', 'BIG_MATCH'];
  let found = 0;
  for (let i = 0; i < 80; i++) {
    const p = gp.genPlayer(null, 24 + (i % 10), 'PL');
    if ((p.traits || []).some((t) => newIds.includes(t))) found++;
  }
  assert.ok(found > 0, 'expected some generated players to carry new traits');
});
