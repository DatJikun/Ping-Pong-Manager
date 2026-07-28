// =============================================================================
// tests/persistence.test.js — autosave remains safe when browser storage fails.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const FAILURE_MESSAGE = 'Autosave nie powiódł się — pobierz zapis do pliku w Ustawieniach.';

test('a successful autosave returns true, stores the live ID counter, and clears the failure latch', () => {
  const g = boot(1701);
  g.PPM.gameplay.newGame(0, 'PL');
  g.PPM.ui._pid = 43210;
  g.PPM.ui._saveFailureNotified = true;

  const saved = g.PPM.stateApi.persistGame();
  const persisted = JSON.parse(g.localStorage.getItem(g.PPM.stateApi.LOCAL_STORAGE_KEY));

  assert.equal(saved, true);
  assert.equal(persisted._pid, 43210);
  assert.equal(g.PPM.ui._saveFailureNotified, false);
});

test('a failed autosave preserves the previous save and reports once per failure period', () => {
  const g = boot(1702);
  g.PPM.gameplay.newGame(0, 'PL');
  const storageKey = g.PPM.stateApi.LOCAL_STORAGE_KEY;
  const workingSetItem = g.localStorage.setItem;
  const previousSave = '{"known":"good"}';
  const messages = [];
  g.localStorage.setItem(storageKey, previousSave);
  g.toast = (message) => messages.push(message);

  g.localStorage.setItem = () => {
    const error = new Error('storage full');
    error.name = 'QuotaExceededError';
    throw error;
  };

  assert.doesNotThrow(() => {
    assert.equal(g.PPM.stateApi.persistGame(), false);
    assert.equal(g.PPM.stateApi.persistGame(), false);
  });
  assert.equal(g.localStorage.getItem(storageKey), previousSave);
  assert.deepEqual(messages, [FAILURE_MESSAGE]);

  g.localStorage.setItem = workingSetItem;
  assert.equal(g.PPM.stateApi.persistGame(), true);

  g.localStorage.setItem = () => {
    throw new Error('storage unavailable again');
  };
  assert.equal(g.PPM.stateApi.persistGame(), false);
  assert.deepEqual(messages, [FAILURE_MESSAGE, FAILURE_MESSAGE]);
});
