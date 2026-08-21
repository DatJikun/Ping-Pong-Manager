const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('path');
const { boot } = require('./harness');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('dashboard and squad show player star ratings next to OVR', () => {
  const pages = read('src/ui/pages.js');
  assert.match(pages, /function pageDash[\s\S]*starsHtml\(ovrStars\(ovr\(p\)\)\)/);
  assert.match(pages, /function squadCard[\s\S]*starsHtml\(ovrStars\(o\)\)/);
  assert.match(pages, /starsHtml\(ovrStars\(teamOvr/);
});

test('new-game club cards scale names with crests and stagger in', () => {
  const pages = read('src/ui/pages.js');
  const css = read('styles/main.css');
  assert.match(pages, /class="ng-team-name"/);
  assert.match(pages, /class="ng-team-budget"/);
  assert.match(pages, /pick-grid/);
  assert.match(css, /@keyframes cardEnter/);
  assert.match(css, /\.ng-team-name\{[^}]*font-size:22px/);
  assert.match(css, /\.country-name\{[^}]*font-size:28px/);
});

test('Superliga squad order maps 4 club slots onto 3 match tables + R1', () => {
  const pages = read('src/ui/pages.js');
  const gameplay = read('src/core/gameplay.js');
  assert.match(pages, /R1 · od G4/);
  assert.match(pages, /nie ma czwartego stołu meczowego/);
  assert.match(gameplay, /czwarty z kolejności składu wchodzi jako <b>R1<\/b>/);
  const g = boot(4411);
  g.PPM.gameplay.newGame(0, 'PL');
  const fmt = g.PPM.gameplay.getLeagueFormat();
  assert.equal(fmt.protocol, 'superliga');
  assert.equal(g.PPM.gameplay.autoNomination(g.PPM.state.G.myTeamId).base.length, 3);
});
