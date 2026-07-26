// =============================================================================
// tests/principal.test.js — Team Principals (Layer 2): each AI club has a GM with
// a strategy + competence and a lifecycle (generated, ages, fired/retired,
// re-hired from a free-agent pool). Strategy fits the club's traits.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const STRATS = ['youth', 'winnow', 'frugal', 'gambler', 'builder', 'dealer'];

test('every AI club starts with a valid principal; the player is their own', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  for (const t of G.teams.filter((x) => !x.isPlayer)) {
    assert.ok(t.principal, `${t.name} has a principal`);
    assert.ok(STRATS.includes(t.principal.strategy), 'valid strategy');
    assert.ok(t.principal.competence >= 30 && t.principal.competence <= 95, 'competence in range');
    assert.ok(t.principal.name && t.principal.age, 'named + aged');
  }
});

test('the youth-only challenge club gets a compatible principal', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const ch = g.PPM.state.G.teams.find((t) => t.name === 'Akademia Orłów');
  assert.ok(['youth', 'frugal', 'builder'].includes(ch.principal.strategy),
    `challenge club principal fits youthOnly (got ${ch.principal.strategy})`);
});

test('principals have a lifecycle: they change and the pool stays stocked', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const reset = () => { for (const t of G().teams) { t.w = t.l = t.d = t.pts = t.gf = t.ga = 0; t.pointsWon = t.pointsLost = 0; } };
  const seen = {};
  G().teams.filter((t) => !t.isPlayer).forEach((t) => { seen[t.id] = t.principal.id; });
  let changes = 0;
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
    G().teams.filter((t) => !t.isPlayer).forEach((t) => { if (t.principal && seen[t.id] !== t.principal.id) { changes++; seen[t.id] = t.principal.id; } });
  }
  assert.ok(changes >= 4, `principals get fired/retired and replaced over time: ${changes}`);
  assert.ok(G().principalPool.length >= 4, `the free-agent pool stays stocked: ${G().principalPool.length}`);
  // every club still has a principal (no orphans after churn)
  assert.ok(G().teams.filter((t) => !t.isPlayer).every((t) => t.principal), 'no club left without a principal');
});
