const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = fs.readFileSync(path.join(root, 'src/ui/pages.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

test('main menu renders a dynamic career library instead of one ppgame button', () => {
  assert.match(pages, /ui\._careers/);
  assert.match(pages, /continueCareer/);
  assert.match(pages, /showCareerBackups/);
  assert.doesNotMatch(pages, /function savedGameName\(/);
});

test('career actions use the save manager and import creates a separate career', () => {
  assert.match(main, /async function continueCareer/);
  assert.match(main, /async function renameCareer/);
  assert.match(main, /async function deleteCareer/);
  assert.match(main, /async function restoreCareerBackup/);
  assert.match(main, /\.importCareer\(/);
});

test('main menu exposes the in-game guide', () => {
  assert.match(pages, /openGuide\(\)/);
  assert.match(pages, /PRZEWODNIK/);
});

test('main menu shows the public app version', () => {
  assert.match(pages, /appVersionLabel/);
  assert.match(pages, /APP_VERSION/);
});
