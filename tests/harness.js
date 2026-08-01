// =============================================================================
// tests/harness.js — Headless game loader for automated tests
//
// The game is a browser app: every source file is loaded as a <script> tag and
// attaches functions to a shared global scope. This harness reproduces that
// environment inside Node so the simulation can be booted and exercised WITHOUT
// a browser — giving us an automated safety net.
//
// It concatenates the non-UI source files in the same order as index.html and
// runs them once inside a single V8 sandbox (so top-level `const`/`function`
// declarations share one scope, exactly like browser <script> tags). DOM-heavy
// files (shell.js, pages.js, main.js) are intentionally skipped; we only need
// constants + utils + state + gameplay to drive the simulation.
//
// Usage:
//   const { boot } = require('./harness');
//   const g = boot();                 // fresh sandbox
//   const game = g.PPM.gameplay.newGame(0, 'PL');
// =============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// Load order mirrors index.html (UI-only files excluded).
const LOAD_ORDER = [
  'src/data/names.js', // optional 10x name pools (skipped if absent)
  'src/i18n/i18n.js',
  'src/data/constants.js',
  'src/core/utils.js',
  'src/core/save-storage.js',
  'src/core/state.js',
  'src/core/save-manager.js',
  'src/core/gameplay.js',
  'src/ui/rating-stars.js',
  'src/core/gameplay.visuals.js',
  'src/core/gameplay.club-ui.js',
];

// Minimal DOM/browser stubs. The simulation never renders, so these only need
// to exist (not behave) so that load-time code and incidental lookups succeed.
function makeStubElement() {
  let html = '';
  const el = {
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], dataset: {},
    set innerHTML(value) { html = String(value); }, get innerHTML() { return html; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild() {}, removeChild() {}, querySelector() { return null; },
    querySelectorAll() { return []; }, addEventListener() {}, removeEventListener() {},
    click() {}, focus() {}, scrollIntoView() {}, getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 }; },
  };
  return el;
}

function makeStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
}

// Deterministic PRNG (mulberry32) so tests produce stable results run-to-run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds a fresh sandbox, loads the game, and returns the global object.
// Pass a numeric `seed` to make Math.random() deterministic for that boot.
function boot(seed) {
  const elements = new Map();
  const documentStub = {
    __elements: elements,
    getElementById(id) {
      if(!elements.has(id))elements.set(id,makeStubElement());
      return elements.get(id);
    },
    querySelector() { return makeStubElement(); },
    querySelectorAll() { return []; },
    createElement() { return makeStubElement(); },
    addEventListener() {}, removeEventListener() {},
    body: makeStubElement(),
    documentElement: makeStubElement(),
  };

  const sandbox = {
    console,
    Math, Date, JSON, Array, Object, Number, String, Boolean, Map, Set, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    localStorage: makeStorage(),
    document: documentStub,
    navigator: { language: 'pl-PL', userAgent: 'node-harness' },
    location: { href: 'http://localhost/' },
    gsap: new Proxy(function () {}, { get() { return () => ({ kill() {} }); }, apply() { return { kill() {} }; } }),
    alert() {}, confirm() { return true; }, prompt() { return ''; },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  // UI functions live in shell.js / pages.js / main.js, which the harness does
  // NOT load. Gameplay *action* functions (signing, hiring, etc.) call them as
  // bare globals at the end to refresh the screen. Provide no-ops so those
  // actions can be driven headlessly in tests.
  const NOOP = () => {};
  for (const name of [
    'render', 'renderApp', 'updateHeader', 'closeModal', 'openModal', 'toast',
    'go', 'syncNavState', 'setShellMode', 'playClick', 'playPing', 'playPong',
    'applyTheme', 'openSettings', 'saveSettings', 'showPostSeasonGala',
  ]) {
    if (sandbox[name] === undefined) sandbox[name] = NOOP;
  }

  vm.createContext(sandbox);

  if (typeof seed === 'number') {
    const rng = mulberry32(seed);
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = rng;
  }

  for (const rel of LOAD_ORDER) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue; // optional files (names.js)
    const code = fs.readFileSync(abs, 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  return sandbox;
}

module.exports = { boot, LOAD_ORDER };
