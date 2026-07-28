const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('migration keeps employed staff ID and reassigns a colliding market candidate', () => {
  const g = boot(901);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const employed = G.staff[0];
  const employedId = employed.id;
  const candidate = g.PPM.gameplay.genStaff('coach', 'PL');
  candidate.id = employedId;
  candidate.name = 'Market Collision';
  candidate.teamId = null;
  G.staffPool.unshift(candidate);

  g.PPM.stateApi.loadGameFromText(JSON.stringify({ ...G, _pid: 3 }));
  const loaded = g.PPM.state.G;
  const loadedEmployed = loaded.staff.find((s) => s.name === employed.name);
  const loadedCandidate = loaded.staffPool.find((s) => s.name === candidate.name);

  assert.equal(loadedEmployed.id, employedId, 'employed person keeps the canonical ID');
  assert.notEqual(loadedCandidate.id, employedId, 'market candidate receives a fresh ID');
  assert.equal(g.PPM.gameplay.findStaffById(employedId).name, employed.name,
    'old ID resolves to the employed person');
  assert.equal(g.PPM.gameplay.findStaffById(loadedCandidate.id).name, candidate.name,
    'market candidate remains addressable under the fresh ID');
  assert.ok(g.PPM.ui._pid > loadedCandidate.id, 'global counter stays above the repaired ID');
});

test('migration preserves a legal keptScouts copy of the same employed scout', () => {
  const g = boot(902);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const employedScout = G.staff.find((s) => s.type === 'scout');
  assert.ok(employedScout, 'fixture has an employed scout');
  const keptCopy = { ...employedScout, hired: true };
  G.scoutPool.unshift(keptCopy);

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const loadedEmployed = loaded.staff.find((s) => s.name === employedScout.name);
  const loadedCopy = loaded.scoutPool.find((s) => s.name === employedScout.name);

  assert.equal(loadedCopy.id, loadedEmployed.id,
    'same-person employed/scoutPool representation intentionally shares the ID');
});

test('migration separates different candidates colliding across market pools', () => {
  const g = boot(903);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const coach = G.staffPool[0];
  const scout = G.scoutPool[0];
  scout.id = coach.id;
  scout.name = 'Cross Pool Collision';

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const loadedCoach = loaded.staffPool.find((s) => s.name === coach.name);
  const loadedScout = loaded.scoutPool.find((s) => s.name === scout.name);

  assert.notEqual(loadedScout.id, loadedCoach.id, 'different market candidates get distinct IDs');
  assert.equal(g.PPM.gameplay.findStaffById(loadedCoach.id).name, coach.name,
    'staffPool keeps precedence for the original ID');
  assert.equal(g.PPM.gameplay.findStaffById(loadedScout.id).name, scout.name,
    'reassigned scout remains addressable');
});
