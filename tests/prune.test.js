// =============================================================================
// tests/prune.test.js — long-career data growth is bounded (the lag/crash fix).
//
// pruneCareerData() runs each season-end. It must: cap the Hall of Fame at the 20
// best careers (deleting the rest), remove retired players from the active array,
// and strip heavy per-duel detail from old results. See tests/stress.js for the
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

test('old results lose heavy per-duel detail but recent results keep it', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.season = 10;
  G.results = [
    { season: 3, matchups: [{ a: 1 }], tiebreak: {}, score: '3:1' },   // old → strip
    { season: 9, matchups: [{ a: 1 }], score: '3:2' },                  // recent → keep
    { season: 10, matchups: [{ a: 1 }], score: '3:0' },                 // current → keep
  ];
  g.PPM.gameplay.pruneCareerData();
  assert.equal(G.results[0].matchups, undefined, 'season 3 detail stripped');
  assert.equal(G.results[0].tiebreak, undefined);
  assert.ok(Array.isArray(G.results[1].matchups), 'season 9 detail kept');
  assert.ok(Array.isArray(G.results[2].matchups), 'season 10 detail kept');
  assert.equal(G.results[0].score, '3:1', 'the lightweight result itself is preserved');
});
