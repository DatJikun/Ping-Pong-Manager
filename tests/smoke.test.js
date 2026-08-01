// =============================================================================
// tests/smoke.test.js — High-level safety net for the game.
//
// These tests boot the REAL game headlessly (see harness.js) and check that the
// core stays internally consistent. They are intentionally about *invariants*
// (things that must always be true) rather than exact numbers, so they keep
// passing as balance is tuned but FAIL LOUDLY if a refactor breaks the engine.
//
// Run with:  npm test
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// ── New game is well-formed ──────────────────────────────────────────────────
test('newGame builds a complete, consistent world', () => {
  const g = boot(12345);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;

  assert.ok(G, 'store.G should be set');
  assert.equal(G.season, 1);
  assert.equal(G.phase, 'preseason');
  assert.equal(G.teams.filter((t) => t.league === 1).length, 12, 'League 1 has 12 teams');
  assert.equal(G.teams.filter((t) => t.league === 2).length, 12, 'League 2 has 12 teams');
  assert.equal(G.teams.filter((t) => t.isPlayer).length, 1, 'exactly one player team');

  for (const p of G.players) {
    assert.ok(['fh', 'bh', 'srv', 'ret', 'foot', 'men'].every((k) => finite(p[k])),
      `player ${p.name} has finite stats`);
    assert.ok(finite(g.PPM.gameplay.ovr(p)), `player ${p.name} has finite OVR`);
    assert.ok(p.age >= 14 && p.age <= 45, `player ${p.name} age ${p.age} in range`);
  }
  for (const t of G.teams) {
    assert.ok(finite(t.budget), `team ${t.name} has finite budget`);
  }
});

// ── Single-match engine produces valid table-tennis results ──────────────────
test('simIndividual always returns a decided best-of-5 with valid set scores', () => {
  const g = boot(999);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const pool = G.players.filter((p) => !p.retired);

  for (let i = 0; i < 400; i++) {
    const a = pool[Math.floor(g.Math.random() * pool.length)];
    const b = pool[Math.floor(g.Math.random() * pool.length)];
    const r = gp.simIndividual(a, b, null, null);
    assert.ok((r.hs === 3) !== (r.as === 3), `exactly one player reaches 3 sets (${r.hs}:${r.as})`);
    assert.ok(r.hs <= 3 && r.as <= 3, `set count valid ${r.hs}:${r.as}`);
    for (const s of r.setScores) {
      const hi = Math.max(s.home, s.away), lo = Math.min(s.home, s.away);
      assert.ok(hi >= 11, `set won with >=11 points (${s.home}:${s.away})`);
      assert.ok(hi - lo >= 2, `set won by >=2 margin (${s.home}:${s.away})`);
      assert.ok(finite(s.home) && finite(s.away), 'set scores finite');
    }
  }
});

// ── The better player wins more often (sanity of the rating curve) ───────────
test('a much stronger player beats a much weaker one most of the time', () => {
  const g = boot(7);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const sorted = [...G.players].sort((a, b) => gp.ovr(b) - gp.ovr(a));
  const strong = sorted[0];
  const weak = sorted[sorted.length - 1];

  let strongWins = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const r = gp.simIndividual(strong, weak, null, null);
    if (r.homeWin) strongWins++;
  }
  assert.ok(strongWins / N > 0.7,
    `top player (OVR ${gp.ovr(strong)}) should beat bottom player (OVR ${gp.ovr(weak)}) >70% — got ${strongWins}/${N}`);
});

// ── Team match invariants ────────────────────────────────────────────────────
test('simTeamMatch returns a valid team result', () => {
  const g = boot(2024);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;

  for (let i = 0; i < 60; i++) {
    const fixtures = G.scheduleL1[i % G.scheduleL1.length];
    const f = fixtures[0];
    const r = gp.simTeamMatch(f.home, f.away, false);
    assert.ok(finite(r.homePoints) && finite(r.awayPoints), 'match points finite');
    // Superliga protocol: first to 3 match points → 3 to 5 games (doubles as G5).
    assert.ok(r.matchups.length >= 3 && r.matchups.length <= 5, 'match has 3-5 games');
    assert.equal(Math.max(r.hTeamW, r.aTeamW), 3, 'winner reaches exactly 3 match points');
    assert.equal(r.isDraw, false, 'the protocol cannot produce draws');
    if (r.matchups.length === 5) assert.equal(r.matchups[4].type, 'double', 'game 5 is the double');
    r.matchups.slice(0, 4).forEach((m) => assert.equal(m.type, 'single', 'games 1-4 are singles'));
    assert.equal(typeof r.homeWin, 'boolean');
  }
});

// ── Full regular season stays internally consistent ──────────────────────────
test('simulating a full league season keeps the table consistent', () => {
  const g = boot(54321);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;

  const playLeague = (schedule) => {
    for (const round of schedule) {
      for (const f of round) {
        const r = gp.simTeamMatch(f.home, f.away, false);
        gp.applyResult(r);
      }
      gp.tickInjuries();
    }
  };
  playLeague(G.scheduleL1);
  playLeague(G.scheduleL2);

  for (const league of [1, 2]) {
    const teams = G.teams.filter((t) => t.league === league);
    const games = teams.reduce((s, t) => s + t.w + t.l + t.d, 0);
    // Each team plays 22 rounds; total games counted twice (once per team).
    assert.equal(games, teams.length * 22, `league ${league}: every team played 22 rounds`);
    for (const t of teams) {
      assert.ok(finite(t.pts) && t.pts >= 0, `team ${t.name} has valid points`);
      assert.ok(finite(t.budget), `team ${t.name} budget finite after season`);
      // Superliga scoring: wins earn 2-3 pts, a 2:3 loss earns 1 → bounds check.
      assert.ok(t.pts >= t.w * 2, `team ${t.name}: at least 2 pts per win`);
      assert.ok(t.pts <= t.w * 3 + t.l * 1 + t.d, `team ${t.name}: at most 3/win + 1/close-loss`);
      assert.equal(t.d, 0, `team ${t.name}: no draws under first-to-3`);
    }
    // Cross-check the table against the stored results' own scoring.
    const expected = new Map(teams.map((t) => [t.id, 0]));
    G.results.filter((r) => r.season === G.season).forEach((r) => {
      if (!expected.has(r.homeId)) return;
      const wl = r.homeWin ? r.aTeamW : r.hTeamW;
      const wPts = wl >= 2 ? 2 : 3, lPts = wl >= 2 ? 1 : 0;
      expected.set(r.homeId, expected.get(r.homeId) + (r.homeWin ? wPts : lPts));
      expected.set(r.awayId, expected.get(r.awayId) + (r.homeWin ? lPts : wPts));
    });
    for (const t of teams) assert.equal(t.pts, expected.get(t.id), `team ${t.name} pts match per-result scoring`);
  }
});

// ── Determinism: same seed → same outcome ────────────────────────────────────
test('same seed produces identical results (reproducible for debugging)', () => {
  const run = () => {
    const g = boot(424242);
    g.PPM.gameplay.newGame(0, 'PL');
    const G = g.PPM.state.G;
    const r = g.PPM.gameplay.simTeamMatch(G.scheduleL1[0][0].home, G.scheduleL1[0][0].away, false);
    return r.score + '|' + r.homePoints + '|' + r.awayPoints;
  };
  assert.equal(run(), run(), 'identical seed must yield identical match');
});
