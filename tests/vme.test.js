// =============================================================================
// tests/vme.test.js — Match screen (renderVME) HTML output.
//
// renderVME() returns an HTML string (no DOM), so we can assert on it directly.
// Guards the playtest fixes: visible names, readable set pills, micro-stats only
// after a duel ends, no duplicate club names, and a live (moving) initiative bar.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function setup(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const f = G.scheduleL1[0][0];
  const home = G.teams.find((t) => t.id === f.home);
  const away = G.teams.find((t) => t.id === f.away);
  const r = gp.simTeamMatch(home.id, away.id, false);
  return { g, gp, home, away, r };
}

test('player names are rendered with an explicit (visible) colour', () => {
  const { gp, home, away, r } = setup(7);
  const hp = gp.getMatchStarters(home.id)[1];
  const html = gp.renderVME(home, away, r.matchups, 1, 1, 0, false, { home: 3, away: 5, setIndex: 1 });
  assert.ok(html.includes(hp.name), 'home player name present in HTML');
  // the name slot carries an explicit dark colour so it is not invisible on the
  // hard-coded light card in dark theme
  assert.ok(html.includes(`color:#241a12">${hp.name}</div>`), 'name has explicit colour');
});

test('no duplicate tiny club names under the initiative bar', () => {
  const { gp, home, away, r } = setup(7);
  const html = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 1, away: 0, setIndex: 0 });
  assert.ok(!html.includes(`<span>${home.name}</span>`), 'home club name not duplicated as bare span');
  assert.ok(!html.includes(`<span>${away.name}</span>`), 'away club name not duplicated as bare span');
});

test('micro-stats are hidden mid-duel and shown once the duel ends', () => {
  const { gp, home, away, r } = setup(7);
  const total = r.matchups[0].setScores.length;
  const grid = 'repeat(auto-fit,minmax(110px,1fr))';

  const mid = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 4, away: 6, setIndex: 1 });
  assert.ok(!mid.includes(grid), 'micro grid hidden while the duel is in progress');

  const done = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 0, away: 0, setIndex: total });
  assert.ok(done.includes(grid), 'micro grid shown after the duel is finished');
});

test('completed-set pills carry a set number and a readable win/loss colour', () => {
  const { gp, home, away, r } = setup(7);
  const total = r.matchups[0].setScores.length;
  const html = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 0, away: 0, setIndex: total });
  assert.ok(html.includes('S1 '), 'first set pill labelled S1');
  // White text on a green (won) / red (lost) background — high contrast, owner design.
  assert.ok(html.includes('color:#fff;font-weight:800'), 'set pill text has explicit high-contrast colour');
  assert.ok(/background:var\(--(g|r)\);color:#fff/.test(html), 'set pill is colour-coded won (green) / lost (red)');
});

test('initiative bar reflects the live situation (not static)', () => {
  const { gp, home, away, r } = setup(7);
  const width = (html) => Number((html.match(/vme-mom-fill" style="width:(\d+)%/) || [])[1]);
  const homeLeading = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 9, away: 2, setIndex: 0 });
  const awayLeading = gp.renderVME(home, away, r.matchups, 0, 0, 0, false, { home: 2, away: 9, setIndex: 0 });
  assert.ok(width(homeLeading) > width(awayLeading),
    `home-leading initiative (${width(homeLeading)}%) should exceed away-leading (${width(awayLeading)}%)`);
});
