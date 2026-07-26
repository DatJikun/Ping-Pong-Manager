// =============================================================================
// tests/development.test.js — coach → player development (the dynasty tool).
//
// A good coach develops players faster, with CONCAVE returns (a 75-training coach
// is most of the way; 95 only a little more) and a weak coach still helps. Youth
// benefit far more than seniors.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('coach development multiplier is concave and youth-favouring', () => {
  const g = boot(1);
  const gp = g.PPM.gameplay;
  const m = gp.coachDevMultiplier;
  assert.equal(m(0, true), 1, 'no coach = base growth');
  assert.ok(m(20, true) > 1.2, 'even a weak coach helps youth');
  assert.ok(m(95, true) > m(95, false), 'youth benefit > seniors');
  // concave: the 75→95 gain is much smaller than the 20→75 gain
  assert.ok((m(95, true) - m(75, true)) < (m(75, true) - m(20, true)), 'diminishing returns at the top');
});

function grow6(coachTrain) {
  const g = boot(42);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay, G = g.PPM.state.G, myId = G.myTeamId;
  G.players.push({ id: 99001, teamId: myId, name: 'Junior X', age: 16, role: 'youth', isYouth: true, fh: 55, bh: 55, srv: 55, ret: 55, foot: 55, men: 55, peakAge: 28, traits: [], retired: false, careerSeasons: 0, contractYears: 6, loyalty: 0, seasonForm: 0, stamina: 60 });
  G.staff = G.staff.filter((s) => !(s.teamId === myId && s.type === 'coach'));
  if (coachTrain !== null) G.staff.push({ id: 88001, type: 'coach', teamId: myId, name: 'Trener', age: 45, peakAge: 55, training: coachTrain, tactics: 60, motivation: 60, synergy: 60, contractYears: 3 });
  for (let i = 0; i < 6; i++) gp.applyGrowth();
  return gp.ovrBase(G.players.find((p) => p.id === 99001));
}

test('a good coach develops a youth measurably faster than no coach', () => {
  const none = grow6(null);
  const good = grow6(75);
  assert.ok(good > none, `coached youth (${good}) grows more than uncoached (${none})`);
  assert.ok(good - 55 >= (none - 55) * 1.4, 'a good coach gives at least ~40% more growth');
});

test('elite vs very-good coach shows diminishing returns in practice', () => {
  const good = grow6(75);
  const elite = grow6(95);
  assert.ok(elite >= good, 'elite is not worse');
  assert.ok(elite - good <= 2, 'but only marginally better (concave)');
});
