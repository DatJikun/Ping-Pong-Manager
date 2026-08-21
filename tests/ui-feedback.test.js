const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function loadShell(g, listeners = new Map()) {
  g.document.addEventListener = (type, listener) => {
    const entries = listeners.get(type) || [];
    entries.push(listener);
    listeners.set(type, entries);
  };
  vm.runInContext(read('src/ui/shell.js'), g, { filename: 'src/ui/shell.js' });
  return listeners;
}

function installAudio(g) {
  const contexts = [];
  class FakeAudioContext {
    constructor() {
      this.currentTime = 1;
      this.state = 'suspended';
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      this.resumeCalls = 0;
      contexts.push(this);
    }
    resume() { this.resumeCalls += 1; this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
      const oscillator = {
        frequency: { value: 0 }, type: '', started: null, stopped: null,
        connect() {}, start(at) { this.started = at; }, stop(at) { this.stopped = at; },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      const gain = {
        connect() {}, gain: {
          initial: null, ramp: null,
          setValueAtTime(value, at) { this.initial = { value, at }; },
          exponentialRampToValueAtTime(value, at) { this.ramp = { value, at }; },
        },
      };
      this.gains.push(gain);
      return gain;
    }
  }
  g.AudioContext = FakeAudioContext;
  return contexts;
}

function interactiveTarget() {
  const classes = new Set();
  const target = {
    disabled: false,
    clickCalls: 0,
    classList: {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
    },
    closest(selector) { return /button/.test(selector) ? this : null; },
    click() { this.clickCalls += 1; },
  };
  return target;
}

test('uiSound defaults on for old settings and preserves an explicit false', () => {
  const g = boot(4101);
  const state = g.PPM.stateApi;
  assert.equal(state.DEFAULT_APP_SETTINGS.uiSound, true);
  assert.equal(state.loadAppSettings().uiSound, true);

  g.localStorage.setItem('ppgame_app_settings', JSON.stringify({ locale: 'pl', matchSpeed: 'fast' }));
  assert.equal(state.loadAppSettings().uiSound, true, 'old settings gain the safe default');

  state.updateAppSettings({ uiSound: false });
  assert.equal(state.loadAppSettings().uiSound, false, 'the player choice survives persistence');
});

test('click sound is low, short, quiet, resumed and throttled', () => {
  const g = boot(4102);
  const contexts = installAudio(g);
  let now = 1000;
  g.performance = { now: () => now };
  loadShell(g);

  g.PPM.shell.playClick();
  g.PPM.shell.playClick();
  assert.equal(contexts.length, 1);
  const ctx = contexts[0];
  assert.equal(ctx.resumeCalls, 1);
  assert.equal(ctx.oscillators.length, 1, 'rapid duplicate click is throttled');
  assert.ok(ctx.oscillators[0].frequency.value >= 240 && ctx.oscillators[0].frequency.value <= 260);
  assert.ok(ctx.oscillators[0].stopped - ctx.currentTime >= 0.04);
  assert.ok(ctx.oscillators[0].stopped - ctx.currentTime <= 0.05);
  assert.equal(ctx.gains[0].gain.initial.value, 0.03);

  now += 65;
  g.PPM.shell.playClick();
  assert.equal(ctx.oscillators.length, 2, 'sound returns after the throttle window');
});

test('click sound is silent when disabled and safe without AudioContext', () => {
  const muted = boot(4103);
  muted.PPM.stateApi.updateAppSettings({ uiSound: false });
  const contexts = installAudio(muted);
  loadShell(muted);
  assert.doesNotThrow(() => muted.PPM.shell.playClick());
  assert.equal(contexts.length, 0);

  const unsupported = boot(4104);
  delete unsupported.AudioContext;
  delete unsupported.webkitAudioContext;
  loadShell(unsupported);
  assert.doesNotThrow(() => unsupported.PPM.shell.playClick());
});

test('one delegated click listener gives immediate feedback without hijacking the action', async () => {
  const g = boot(4105);
  const contexts = installAudio(g);
  g.performance = { now: () => 1000 };
  g.matchMedia = () => ({ matches: true });
  const listeners = loadShell(g);
  const clickListeners = listeners.get('click') || [];
  assert.equal(clickListeners.length, 1);

  const target = interactiveTarget();
  let prevented = 0;
  clickListeners[0]({ target, preventDefault() { prevented += 1; } });
  assert.equal(contexts[0].oscillators.length, 1, 'sound happens in the click handler');
  assert.equal(prevented, 0);
  assert.equal(target.clickCalls, 0);
  assert.equal(target.classList.contains('ui-pressed'), true, 'press feedback is immediate');
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(target.classList.contains('ui-pressed'), false, 'press class lasts only 60 ms');
});

test('activateUi waits 60 ms and merges rapid choices into the last one', async () => {
  const g = boot(4106);
  loadShell(g);
  const calls = [];
  g.PPM.shell.activateUi(() => calls.push('first'));
  g.PPM.shell.activateUi(() => calls.push('last'));
  assert.deepEqual(calls, []);
  await new Promise(resolve => setTimeout(resolve, 45));
  assert.deepEqual(calls, []);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(calls, ['last']);
});

test('tabs and wizard choices are real buttons while critical actions stay immediate', () => {
  const g = boot(4107);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const squad = g.PPM.pages.pageSquad();
  assert.match(squad, /<button[^>]+class="rtab/);
  assert.doesNotMatch(squad, /<div[^>]+class="rtab(?:\s|")/);

  g.PPM.ui._startView = 'newgame';
  for (const step of [0, 1, 2]) {
    g.PPM.ui._ngStep = step;
    g.PPM.pages.renderStart();
    const wizard = g.document.getElementById('content').innerHTML;
    assert.match(wizard, /<button[^>]+type="button"[^>]+class="(?:ng-country|ng-team|btn)/);
  }

  const pages = read('src/ui/pages.js');
  const shell = read('src/ui/shell.js');
  for (const action of ['startGame()', 'startSeason()', 'runMatchday()', 'autoPlaySeason()', 'closeModal()']) {
    const escaped = action.replace(/[()]/g, '\\$&');
    assert.doesNotMatch(pages + shell, new RegExp(`activateUi\\([^\\n]{0,100}${escaped}`), `${action} must stay immediate`);
  }
  assert.doesNotMatch(shell, /activateUi\([^\n]*(?:saveGame|\.click\(\)|closeModal|backToMainMenu)/);
});

test('pressed styling is brief and remains visible with reduced motion', () => {
  const css = read('styles/main.css');
  assert.match(css, /\.ui-pressed[^}]*transform:\s*translateY\(1px\)\s*scale\(\.985\)/s);
  assert.match(css, /\.ui-pressed[^}]*filter:\s*brightness\([^)]*\)/s);
  assert.match(css, /transition[^;]*(?:45|50|55)ms/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.ui-pressed[^}]*transform:\s*none/);
});
