const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function validSave(overrides = {}) {
  return JSON.stringify({
    season: 4,
    matchday: 2,
    phase: 'season',
    countryId: 'PL',
    schemaVersion: 20,
    myTeamId: 1,
    teams: [{ id: 1, name: 'Legacy Club', isPlayer: true }],
    players: [],
    ...overrides,
  });
}

test('save validation rejects malformed and future career files before migration', () => {
  const g = boot(2401);
  const api = g.PPM.stateApi;

  for (const text of [
    'null',
    '[]',
    JSON.stringify({ season: 1, teams: [] }),
    JSON.stringify({ season: 1, players: [] }),
    JSON.stringify({ season: 'one', teams: [], players: [] }),
    validSave({ schemaVersion: '999' }),
    validSave({ schemaVersion: api.SAVE_SCHEMA_VERSION + 1 }),
  ]) {
    assert.throws(() => api.validateSaveText(text));
  }

  assert.doesNotThrow(() => api.validateSaveText(validSave()));
});

test('legacy ppgame becomes one career and is removed only after read-back', async () => {
  const g = boot(2402);
  const adapter = g.PPM.saveStorage.createMemoryAdapter();
  g.localStorage.setItem(g.PPM.stateApi.LOCAL_STORAGE_KEY, validSave());
  const manager = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    legacyStorage: g.localStorage,
    legacyKey: g.PPM.stateApi.LOCAL_STORAGE_KEY,
    validateText: g.PPM.stateApi.validateSaveText,
    loadText: () => {},
    serializeCurrent: () => validSave(),
    newId: prefix => `${prefix}-legacy`,
    now: () => 100,
  });

  await manager.initialize();
  assert.equal((await manager.listCareers()).length, 1);
  assert.equal((await manager.listCareers())[0].summary.clubName, 'Legacy Club');
  assert.equal(g.localStorage.getItem(g.PPM.stateApi.LOCAL_STORAGE_KEY), null);

  const second = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    legacyStorage: g.localStorage,
    legacyKey: g.PPM.stateApi.LOCAL_STORAGE_KEY,
    validateText: g.PPM.stateApi.validateSaveText,
    loadText: () => {},
    serializeCurrent: () => validSave(),
  });
  await second.initialize();
  assert.equal((await second.listCareers()).length, 1);
});

test('failed legacy import leaves the original localStorage save untouched', async () => {
  const g = boot(2403);
  const base = g.PPM.saveStorage.createMemoryAdapter();
  const adapter = {
    ...base,
    async commit() { throw new Error('disk unavailable'); },
  };
  const raw = validSave();
  g.localStorage.setItem(g.PPM.stateApi.LOCAL_STORAGE_KEY, raw);
  const manager = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    legacyStorage: g.localStorage,
    legacyKey: g.PPM.stateApi.LOCAL_STORAGE_KEY,
    validateText: g.PPM.stateApi.validateSaveText,
    loadText: () => {},
    serializeCurrent: () => raw,
  });

  await assert.rejects(() => manager.initialize());
  assert.equal(g.localStorage.getItem(g.PPM.stateApi.LOCAL_STORAGE_KEY), raw);
  assert.deepEqual(await base.listCareers(), []);
});
