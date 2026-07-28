const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function gameText(season, clubName = `Club ${season}`) {
  return JSON.stringify({
    season,
    matchday: season,
    phase: 'season',
    countryId: 'PL',
    aiDifficulty: 'hard',
    schemaVersion: 20,
    myTeamId: 1,
    teams: [{ id: 1, name: clubName, isPlayer: true }],
    players: [],
  });
}

function makeManager(g, options = {}) {
  const adapter = options.adapter || g.PPM.saveStorage.createMemoryAdapter();
  let loaded = null;
  let current = gameText(99);
  let tick = 1000;
  const manager = g.PPM.saveManagerApi.createSaveManager({
    adapter,
    now: () => ++tick,
    newId: (() => { let id = 0; return prefix => `${prefix}-${++id}`; })(),
    validateText: text => JSON.parse(text),
    loadText: text => { loaded = text; },
    serializeCurrent: () => current,
    onError: options.onError || (() => {}),
    storageEstimate: options.storageEstimate,
  });
  return { manager, adapter, getLoaded: () => loaded, setCurrent: text => { current = text; } };
}

test('manager supports more than five named careers and stable metadata', async () => {
  const g = boot(2301);
  const { manager } = makeManager(g);
  await manager.initialize();

  const ids = [];
  for (let i = 1; i <= 7; i++) {
    const career = await manager.createCareer(gameText(i), `Career ${i}`);
    ids.push(career.id);
  }

  const careers = await manager.listCareers();
  assert.equal(careers.length, 7);
  assert.equal(new Set(ids).size, 7);
  assert.equal(careers.find(x => x.id === ids[6]).summary.clubName, 'Club 7');

  await manager.renameCareer(ids[0], '  Renamed  ');
  assert.equal((await manager.listCareers()).find(x => x.id === ids[0]).name, 'Renamed');

  await manager.deleteCareer(ids[1]);
  assert.equal((await manager.listCareers()).length, 6);
});

test('ordinary autosaves are ordered and coalesce to the latest snapshot', async () => {
  const g = boot(2302);
  const base = g.PPM.saveStorage.createMemoryAdapter();
  let releases = [];
  let delayedOnce = false;
  const delayed = {
    ...base,
    async commit(payload) {
      if (payload.career && payload.career.revision > 1 && !delayedOnce) {
        delayedOnce = true;
        await new Promise(resolve => releases.push(resolve));
      }
      return base.commit(payload);
    },
  };
  const { manager } = makeManager(g, { adapter: delayed });
  await manager.initialize();
  const career = await manager.createCareer(gameText(1), 'Queue');

  assert.equal(manager.requestAutosave(gameText(2)), true);
  manager.requestAutosave(gameText(3));
  manager.requestAutosave(gameText(4));
  await new Promise(resolve => setTimeout(resolve, 0));
  while (releases.length) releases.shift()();
  await manager.flush();

  const stored = await delayed.getCareer(career.id);
  assert.equal(JSON.parse(stored.data).season, 4);
});

test('manager keeps three ordinary checkpoints plus one migration recovery', async () => {
  const g = boot(2303);
  const { manager } = makeManager(g);
  await manager.initialize();
  const career = await manager.createCareer(gameText(1), 'Backups');

  for (let season = 1; season <= 4; season++) {
    await manager.createCheckpoint('matchday', gameText(season));
  }
  await manager.createCheckpoint('migration', gameText(0));

  const backups = await manager.listBackups(career.id);
  assert.equal(backups.filter(x => x.kind !== 'migration').length, 3);
  assert.equal(backups.filter(x => x.kind === 'migration').length, 1);
  assert.deepEqual(
    backups.filter(x => x.kind !== 'migration').map(x => JSON.parse(x.data).season).sort(),
    [2, 3, 4],
  );
});

test('restoring a backup checkpoints displaced state and loads recovered data', async () => {
  const g = boot(2304);
  const ctx = makeManager(g);
  const { manager } = ctx;
  await manager.initialize();
  const career = await manager.createCareer(gameText(5), 'Restore');
  const old = await manager.createCheckpoint('matchday', gameText(2));
  ctx.setCurrent(gameText(5));

  await manager.restoreBackup(career.id, old.id);

  assert.equal(JSON.parse(ctx.getLoaded()).season, 2);
  const backups = await manager.listBackups(career.id);
  assert.ok(backups.some(x => x.kind === 'restore' && JSON.parse(x.data).season === 5));
});

test('storage estimation warns by used space rather than career count', async () => {
  const g = boot(2305);
  const { manager } = makeManager(g, {
    storageEstimate: async () => ({ usage: 90, quota: 100 }),
  });
  await manager.initialize();
  assert.deepEqual(await manager.estimateStorage(), {
    usage: 90,
    quota: 100,
    ratio: 0.9,
    low: true,
  });
});
