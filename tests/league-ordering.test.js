const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');

function team(overrides = {}) {
  return {
    id: 99,
    name: 'Zeta',
    league: 1,
    pts: 20,
    gf: 10,
    ga: 10,
    pointsWon: 400,
    pointsLost: 400,
    ...overrides,
  };
}

function compareIdentity(a, b) {
  return String(a.id).localeCompare(String(b.id), 'en', { numeric: true })
    || a.name.localeCompare(b.name, 'en');
}

function makeCompleteTie(g) {
  const G = g.PPM.state.G;
  const division = G.teams.filter((entry) => entry.league === 1);
  for (const entry of division) {
    Object.assign(entry, {
      pts: 20,
      gf: 10,
      ga: 10,
      pointsWon: 400,
      pointsLost: 400,
    });
  }
  const expected = [...division].sort(compareIdentity);
  G.teams = [
    ...G.teams.filter((entry) => entry.league !== 1),
    ...[...division].reverse(),
  ];
  G.myTeamId = expected[0].id;
  for (const entry of G.teams) entry.isPlayer = entry.id === G.myTeamId;
  return expected;
}

test('league comparator applies every tie-break in order', () => {
  const gp = boot(4101).PPM.gameplay;
  const cases = [
    [team({ pts: 21 }), team({ pts: 20, gf: 99 }), 'league points'],
    [team({ gf: 12 }), team({ gf: 11 }), 'team-duel difference'],
    [team({ pointsWon: 410 }), team({ pointsLost: 410 }), 'small-point difference'],
    [
      team({ pointsWon: 410, pointsLost: 410 }),
      team({ pointsWon: 400, pointsLost: 400 }),
      'small points scored',
    ],
    [team({ id: 2 }), team({ id: 10 }), 'club id'],
    [
      team({ id: 'legacy', name: 'Alpha' }),
      team({ id: 'legacy', name: 'Zeta' }),
      'club name',
    ],
  ];

  for (const [winner, loser, label] of cases) {
    assert.ok(gp.compareLeagueTeams(winner, loser) < 0, label);
  }
});

test('league UI and every sporting system agree on a deterministic full tie', () => {
  const g = boot(4102);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const expected = makeCompleteTie(g);
  const expectedIds = expected.map((entry) => entry.id);

  assert.deepEqual(
    Array.from(gp.leagueStandings(1), (entry) => entry.id),
    expectedIds,
    'shared standings ignore database order',
  );
  assert.equal(gp.checkGoal({ goal: 'top1' }), true, 'board and sponsor goal');
  assert.equal(gp.sponsorProg({ goal: 'top1' }).pct, 100, 'goal progress');
  assert.equal(gp.calcTVRights(), 55000, 'position-based income');

  G.newsFeed = [];
  gp.generateMatchdayNews([{
    homeId: expected[0].id,
    awayId: expected[1].id,
    homeWin: false,
    isDraw: false,
    score: '2:3',
  }], G.myTeamId);
  assert.ok(G.newsFeed.some((entry) => entry.msgKey === 'news.leaderDropsPoints'
    && entry.msgParams.team === expected[0].name), 'news leader');

  gp.giveSeasonAwards();
  assert.ok(G.players.some((player) => player.teamId === expected[0].id
    && (player.awards || []).some((award) => award.type === 'league_champion'
      && award.season === G.season)), 'championship award');
  assert.equal(G.players.some((player) => player.teamId !== expected[0].id
    && G.teams.find((entry) => entry.id === player.teamId)?.league === 1
    && (player.awards || []).some((award) => award.type === 'league_champion'
      && award.season === G.season)), false, 'no rival receives the title');

  const movement = gp.doPromotionRelegation();
  assert.deepEqual(
    Array.from(movement.relegated),
    expected.slice(-2).reverse().map((entry) => entry.name),
    'relegation order',
  );

  gp.recordClubSeasonHistory();
  assert.deepEqual(
    expected.map((entry) => G.clubHistory[entry.id].at(-1).position),
    expected.map((_, index) => index + 1),
    'club history positions',
  );

  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });
  g.PPM.ui.leagueTab = 'l1';
  g.PPM.ui.leagueStatsTab = 'table';
  const leagueHtml = g.PPM.pages.pageLeague();
  const nameOffsets = expected.map((entry) => leagueHtml.indexOf(`>${entry.name}`));
  assert.ok(nameOffsets.every((offset) => offset >= 0), 'every club appears in the table');
  assert.deepEqual(nameOffsets, [...nameOffsets].sort((a, b) => a - b), 'league page order');

  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/shell.js'), 'utf8'), g,
    { filename: 'src/ui/shell.js' });
  g.PPM.updateHeader();
  assert.match(g.document.getElementById('h-club-sub').textContent, /#1$/, 'header position');
});
