// =============================================================================
// tests/cleanup.test.js — Code-cleanup guards (schema version, unified names,
// dead odds path gone).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('newGame stamps SAVE_SCHEMA_VERSION on the save', () => {
  const g = boot(1);
  g.PPM.gameplay.newGame(0, 'PL');
  const ver = g.PPM.state.G.schemaVersion;
  const expected = g.PPM.stateApi.SAVE_SCHEMA_VERSION;
  assert.strictEqual(typeof ver, 'number');
  assert.strictEqual(ver, expected);
  assert.ok(ver >= 19);
});

test('migrateLoadedGame upgrades old saves and stamps schemaVersion', () => {
  const g = boot(2);
  g.PPM.gameplay.newGame(0, 'PL');
  const raw = JSON.parse(JSON.stringify(g.PPM.state.G));
  delete raw.schemaVersion;
  // Strip a field that migration must restore
  raw.players.forEach((p) => { delete p.seasonForm; });
  const migrated = g.PPM.stateApi.migrateLoadedGame(raw);
  assert.strictEqual(migrated.schemaVersion, g.PPM.stateApi.SAVE_SCHEMA_VERSION);
  assert.ok(migrated.players.every((p) => typeof p.seasonForm === 'number'));
});

test('randNameForCountry is shared via utils and returns two-word names', () => {
  const g = boot(3);
  const name = g.PPM.utils.randNameForCountry('PL');
  assert.ok(typeof name === 'string' && name.includes(' '), `got name: ${name}`);
  const cn = g.PPM.utils.randNameForCountry('CN');
  assert.ok(cn.includes(' '));
  // gameplay generation uses the same function (no separate divergent copy)
  g.PPM.gameplay.newGame(0, 'PL');
  const p = g.PPM.gameplay.genPlayer(null, 24, 'DE');
  assert.ok(p.name && p.name.split(' ').length >= 2);
});

test('dead duel odds helpers are not on the gameplay export', () => {
  const g = boot(4);
  assert.strictEqual(g.PPM.gameplay.duelWinProbability, undefined);
  assert.strictEqual(g.PPM.gameplay.matchupProfileSwing, undefined);
  // Live path still present
  assert.strictEqual(typeof g.PPM.gameplay.simIndividual, 'function');
  assert.strictEqual(typeof g.PPM.gameplay.getStyleEdge, 'function');
});
