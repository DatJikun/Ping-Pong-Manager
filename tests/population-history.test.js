const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const makeFreeAgent = (g, age = 30) => {
  const p = g.PPM.gameplay.genPlayer(null, age, 'PL');
  p.teamId = null;
  p.contractYears = 0;
  p.role = 'reserve';
  g.PPM.state.G.players.push(p);
  g.PPM.state.G.playerHistory[p.id] = [{ season: g.PPM.state.G.season, ovr: 50 }];
  return p;
};

test('population cleanup caps free agents and removes every dangling player reference', () => {
  const g = boot(2001);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;

  while (G.players.filter((p) => p.teamId === null && !p.retired).length < 130) {
    makeFreeAgent(g);
  }

  const retiredCareer = makeFreeAgent(g, 39);
  const unusedGenerated = makeFreeAgent(g, 39);
  for (const p of [retiredCareer, unusedGenerated]) {
    for (const stat of ['fh', 'bh', 'srv', 'ret', 'foot', 'men']) p[stat] = 15;
  }
  retiredCareer.careerW = 240;
  retiredCareer.careerL = 80;
  retiredCareer.careerSeasons = 12;
  retiredCareer.awards = [{ season: 3, type: 'league_champion', displayLabel: 'Mistrz' }];

  const removedIds = [retiredCareer.id, unusedGenerated.id];
  G.transferMarket.push(...removedIds.map((playerId) => ({ playerId, type: 'fa', fee: 0 })));
  G.marketShortlist = [...removedIds];
  g.PPM.ui.marketCompare = [...removedIds];

  g.PPM.gameplay.pruneCareerData();

  const freeAgents = G.players.filter((p) => !p.retired && p.teamId === null);
  assert.equal(freeAgents.length, G.teams.length * 5, 'five market players per active club');
  for (const id of removedIds) {
    assert.ok(!G.players.some((p) => p.id === id), `removed player ${id} left the active world`);
    assert.equal(G.playerHistory[id], undefined, `history ${id} was deleted`);
    assert.ok(!G.transferMarket.some((row) => row.playerId === id), `market row ${id} was deleted`);
    assert.ok(!G.marketShortlist.includes(id), `shortlist entry ${id} was deleted`);
    assert.ok(!g.PPM.ui.marketCompare.includes(id), `comparison entry ${id} was deleted`);
  }
  assert.ok(G.hallOfFame.some((entry) => entry.id === retiredCareer.id),
    'a discarded player with a real career remains as a lightweight Hall of Fame candidate');
  assert.ok(!G.hallOfFame.some((entry) => entry.id === unusedGenerated.id),
    'an unused generated player creates no historical noise');
  assert.ok(G.hallOfFame.length <= 20);
});

test('population cleanup deletes history belonging to staff who no longer exist', () => {
  const g = boot(2002);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const live = G.staff[0];
  G.staffHistory[live.id] = [{ season: 1, ovr: 60 }];
  G.staffHistory[999999] = [{ season: 1, ovr: 45 }];

  g.PPM.gameplay.pruneCareerData();

  assert.deepEqual(G.staffHistory[live.id], [{ season: 1, ovr: 60 }]);
  assert.equal(G.staffHistory[999999], undefined);
});

test('club ledger records a compact season with cup result and top three performers', () => {
  const g = boot(2003);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const team = G.teams[0];
  Object.assign(team, { w: 14, d: 2, l: 6, pts: 44, gf: 55, ga: 31, pointsWon: 2110, pointsLost: 1840 });
  const squad = G.players.filter((p) => p.teamId === team.id).slice(0, 4);
  squad.forEach((p, index) => Object.assign(p, {
    leagueSeasonW: 20 - index,
    leagueSeasonL: 5 + index,
    leagueSeasonPointsWon: 400 - index * 20,
    leagueSeasonPointsLost: 250 + index * 20,
  }));
  G.cup = { finished: true, winner: { id: team.id, name: team.name, isReal: true }, rounds: [] };

  g.PPM.gameplayClubUI.recordClubSeasonHistory();
  const row = G.clubHistory[team.id][0];

  assert.deepEqual(
    {
      season: row.season, league: row.league, position: row.position, played: row.played,
      pts: row.pts, w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga,
      pointsWon: row.pointsWon, pointsLost: row.pointsLost, cupStage: row.cupStage,
    },
    {
      season: 1, league: 1, position: row.position, played: 22,
      pts: 44, w: 14, d: 2, l: 6, gf: 55, ga: 31,
      pointsWon: 2110, pointsLost: 1840, cupStage: 'winner',
    },
  );
  assert.equal(row.topPlayers.length, 3);
  assert.equal(row.topPlayers[0].id, squad[0].id);
  assert.ok(row.topPlayers.every((p) => Object.keys(p).sort().join(',')
    === 'age,id,l,lossPoints,name,ovr,points,w,winPoints'));
});

test('club lifetime statistics derive from the permanent ledger without a second history', () => {
  const g = boot(2004);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const team = G.teams[0];
  G.clubHistory[team.id] = [
    { season: 1, league: 1, position: 2, played: 22, pts: 40, w: 13, d: 1, l: 8, gf: 50, ga: 35, pointsWon: 2000, pointsLost: 1800, ovr: 72, budget: 100000, cupStage: 'semifinal', topPlayers: [] },
    { season: 2, league: 1, position: 1, played: 22, pts: 48, w: 16, d: 0, l: 6, gf: 61, ga: 29, pointsWon: 2250, pointsLost: 1700, ovr: 76, budget: 150000, cupStage: 'winner', topPlayers: [] },
  ];

  const stats = g.PPM.gameplayClubUI.getClubCareerStats(team.id);

  assert.deepEqual(
    {
      seasons: stats.seasons, games: stats.games, points: stats.points,
      pointsPerGame: stats.pointsPerGame, wins: stats.wins, draws: stats.draws,
      losses: stats.losses, leagueTitles: stats.leagueTitles, cupTitles: stats.cupTitles,
      bestPosition: stats.bestPosition, bestPoints: stats.bestPoints, peakOvr: stats.peakOvr,
    },
    {
      seasons: 2, games: 44, points: 88, pointsPerGame: 2,
      wins: 29, draws: 1, losses: 14, leagueTitles: 1, cupTitles: 1,
      bestPosition: 1, bestPoints: 48, peakOvr: 76,
    },
  );
});

test('migration enriches legacy club rows and removes duplicated team snapshots', () => {
  const g = boot(2005);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const team = G.teams[0];
  G.schemaVersion = 19;
  G.clubHistory = {
    [team.id]: [{ season: 1, league: 1, position: 3, pts: 37, w: 11, d: 4, l: 7, ovr: 70, budget: 80000 }],
  };
  G.seasonHistory = [{
    season: 1,
    teamsSnapshot: [{ id: team.id, gf: 49, ga: 41, pointsWon: 1900, pointsLost: 1850 }],
  }];

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const row = loaded.clubHistory[team.id][0];

  assert.equal(loaded.schemaVersion, 20);
  assert.equal(row.played, 22);
  assert.equal(row.gf, 49);
  assert.equal(row.ga, 41);
  assert.equal(row.pointsWon, 1900);
  assert.equal(row.pointsLost, 1850);
  assert.deepEqual(row.topPlayers, []);
  assert.equal('teamsSnapshot' in loaded.seasonHistory[0], false);
});
