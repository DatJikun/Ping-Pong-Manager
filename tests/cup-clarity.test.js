const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function club(id, name) {
  return { id, name, isReal: true };
}

function setCup(g, rounds, currentRound = 0, finished = false, winner = null) {
  g.PPM.state.G.cup = { rounds, currentRound, finished, winner };
  g.PPM.state.G.cupPlayedThisSeason = false;
}

test('National Cup status derives waiting and due states from the current bracket and matchday', () => {
  const g = boot(9201);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const mine = club(G.myTeamId, 'My Club');
  const opponent = club(99901, 'First Opponent');
  setCup(g, [[{ home: mine, away: opponent, result: null }]]);

  G.matchday = 3;
  assert.deepEqual(gp.getCupClubStatus(mine.id), {
    state: 'waiting',
    nextTrigger: 4,
    roundIndex: 0,
    path: [],
    opponent: opponent,
    result: null,
  });

  G.matchday = 4;
  assert.deepEqual(gp.getCupClubStatus(mine.id), {
    state: 'due',
    nextTrigger: 4,
    roundIndex: 0,
    path: [],
    opponent: opponent,
    result: null,
  });
});

test('National Cup status reports an advanced club and its next round', () => {
  const g = boot(9202);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const mine = club(G.myTeamId, 'My Club');
  const first = club(99902, 'First Opponent');
  const second = club(99903, 'Second Opponent');
  const other = club(99904, 'Other Club');
  const firstResult = { score: '3-1', winner: mine, loser: first };
  setCup(g, [
    [{ home: mine, away: first, result: firstResult }],
    [{ home: mine, away: second, result: null }, { home: other, away: club(99905, 'Elsewhere'), result: null }],
  ], 1);
  G.matchday = 5;
  G.cupPlayedThisSeason = true;

  assert.deepEqual(gp.getCupClubStatus(mine.id), {
    state: 'alive',
    nextTrigger: 8,
    roundIndex: 1,
    path: [{ roundIndex: 0, opponent: first, result: firstResult }],
    opponent: second,
    result: null,
  });
});

test('National Cup status keeps the elimination opponent and result', () => {
  const g = boot(9203);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const mine = club(G.myTeamId, 'My Club');
  const opponent = club(99906, 'Knockout Club');
  const result = { score: '2-3', winner: opponent, loser: mine };
  setCup(g, [[{ home: mine, away: opponent, result }]], 1);
  G.matchday = 4;
  G.cupPlayedThisSeason = true;

  assert.deepEqual(gp.getCupClubStatus(mine.id), {
    state: 'eliminated',
    nextTrigger: null,
    roundIndex: 0,
    path: [{ roundIndex: 0, opponent, result }],
    opponent,
    result,
  });
});

test('National Cup status reports a champion and exposes the shared reward ladder', () => {
  const g = boot(9204);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const mine = club(G.myTeamId, 'My Club');
  const first = club(99907, 'First Opponent');
  const opponent = club(99908, 'Final Opponent');
  const firstResult = { score: '3-1', winner: mine, loser: first };
  const result = { score: '3-0', winner: mine, loser: opponent };
  setCup(g, [[{ home: mine, away: first, result: firstResult }], [], [], [], [{ home: mine, away: opponent, result }]], 5, true, mine);

  assert.deepEqual(gp.CUP_PRIZES, {
    winner: 35000,
    finalist: 18000,
    semifinalist: 9000,
    quarterfinalist: 4500,
  });
  assert.deepEqual(gp.getCupClubStatus(mine.id), {
    state: 'champion',
    nextTrigger: null,
    roundIndex: 4,
    path: [{ roundIndex: 0, opponent: first, result: firstResult }, { roundIndex: 4, opponent, result }],
    opponent,
    result,
  });
});
