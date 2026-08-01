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

test('schema 21 physios migrate once onto the shared staff scale without changing identity', () => {
  const g = boot(2404);
  const api = g.PPM.stateApi;
  const physio = (id, teamId, injReduction, recovery, prevention) => ({
    id, type: 'physio', name: `Legacy Physio ${id}`, nationality: 'PL',
    age: 45, peakAge: 55, teamId, contractYears: 2, salary: 4321,
    injReduction, recovery, prevention, ceiling: 60, careerHistory: [{ teamId, startSeason: 1 }],
  });
  const raw = JSON.parse(validSave({
    schemaVersion: 21,
    staff: [physio(8101, 1, 5, 5, 5)],
    staffPool: [physio(8102, null, 30, 30, 25), physio(8103, null, 60, 60, 50)],
    scoutPool: [],
    prDirectorPool: [],
  }));

  const migrated = api.migrateLoadedGame(raw);
  const all = [...migrated.staff, ...migrated.staffPool].sort((a, b) => a.id - b.id);
  assert.equal(api.SAVE_SCHEMA_VERSION, 24);
  assert.deepEqual(all.map((staff) => ({
    id: staff.id, teamId: staff.teamId, contractYears: staff.contractYears,
    injReduction: staff.injReduction, recovery: staff.recovery, prevention: staff.prevention,
  })), [
    { id: 8101, teamId: 1, contractYears: 2, injReduction: 10, recovery: 10, prevention: 10 },
    { id: 8102, teamId: null, contractYears: 2, injReduction: 49, recovery: 49, prevention: 48 },
    { id: 8103, teamId: null, contractYears: 2, injReduction: 96, recovery: 96, prevention: 96 },
  ]);
  assert.equal(all[0].salary, 4321, 'employed physio contract is untouched');
  assert.deepEqual(all[0].careerHistory, [{ teamId: 1, startSeason: 1 }], 'tenure history is untouched');

  const once = JSON.stringify(all.map((staff) => [staff.id, staff.injReduction, staff.recovery, staff.prevention]));
  api.migrateLoadedGame(migrated);
  const twice = JSON.stringify([...migrated.staff, ...migrated.staffPool]
    .sort((a, b) => a.id - b.id)
    .map((staff) => [staff.id, staff.injReduction, staff.recovery, staff.prevention]));
  assert.equal(twice, once, 'loading the migrated save again does not rebase ratings twice');
});

test('migration drops unanswered decisions from past seasons but keeps the current season', () => {
  const g = boot(2405);
  const api = g.PPM.stateApi;
  const decision = (id, season) => ({
    id, season, matchday: 2, type: 'decision', read: false, answered: false,
    decision: { kind: 'reserveRequest', playerId: id },
  });
  const raw = JSON.parse(validSave({
    schemaVersion: 22,
    season: 6,
    inbox: [decision(1, 4), decision(2, 6), { id: 3, season: 4, type: 'info', read: true }],
  }));

  const migrated = api.migrateLoadedGame(raw);
  assert.deepEqual(migrated.inbox.map((mail) => mail.id), [2, 3]);
});

test('schema 23 starter and reserve roles migrate to one ordered senior squad', () => {
  const g = boot(2406);
  const api = g.PPM.stateApi;
  const senior = (id, role, boardOrder, teamId = 1) => ({
    id,
    name: `Legacy Player ${id}`,
    nationality: 'PL',
    age: 25,
    peakAge: 28,
    teamId,
    role,
    boardOrder,
    contractYears: 2,
    loanedOut: false,
    retired: false,
    isYouth: false,
    preferredRole: role === 'reserve' ? 'rotation' : 'starter',
    clubHistory: [{ teamId: 1, startSeason: 1 }],
    traits: [],
    fh: 60,
    bh: 60,
    srv: 60,
    ret: 60,
    foot: 60,
    men: 60,
  });
  const starterA = senior(9101, 'starter', 0);
  const starterB = senior(9102, 'starter', 1);
  const starterC = senior(9103, 'starter', 2);
  const starterD = senior(9104, 'starter', 3);
  const reserveA = senior(9105, 'reserve', null);
  const loaned = senior(9106, 'reserve', null, 2);
  loaned.loanedOut = true;
  const originalHistory = JSON.stringify(starterA.clubHistory);
  const raw = JSON.parse(validSave({
    schemaVersion: 23,
    customDatabase: { name: 'Migration fixture' },
    teams: [
      { id: 1, name: 'Legacy Club', isPlayer: true, league: 1 },
      { id: 2, name: 'Borrower', isPlayer: false, league: 2 },
    ],
    players: [reserveA, starterC, starterA, starterD, loaned, starterB],
    loans: [{
      playerId: loaned.id,
      fromTeamId: 1,
      toTeamId: 2,
      seasons: 1,
      returned: false,
      originalRole: 'reserve',
      wageShare: 0.5,
    }],
  }));

  const migrated = api.migrateLoadedGame(raw);
  assert.equal(api.SAVE_SCHEMA_VERSION, 24);
  assert.ok(migrated.players.filter((player) => player.role !== 'youth')
    .every((player) => player.role === 'senior'));
  assert.deepEqual({ ...migrated.lastMatchSelection }, {
    base: [starterA.id, starterB.id, starterC.id],
    reserves: [starterD.id, reserveA.id],
  });
  assert.equal(migrated.players.find((player) => player.id === loaned.id).loanedOut, true);
  assert.equal(JSON.stringify(migrated.players.find((player) => player.id === starterA.id).clubHistory), originalHistory);
  assert.equal(migrated.players.find((player) => player.id === reserveA.id).preferredRole, 'rotation');

  const once = JSON.stringify({ players: migrated.players, selection: migrated.lastMatchSelection });
  api.migrateLoadedGame(migrated);
  assert.equal(JSON.stringify({ players: migrated.players, selection: migrated.lastMatchSelection }), once,
    'unified roster migration is idempotent');
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
