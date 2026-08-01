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
