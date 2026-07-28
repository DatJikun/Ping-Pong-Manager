const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('memory adapter implements the career storage contract', async () => {
  const g = boot(2201);
  const adapter = g.PPM.saveStorage.createMemoryAdapter();
  await adapter.open();

  assert.deepEqual(await adapter.listCareers(), []);

  await adapter.commit({
    career: { id: 'career-a', name: 'Alpha', data: '{"season":1}' },
    backup: { id: 'backup-1', careerId: 'career-a', data: '{"season":0}' },
    deleteBackupIds: [],
  });

  assert.equal((await adapter.listCareers()).length, 1);
  assert.equal((await adapter.getCareer('career-a')).name, 'Alpha');
  assert.equal((await adapter.listBackups('career-a')).length, 1);

  await adapter.commit({
    career: { id: 'career-a', name: 'Alpha 2', data: '{"season":2}' },
    backup: { id: 'backup-2', careerId: 'career-a', data: '{"season":1}' },
    deleteBackupIds: ['backup-1'],
  });

  assert.equal((await adapter.getCareer('career-a')).name, 'Alpha 2');
  assert.deepEqual((await adapter.listBackups('career-a')).map(x => x.id), ['backup-2']);

  await adapter.putMeta('activeCareerId', 'career-a');
  assert.equal(await adapter.getMeta('activeCareerId'), 'career-a');

  await adapter.deleteCareer('career-a');
  assert.equal(await adapter.getCareer('career-a'), null);
  assert.deepEqual(await adapter.listBackups('career-a'), []);
});

test('memory adapter returns copies instead of mutable stored references', async () => {
  const g = boot(2202);
  const adapter = g.PPM.saveStorage.createMemoryAdapter();
  await adapter.open();
  const career = { id: 'career-a', name: 'Original', data: '{}' };

  await adapter.commit({ career, backup: null, deleteBackupIds: [] });
  career.name = 'Changed outside';
  const loaded = await adapter.getCareer('career-a');
  loaded.name = 'Changed after read';

  assert.equal((await adapter.getCareer('career-a')).name, 'Original');
});
