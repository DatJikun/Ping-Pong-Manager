// =============================================================================
// tests/scout-reports.test.js — a scouting report must always point at somebody.
//
// A scout mission costs money and returns a generated player who is pushed into
// the world as a free agent. The report on the scouting screen is a POINTER to
// him (`realId`), and the population cap culls surplus free agents every season.
// Nothing connected the two, so the manager could pay for a mission and find the
// player quietly removed from under his own report — which then sat on the
// screen forever, clickable, doing nothing (`scoutSign` → `openNegotiate` on a
// player who no longer exists → silent return).
//
// Two rules now: a scouted player is not "surplus" and survives the cap, and a
// report whose player is genuinely gone is cleared instead of left dangling.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');
const { checkWorld } = require('./lib/invariants');

// Employs a scout and runs one mission to completion.
function scoutOnce(g, region = 'Mazowsze') {
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const scout = G.scoutPool.find((s) => s.type === 'scout');
  scout.teamId = G.myTeamId; scout.hired = true; scout.contractYears = 3;
  G.staff.push(scout);
  G.scoutMissions.push({ scoutId: scout.id, region, startMatchday: 0, duration: 0, done: false, cost: 0 });
  G.matchday = 5;
  gp.checkScoutReturns();
  return G.scoutResults.slice();
}

// Floods the world with surplus free agents so the population cap has to cull.
function floodFreeAgents(g, n = 200) {
  const G = g.PPM.state.G;
  for (let i = 0; i < n; i++) {
    const p = g.PPM.gameplay.genPlayer(null, 26, 'PL');
    p.teamId = null; p.contractYears = 0;
    G.players.push(p);
  }
}

test('a scouted player survives the population cap', () => {
  const g = boot(5501);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const reports = scoutOnce(g);
  assert.ok(reports.length > 0, 'the mission returned a report');
  const scoutedIds = reports.map((r) => r.realId);

  floodFreeAgents(g);
  g.PPM.gameplay.pruneCareerData();

  const live = new Set(G().players.map((p) => p.id));
  const lost = scoutedIds.filter((id) => !live.has(id));
  assert.deepEqual(lost, [],
    'the club paid to find him — he must not be culled as surplus');
});

test('the report stays signable after the cap has run', () => {
  const g = boot(5502);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const [report] = scoutOnce(g);
  floodFreeAgents(g);
  g.PPM.gameplay.pruneCareerData();

  const target = G().players.find((p) => p.id === report.realId);
  assert.ok(target, 'the scouted player is still in the world');
  const exp = g.PPM.gameplay.contractExpect(target, G().myTeamId);
  g._negSal = exp.salary; g._negYrs = exp.years; g._negBonus = 0; g._negRole = exp.role;
  g.PPM.gameplay.doNegotiate(target.id);
  assert.equal(target.teamId, G().myTeamId, 'and signing him actually works');
});

test('a report whose player is genuinely gone is cleared, not left dangling', () => {
  const g = boot(5503);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const [report] = scoutOnce(g);
  // Simulate the player leaving the world for a reason the cap does not cover.
  G().players = G().players.filter((p) => p.id !== report.realId);
  g.PPM.gameplay.pruneCareerData();

  assert.equal((G().scoutResults || []).some((r) => r.realId === report.realId), false,
    'a report pointing at nobody must not stay on the scouting screen');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('scout')), [],
    'and the world passes the scouting invariant');
});

test('scouting pointers stay valid across repeated season cleanups', () => {
  const g = boot(5504);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  for (let season = 0; season < 6; season++) {
    scoutOnce(g, 'Mazowsze');
    floodFreeAgents(g, 80);
    g.PPM.gameplay.pruneCareerData();
    const problems = checkWorld(G()).filter((p) => p.includes('[scouting]'));
    assert.deepEqual(problems, [], `season ${season + 1}: scouting references intact`);
  }
  // The reports themselves must not pile up without bound either.
  assert.ok((G().scoutResults || []).length <= 40,
    `scout reports stay bounded (${(G().scoutResults || []).length})`);
});
