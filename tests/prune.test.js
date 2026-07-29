// =============================================================================
// tests/prune.test.js — long-career data growth is bounded (the lag/crash fix).
//
// pruneCareerData() runs each season-end. It must: cap the Hall of Fame at the 20
// best careers (deleting the rest), remove retired players from the active array,
// and delete old match rows once their season summary is in the club ledger. See
// tests/stress.js for the
// end-to-end proof; this is the fast unit check.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('Hall of Fame is capped at the 20 best careers; the rest are deleted', () => {
  const g = boot(1);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.hallOfFame = [];
  for (let i = 0; i < 35; i++) {
    G.hallOfFame.push({ id: 10000 + i, name: 'Legend ' + i, goatScore: i, trophyMap: {}, wrate: 50, peakOvr: 70, careerW: 10 });
  }
  g.PPM.gameplay.pruneCareerData();
  assert.equal(G.hallOfFame.length, 20, 'kept exactly 20');
  const scores = G.hallOfFame.map((e) => e.goatScore);
  assert.equal(Math.min(...scores), 15, 'kept the top 20 by score (15..34)');
  assert.equal(Math.max(...scores), 34);
});

test('retired players are removed from the active array (kept only as HoF summaries)', () => {
  const g = boot(2);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const victims = G.players.slice(0, 5).map((p) => p.id);
  G.players.slice(0, 5).forEach((p) => { p.retired = true; });
  const before = G.players.length;
  g.PPM.gameplay.pruneCareerData();
  assert.equal(G.players.length, before - 5, 'five retired players removed');
  for (const id of victims) {
    assert.ok(!G.players.find((p) => p.id === id), 'retired player gone from active array');
    assert.ok(!G.playerHistory || G.playerHistory[id] === undefined, 'their per-player history is cleaned up');
  }
});

test('only current and previous season results remain; permanent club history is untouched', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.season = 10;
  G.clubHistory = {
    1: [
      { season: 3, position: 2, pts: 48, w: 15, d: 3, l: 4 },
      { season: 9, position: 1, pts: 55, w: 18, d: 1, l: 3 },
    ],
  };
  const permanentHistory = JSON.parse(JSON.stringify(G.clubHistory));
  G.results = [
    { season: 3, matchups: [{ a: 1 }], tiebreak: {}, score: '3:1' },
    { season: 8, matchups: [{ a: 1 }], score: '3:1' },
    { season: 9, matchups: [{ a: 1 }], score: '3:2' },
    { season: 10, matchups: [{ a: 1 }], score: '3:0' },
  ];
  g.PPM.gameplay.pruneCareerData();
  assert.deepEqual(G.results.map((r) => r.season), [9, 10], 'old match rows are deleted');
  assert.ok(Array.isArray(G.results[0].matchups), 'previous-season match detail kept');
  assert.ok(Array.isArray(G.results[1].matchups), 'current-season match detail kept');
  assert.deepEqual(G.clubHistory, permanentHistory, 'compact permanent season summaries survive pruning');
});
