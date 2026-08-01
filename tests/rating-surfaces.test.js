const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');

function bootWithPages(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });
  return g;
}

function marketRow(html, name) {
  const start = html.indexOf(`<span class="pname">${name}</span>`);
  assert.notEqual(start, -1, `${name} is rendered in the market`);
  const rowStart = html.lastIndexOf('<tr', start);
  const rowEnd = html.indexOf('</tr>', start);
  return html.slice(rowStart, rowEnd + 5);
}

function setPlayerOvr(player, value) {
  for (const stat of ['fh', 'bh', 'srv', 'ret', 'foot', 'men']) player[stat] = value;
}

function setPlayerCurrentOvr60(player) {
  setPlayerOvr(player, 59);
  player.fh = 63;
}

test('transfer rows show current rating with a non-disclosing peak outline', () => {
  const g = bootWithPages(4201);
  const G = g.PPM.state.G;
  const player = G.players.find(p => p.teamId !== G.myTeamId && p.role !== 'youth');
  const staff = G.staff.find(s => s.teamId !== null && s.teamId !== G.myTeamId && s.type === 'coach');
  assert.ok(player, 'controlled player fixture exists');
  assert.ok(staff, 'controlled staff fixture exists');

  player.name = 'Current Player';
  player.teamId = null;
  player.equipment = null;
  player.ceiling = 95;
  setPlayerOvr(player, 59);
  G.transferMarket = [{ playerId: player.id, type: 'transfer', fee: 0 }];
  staff.name = 'Current Staff';
  staff.age = staff.peakAge = 52;
  staff.tactics = staff.training = staff.motivation = staff.synergy = 54;
  staff.ceiling = 91;

  g.PPM.ui.marketTypeFilter = 'player';
  const playerRow = marketRow(g.PPM.pages.pageMarket(), player.name);
  g.PPM.ui.marketTypeFilter = 'coach';
  const staffRow = marketRow(g.PPM.pages.pageMarket(), staff.name);

  for (const row of [playerRow, staffRow]) {
    assert.match(row, /rating-stars--compact/);
    assert.equal((row.match(/rating-stars__ovr/g) || []).length, 1);
    const visibleText = row.replace(/<[^>]*>/g, ' ');
    assert.doesNotMatch(visibleText, /\bPeak\b|peak OVR|95|91/i);
    const ratingRoot = row.match(/<span class="rating-stars[^>]*>/)?.[0] || '';
    assert.doesNotMatch(ratingRoot, /\btitle=/);
    const aria = ratingRoot.match(/aria-label="([^"]*)"/)?.[1] || '';
    assert.doesNotMatch(aria, /95|91/);
  }
});

test('transfer market minimum stars filters on current OVR, not peak OVR', () => {
  const g = bootWithPages(4202);
  const G = g.PPM.state.G;
  const player = G.players.find(p => p.teamId !== G.myTeamId && p.role !== 'youth');
  assert.ok(player, 'controlled player fixture exists');

  player.name = 'Current Threshold Player';
  player.teamId = null;
  player.equipment = null;
  player.ceiling = 95;
  setPlayerOvr(player, 59);
  assert.equal(g.PPM.gameplay.ovr(player), 59);
  G.transferMarket = [{ playerId: player.id, type: 'transfer', fee: 0 }];
  g.PPM.ui.marketTypeFilter = 'player';
  g.PPM.ui.mktStars = 3;

  assert.doesNotMatch(g.PPM.pages.pageMarket(), /Current Threshold Player/);
  player.equipment = null;
  setPlayerCurrentOvr60(player);
  assert.equal(g.PPM.gameplay.ovr(player), 60);
  assert.match(g.PPM.pages.pageMarket(), /Current Threshold Player/);
  player.equipment = null;
  setPlayerOvr(player, 59);
  player.ceiling = 100;
  assert.doesNotMatch(g.PPM.pages.pageMarket(), /Current Threshold Player/);
});
