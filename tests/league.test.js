// =============================================================================
// tests/league.test.js — emergent league strength (budget ↔ OVR coupling).
//
// There is NO league multiplier: the same budget buys the same squad anywhere.
// League 1 is stronger only because its clubs are richer. So the test asserts the
// coupling (more budget ⇒ stronger), the resulting L1≫L2 gap, and a believable
// overlap for promotion/relegation churn.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('budget→strength is monotonic and league-agnostic', () => {
  const g = boot(1);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const f = gp.leagueStrengthTopForBudget;
  assert.ok(f(60000) < f(150000) && f(150000) < f(250000) && f(250000) < f(492000), 'more budget ⇒ higher target');
  // convex wages ⇒ €100k buys MORE OVR at the bottom than at the top
  assert.ok((f(160000) - f(60000)) > (f(492000) - f(392000)), 'diminishing OVR-per-euro at the top');
});

test('League 1 is clearly stronger than League 2, purely from budget', () => {
  const g = boot(7);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const avg = (l) => {
    const ts = G.teams.filter((t) => t.league === l);
    return ts.reduce((s, t) => s + gp.teamOvr(t.id), 0) / ts.length;
  };
  assert.ok(avg(1) - avg(2) >= 6, `L1 avg should clearly exceed L2 (got ${avg(1).toFixed(0)} vs ${avg(2).toFixed(0)})`);
});

test('leagues stay differentiated and churn over many seasons (AI finances)', () => {
  const g = boot(1234);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const reset = () => { for (const t of G().teams) { t.w = t.l = t.d = t.pts = t.gf = t.ga = 0; t.pointsWon = t.pointsLost = 0; } };
  const avg = (l) => { const ts = G().teams.filter((t) => t.league === l); return ts.reduce((s, t) => s + gp.teamOvr(t.id), 0) / ts.length; };
  const prev = {};
  G().teams.forEach((t) => { prev[t.id] = t.league; });
  let moves = 0;
  const everL1 = new Set();
  // 8 seasons keeps the suite fast; exact magnitudes are verified by tests/stress.js.
  for (let s = 0; s < 8; s++) {
    reset();
    const rounds = G().scheduleL1.length;
    for (let md = 0; md < rounds; md++) {
      G().matchday = md;
      for (const sch of [G().scheduleL1, G().scheduleL2]) for (const f of (sch[md] || [])) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));
    }
    G().phase = 'transfer';
    gp.doPromotionRelegation();
    gp.endSeason();
    G().phase = 'pre';
    G().teams.forEach((t) => { if (prev[t.id] !== t.league) moves++; prev[t.id] = t.league; if (t.league === 1) everL1.add(t.id); });
  }
  assert.ok(avg(1) - avg(2) >= 2, `L1 stays above L2, no collapse (${avg(1).toFixed(0)} vs ${avg(2).toFixed(0)})`);
  assert.ok(avg(1) >= 68, `L1 did not deflate badly (${avg(1).toFixed(0)})`);
  assert.ok(moves >= 8, `clubs move between leagues (promotion/relegation churn): ${moves}`);
  // Anti-pyramid: more than the initial 12 clubs reach L1 → hierarchy is not frozen.
  assert.ok(everL1.size >= 13, `the hierarchy is alive, not a fixed pyramid: ${everL1.size} distinct clubs reached L1`);
});

test('richer clubs are stronger and there is an overlap zone for churn', () => {
  const g = boot(7);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const byBudget = [...G.teams].sort((a, b) => b.budget - a.budget);
  assert.ok(gp.teamOvr(byBudget[0].id) > gp.teamOvr(byBudget[byBudget.length - 1].id), 'richest > poorest');
  const l1 = G.teams.filter((t) => t.league === 1).map((t) => gp.teamOvr(t.id));
  const l2 = G.teams.filter((t) => t.league === 2).map((t) => gp.teamOvr(t.id));
  const weakestL1 = Math.min(...l1), strongestL2 = Math.max(...l2);
  // overlap-ish: a strong L2 club should be within striking distance of a weak L1
  assert.ok(weakestL1 - strongestL2 <= 8, 'promotion/relegation overlap is believable');
});
