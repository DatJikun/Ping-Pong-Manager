// =============================================================================
// tests/economy.test.js — prestige rebalance + result-driven merch.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('prestige reflects recent form with a real floor (L2 never craters to 0)', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  G.teams.find((t) => t.id === G.myTeamId).league = 2;
  G.seasonHistory = [{ position: 12 }, { position: 11 }, { position: 12 }, { position: 10 }, { position: 12 }];
  const low = gp.calcPrestige();
  assert.ok(low >= 25, `perennial-last L2 club keeps a baseline prestige (${low})`);
  G.seasonHistory = [{ position: 1 }, { position: 1 }, { position: 2 }, { position: 1 }, { position: 1 }];
  assert.ok(gp.calcPrestige() > low + 30, 'a dominant club has clearly higher prestige');
});

test('merch income scales with results (good season sells far more)', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  G.infraMerchandising = 3;
  const myL = G.teams.find((t) => t.id === G.myTeamId).league;
  const rivals = G.teams.filter((t) => t.league === myL && t.id !== G.myTeamId);
  // my team top of the table
  G.teams.find((t) => t.id === G.myTeamId).pts = 100;
  rivals.forEach((t) => { t.pts = 10; });
  const top = gp.getMerchIncome();
  // my team bottom of the table
  G.teams.find((t) => t.id === G.myTeamId).pts = 0;
  rivals.forEach((t) => { t.pts = 100; });
  const bottom = gp.getMerchIncome();
  assert.ok(top > bottom * 2, `winning sells much more merch (${top} vs ${bottom})`);
});
