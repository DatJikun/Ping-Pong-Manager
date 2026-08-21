const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { boot } = require('./harness');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('injuries cannot drop a club below 3 eligible seniors', () => {
  const g = boot(4201);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const teamId = G.myTeamId;
  const seniors = G.players.filter((p) => p.teamId === teamId && !p.retired && p.role !== 'youth');
  assert.ok(seniors.length >= 4, `need at least 4 seniors, got ${seniors.length}`);

  seniors.forEach((p) => {
    p.injuredFor = 0;
    p.fatigue = 85;
    p._skipNextMatch = false;
  });
  const eligible = seniors.slice(0, 4);
  const eligibleIds = new Set(eligible.map((p) => p.id));
  const before = gp.getEligibleMatchPlayers(teamId).length;
  assert.ok(before >= 4, `expected 4+ eligible before injuries, got ${before}`);

  const origRandom = g.Math.random;
  g.Math.random = () => 0;
  try {
    gp.tryInjuriesForTeam(teamId, eligibleIds);
  } finally {
    g.Math.random = origRandom;
  }

  const after = gp.getEligibleMatchPlayers(teamId).length;
  assert.ok(after >= 3, `eligible seniors must stay >= 3, got ${after}`);
  assert.ok(after <= before, 'injuries should not add players');
});

test('settings normalize missing uiSound to true; false is preserved', () => {
  const g = boot();
  const { loadAppSettings, updateAppSettings, APP_SETTINGS_KEY } = g.PPM.stateApi;
  g.localStorage.removeItem(APP_SETTINGS_KEY);
  assert.equal(loadAppSettings().uiSound, true);
  g.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ matchSpeed: 'fast' }));
  assert.equal(loadAppSettings().uiSound, true);
  updateAppSettings({ uiSound: false });
  assert.equal(loadAppSettings().uiSound, false);
  updateAppSettings({ uiSound: true });
  assert.equal(loadAppSettings().uiSound, true);
});

test('pages.js uses keyboard-friendly tab and wizard buttons', () => {
  const pages = read('src/ui/pages.js');
  assert.match(pages, /type="button" class="rtab/);
  assert.match(pages, /class="ng-team/);
  assert.match(pages, /class="ng-league/);
  assert.doesNotMatch(pages, /<div class="rtab /);
});

test('shell.js exposes activateUi and uiSound handling', () => {
  const shell = read('src/ui/shell.js');
  assert.match(shell, /function activateUi\(/);
  assert.match(shell, /uiSound/);
  assert.match(shell, /window\.PPM\.shell = \{[^}]*activateUi/);
});

test('index.html nav onclick uses activateUi with valid quoted attributes', () => {
  const html = read('index.html');
  assert.match(html, /onclick="activateUi\(\(\)=>go\('dash'\)\)"/);
  assert.match(html, /onclick="activateUi\(\(\)=>go\('squad'\)\)" id="n-squad"/);
  assert.doesNotMatch(html, /activateUi\(\(\)=>go\('[^']+'\)\) data-page=/);
  assert.doesNotMatch(html, /activateUi\(\(\)=>go\('[^']+'\)\) id=/);
});
