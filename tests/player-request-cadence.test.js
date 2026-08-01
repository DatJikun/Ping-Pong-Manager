const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('a senior cannot ask in the opening rounds and needs a real spell without playing', () => {
  const g = boot(530);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const reserve = gp.getClubSeniorPlayers(G.myTeamId).at(-1);
  reserve.seasonForm = 8;
  reserve.injuredFor = 0;
  reserve.lastPlayedMatchday = -1;

  G.matchday = 2;
  assert.equal(gp.reserveRequestPolicy(reserve).eligible, false, 'no artificial second-match complaint');
  G.matchday = 4;
  assert.equal(gp.reserveRequestPolicy(reserve).eligible, true, 'strong unused senior may now raise the issue');
  reserve.lastPlayedMatchday = 2;
  assert.equal(gp.reserveRequestPolicy(reserve).eligible, false, 'recent playing time removes the grievance');
});

test('reserve requests have both player and squad-wide cooldowns', () => {
  const g = boot(531);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const reserves = gp.getClubSeniorPlayers(G.myTeamId).slice(3);
  reserves.forEach((p) => { p.seasonForm = 10; p.injuredFor = 0; p.lastPlayedMatchday = -1; });
  g.Math.random = () => 0;

  G.matchday = 4;
  gp.generateInboxForMatchday();
  const first = G.inbox.find((m) => m.decision?.kind === 'reserveRequest');
  assert.ok(first, 'an eligible request can occur');
  gp.answerMail(first.id, false);

  G.matchday = 5;
  gp.generateInboxForMatchday();
  assert.equal(G.inbox.filter((m) => m.decision?.kind === 'reserveRequest').length, 1, 'another reserve does not immediately take a turn');

  G.matchday = 10;
  gp.generateInboxForMatchday();
  assert.equal(G.inbox.filter((m) => m.decision?.kind === 'reserveRequest').length, 2, 'conversation can recur after a meaningful interval');
});

test('a previously neglected senior fielded in the base three records genuine recent playing time', () => {
  const g = boot(532);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const eligible = gp.getEligibleMatchPlayers(G.myTeamId);
  const reserve = eligible.at(-1);
  const other = eligible.filter((p) => p.id !== reserve.id).slice(0, 4);
  G.matchNomination = {
    season: G.season,
    matchday: G.matchday,
    base: [reserve.id, ...other.slice(0, 2).map((p) => p.id)],
    reserves: other.slice(2, 4).map((p) => p.id),
  };
  const opponent = G.teams.find((t) => t.id !== G.myTeamId && t.league === gp.myLeague());
  reserve.lastPlayedMatchday = -1;
  gp.simTeamMatch(G.myTeamId, opponent.id, false);
  assert.equal(reserve.lastPlayedMatchday, G.matchday);
});

