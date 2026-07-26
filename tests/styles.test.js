// =============================================================================
// tests/styles.test.js — Player playing-style system.
//
// Guards the 5 real table-tennis styles: that the data table is internally
// consistent, the counter-pentagon is antisymmetric, generation only produces
// valid styles, legacy saves migrate, and the style matchup actually moves
// results in the engine.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const EXPECTED = ['TWO_SIDED', 'FH_LOOPER', 'BLOCKER', 'FISHER', 'DEFENDER'];

test('style data table is complete and internally consistent', () => {
  const g = boot(1);
  const INFO = g.PPM.constants.PLAYER_STYLE_INFO;
  const STYLES = g.PPM.constants.PLAYER_STYLES;
  assert.deepEqual([...STYLES].sort(), [...EXPECTED].sort());

  for (const id of EXPECTED) {
    const s = INFO[id];
    assert.ok(s, `${id} exists`);
    for (const f of ['label', 'archetype', 'grip', 'color', 'desc', 'engine']) {
      assert.ok(s[f] !== undefined, `${id}.${f} present`);
    }
    assert.ok(Array.isArray(s.strengths) && s.strengths.length, `${id} has strengths`);
    assert.ok(Array.isArray(s.weaknesses) && s.weaknesses.length, `${id} has weaknesses`);
    assert.ok(Array.isArray(s.beats) && s.beats.length === 2, `${id} beats exactly 2`);
    assert.ok(Array.isArray(s.losesTo) && s.losesTo.length === 2, `${id} losesTo exactly 2`);
    // beats/losesTo reference real styles and never itself
    for (const x of [...s.beats, ...s.losesTo]) assert.ok(INFO[x] && x !== id, `${id} references valid ${x}`);
  }
});

test('counter-pentagon is antisymmetric (A beats B  <=>  B losesTo A)', () => {
  const g = boot(1);
  const INFO = g.PPM.constants.PLAYER_STYLE_INFO;
  for (const a of EXPECTED) {
    for (const b of INFO[a].beats) {
      assert.ok(INFO[b].losesTo.includes(a), `${b} should list ${a} in losesTo`);
    }
    for (const b of INFO[a].losesTo) {
      assert.ok(INFO[b].beats.includes(a), `${b} should list ${a} in beats`);
    }
  }
});

test('generated players only ever have valid styles', () => {
  const g = boot(77);
  g.PPM.gameplay.newGame(0, 'PL');
  for (const p of g.PPM.state.G.players) {
    assert.ok(EXPECTED.includes(p.playStyle), `player ${p.name} has style ${p.playStyle}`);
  }
});

test('legacy save styles migrate to the new ids', () => {
  const g = boot(1);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const legacy = JSON.stringify({
    ...G,
    players: [
      { ...G.players[0], playStyle: 'AGRESYWNY' },
      { ...G.players[1], playStyle: 'CIERPLIWY' },
      { ...G.players[2], playStyle: 'TECHNICZNY' },
      { ...G.players[3], playStyle: 'WSZECHSTRONNY' },
    ],
  });
  g.PPM.stateApi.loadGameFromText(legacy);
  const got = g.PPM.state.G.players.slice(0, 4).map((p) => p.playStyle);
  assert.deepEqual(got, ['FH_LOOPER', 'DEFENDER', 'BLOCKER', 'TWO_SIDED']);
});

test('style matchup measurably shifts duel outcomes', () => {
  // Build two clones with identical stats but opposite styles in a counter pair,
  // and confirm the favoured style wins clearly more than half over many duels.
  const g = boot(2026);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const base = { id: 9001, fh: 70, bh: 70, srv: 70, ret: 70, foot: 70, men: 70, age: 25, peakAge: 27, traits: [], teamId: null, role: 'starter' };
  // DEFENDER beats TWO_SIDED in the pentagon.
  const defender = { ...base, id: 9001, playStyle: 'DEFENDER' };
  const attacker = { ...base, id: 9002, playStyle: 'TWO_SIDED' };

  let defWins = 0;
  // Counters measurable but not inverted: target band ~57–65% (cap 68%).
  const N = 2500;
  for (let i = 0; i < N; i++) {
    const r = gp.simIndividual(defender, attacker, null, null);
    if (r.homeWin) defWins++;
  }
  const rate = defWins / N;
  assert.ok(rate >= 0.57, `DEFENDER equal-stat counter floor — got ${defWins}/${N}`);
  assert.ok(rate <= 0.68, `DEFENDER equal-stat counter ceiling (not stomp) — got ${defWins}/${N}`);
});

test('skill beats style: +20 OVR TWO_SIDED still beats weaker DEFENDER counter', () => {
  const g = boot(2026);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const fav = {
    id: 1, fh: 80, bh: 80, srv: 80, ret: 80, foot: 80, men: 80,
    age: 25, peakAge: 28, traits: [], playStyle: 'TWO_SIDED', teamId: null, role: 'starter',
    morale: 50, fatigue: 0, seasonForm: 0,
  };
  const dog = {
    id: 2, fh: 60, bh: 60, srv: 60, ret: 60, foot: 60, men: 60,
    age: 25, peakAge: 28, traits: [], playStyle: 'DEFENDER', teamId: null, role: 'starter',
    morale: 50, fatigue: 0, seasonForm: 0,
  };
  let wins = 0;
  const N = 800;
  for (let i = 0; i < N; i++) {
    if (gp.simIndividual(fav, dog, null, null).homeWin) wins++;
  }
  assert.ok(wins / N >= 0.75, `favorite should win most despite counter — got ${wins}/${N}`);
});
