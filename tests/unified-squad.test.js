const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('one senior roster owns availability for healthy, injured, and loaned players', () => {
  const g = boot(4201);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  const seniors = G.players.filter((player) => player.teamId === myId
    && !player.retired && player.role !== 'youth');
  assert.ok(seniors.length >= 3);
  const [healthy, injured, loaned] = seniors;
  injured.injuredFor = 3;
  const borrower = G.teams.find((team) => team.id !== myId);
  G.loans.push({
    playerId: loaned.id,
    fromTeamId: myId,
    toTeamId: borrower.id,
    seasons: 1,
    returned: false,
    originalRole: 'senior',
    wageShare: 0.5,
  });
  loaned.teamId = borrower.id;
  loaned.loanedOut = true;

  assert.equal(typeof gp.isSeniorPlayer, 'function');
  assert.equal(gp.isSeniorPlayer(healthy), true);
  assert.deepEqual({ ...gp.matchAvailability(healthy, myId) }, {
    available: true,
    code: 'available',
    reasonKey: null,
    reasonParams: {},
  });
  assert.deepEqual({ ...gp.matchAvailability(injured, myId) }, {
    available: false,
    code: 'injured',
    reasonKey: 'match.nom.unavailableInjured',
    reasonParams: { rounds: 3 },
  });
  const loanStatus = { ...gp.matchAvailability(loaned, myId) };
  assert.equal(loanStatus.available, false);
  assert.equal(loanStatus.code, 'loanedOut');
  assert.equal(loanStatus.reasonParams.club, borrower.name);

  const activeIds = Array.from(gp.getClubSeniorPlayers(myId), (player) => player.id);
  const ownedIds = Array.from(gp.getClubSeniorPlayers(myId, true), (player) => player.id);
  assert.equal(activeIds.includes(loaned.id), false, 'active roster excludes a player away on loan');
  assert.equal(ownedIds.includes(loaned.id), true, 'owned roster can show the unavailable loanee');
});

test('the last five are restored slot-for-slot and only Best lineup rebuilds them', () => {
  const g = boot(4202);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const players = gp.getEligibleMatchPlayers(G.myTeamId).slice(0, 6);
  assert.equal(players.length, 6);
  players.forEach((player, index) => {
    const rating = 40 + index * 5;
    player.fh = player.bh = player.srv = player.ret = player.foot = player.men = rating;
  });
  const [a, b, c, r1, r2] = [players[1], players[3], players[0], players[4], players[2]];
  G.lastMatchSelection = { base: [a.id, b.id, c.id], reserves: [r1.id, r2.id] };

  let view = gp.matchSelectionView(G.myTeamId, G.lastMatchSelection);
  assert.deepEqual(Array.from(view.selectedIds), [a.id, b.id, c.id, r1.id, r2.id]);
  b.injuredFor = 3;
  view = gp.matchSelectionView(G.myTeamId, G.lastMatchSelection);
  assert.deepEqual(Array.from(view.selectedIds), [a.id, null, c.id, r1.id, r2.id]);
  assert.equal(view.slots[1].previousPlayer.id, b.id);
  assert.equal(view.slots[1].status.code, 'injured');
  assert.equal(view.slots[2].player.id, c.id, 'later slots do not compact');

  const suggested = gp.bestMatchSelection(G.myTeamId);
  const expected = gp.getEligibleMatchPlayers(G.myTeamId)
    .slice().sort((left, right) => gp.ovr(right) - gp.ovr(left) || left.id - right.id)
    .slice(0, 5).map((player) => player.id);
  assert.deepEqual([...suggested.base, ...suggested.reserves], expected,
    'Best lineup is the independent OVR rebuild');
});

test('selection validation requires every available slot up to five', () => {
  const g = boot(4203);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const seniors = gp.getEligibleMatchPlayers(G.myTeamId).slice(0, 6);
  assert.equal(seniors.length, 6);
  const selectionFor = (count) => ({
    base: seniors.slice(0, Math.min(3, count)).map((player) => player.id),
    reserves: seniors.slice(3, count).map((player) => player.id),
  });
  const setAvailable = (count) => {
    gp.getClubSeniorPlayers(G.myTeamId).forEach((player) => { player.injuredFor = 9; });
    seniors.slice(0, count).forEach((player) => { player.injuredFor = 0; });
  };

  for (const [available, requiredTotal] of [[6, 5], [5, 5], [4, 4], [3, 3]]) {
    setAvailable(available);
    const result = gp.validateMatchSelection(G.myTeamId, selectionFor(requiredTotal));
    assert.equal(result.ok, true, `${available} available accepts ${requiredTotal}`);
    assert.equal(result.requiredTotal, requiredTotal);
    assert.equal(result.unplayable, false);
  }
  setAvailable(2);
  const unplayable = gp.validateMatchSelection(G.myTeamId, selectionFor(2));
  assert.equal(unplayable.ok, false);
  assert.equal(unplayable.unplayable, true);

  setAvailable(5);
  assert.equal(gp.validateMatchSelection(G.myTeamId, selectionFor(4)).ok, false,
    'four selected is refused while five are available');
  setAvailable(4);
  assert.equal(gp.validateMatchSelection(G.myTeamId, selectionFor(4)).ok, true,
    'the same four slots are legal when only four are available');
});

test('a Cup match consumes only the one-shot copy and the league restores the persistent order', () => {
  const g = boot(4204);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const pool = gp.getEligibleMatchPlayers(G.myTeamId).slice(0, 5).reverse();
  const saved = { base: pool.slice(0, 3).map((player) => player.id), reserves: pool.slice(3).map((player) => player.id) };
  G.lastMatchSelection = JSON.parse(JSON.stringify(saved));
  G.matchNomination = { season: G.season, matchday: G.matchday, ...JSON.parse(JSON.stringify(saved)) };
  const opponent = G.teams.find((team) => team.id !== G.myTeamId && team.league === gp.myLeague());

  gp.simTeamMatch(G.myTeamId, opponent.id, true);
  assert.equal(G.matchNomination, null, 'the Cup consumes the one-shot nomination');
  assert.deepEqual(Array.from(gp.getMatchNomination(G.myTeamId).base, (player) => player.id), saved.base);
  assert.deepEqual(Array.from(gp.getMatchNomination(G.myTeamId).reserves, (player) => player.id), saved.reserves);
});

test('confirming the modal persists the exact manager-picked 3+2 order', () => {
  const g = boot(4205);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const picked = gp.getEligibleMatchPlayers(G.myTeamId).slice(0, 5).reverse();

  gp.openMatchNomination();
  gp.nomClear();
  picked.forEach((player) => gp.nomToggle(player.id));
  gp.nomConfirm();

  const expected = { base: picked.slice(0, 3).map((player) => player.id), reserves: picked.slice(3).map((player) => player.id) };
  assert.deepEqual(JSON.parse(JSON.stringify(G.lastMatchSelection)), expected);
  assert.deepEqual({ base: Array.from(G.matchNomination.base), reserves: Array.from(G.matchNomination.reserves) }, expected);
});

test('fresh careers store only senior/youth roles and role-like metadata cannot change team strength', () => {
  const g = boot(4206);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  assert.ok(G.players.every((player) => player.role === 'senior' || player.role === 'youth'));
  const before = gp.teamOvr(G.myTeamId);
  gp.getClubSeniorPlayers(G.myTeamId).forEach((player, index) => {
    player.legacyLineupLabel = index % 2 ? 'reserve' : 'starter';
    player.preferredRole = index % 2 ? 'rotation' : 'starter';
  });
  assert.equal(gp.teamOvr(G.myTeamId), before);
});

test('healthy seniors outside A/B/C are the sparring group and any neglected senior may request a match', () => {
  const g = boot(4207);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  seniors.forEach((player) => { player.injuredFor = 0; player.traits = []; });
  const chosen = seniors.slice(0, 5);
  G.lastMatchSelection = { base: chosen.slice(0, 3).map((player) => player.id), reserves: chosen.slice(3).map((player) => player.id) };
  const healthyAcademy = G.players.filter((player) => player.teamId === G.myTeamId
    && player.role === 'youth' && !player.retired && !player.injuredFor).length;
  assert.equal(gp.getSparringProfile(G.myTeamId).partnerCount, seniors.length - 3 + healthyAcademy);

  const neglected = seniors.at(-1);
  neglected.role = 'senior';
  neglected.seasonForm = 8;
  neglected.lastPlayedMatchday = -1;
  G.matchday = 8;
  G._lastReserveRequest = null;
  assert.equal(gp.reserveRequestPolicy(neglected).eligible, true);
});

test('post-match injury rolls target actual participants, not an old permanent lineup', () => {
  const g = boot(4208);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  seniors.forEach((player) => { player.injuredFor = 0; player.fatigue = 100; player.traits = []; });
  const participant = seniors.at(-1);
  const originalRandom = g.Math.random;
  g.Math.random = () => 0;
  try {
    gp.tryInjuriesForTeam(G.myTeamId, new Set([participant.id]));
  } finally {
    g.Math.random = originalRandom;
  }
  assert.equal(participant.injuredFor > 0, true);
  assert.equal(seniors.filter((player) => player.id !== participant.id).some((player) => player.injuredFor > 0), false);
});

test('league champions award every active senior in the winning club', () => {
  const g = boot(4209);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const club = G.teams.find((team) => team.id === G.myTeamId);
  G.teams.filter((team) => team.league === club.league).forEach((team) => { team.pts = team.id === club.id ? 99 : 0; });
  const seniors = gp.getClubSeniorPlayers(club.id);
  seniors.forEach((player) => { player.awards = []; });
  gp.giveSeasonAwards();
  assert.ok(seniors.every((player) => player.awards.some((award) => award.type === 'league_champion')));
});
