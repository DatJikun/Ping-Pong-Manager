// =============================================================================
// tests/market-ref-integrity.test.js — transferMarket references survive the
// player-ID repair (W9).
//
// Old saves were written while several players shared one `id`. The market held
// one row per entity, so those rows all carried the same `playerId`. Migration
// renumbers the duplicate players but used to leave the market rows pointing at
// the original ID — S11 ends up with 997 `fa` rows spread over only 695 distinct
// IDs, which is what the player sees as "the same free agent three times".
//
// The repair rebuilds the `fa` rows from the repaired player list (they carry no
// per-entity data, so this is lossless) and de-duplicates the negotiated rows
// WITHOUT re-rolling their fee/tier/share.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

// Same predicate buildMarket() uses for the free-agent shelf.
const isFreeAgent = (G, p) => !p.retired && !p.loanedOut
  && ((p.teamId === null) || p.contractYears <= 0) && p.teamId !== G.myTeamId;

test('migration repairs market rows left behind by the player-ID repair', () => {
  const g = boot(1101);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;

  // Reproduce the historical shape: two distinct free agents sharing one id,
  // each with its own market row (that is how the old saves were written).
  const agents = G.players.filter((p) => isFreeAgent(G, p));
  assert.ok(agents.length >= 2, 'fixture has at least two free agents');
  const [keeper, shadow] = agents;
  const sharedId = keeper.id;
  shadow.id = sharedId;
  G.transferMarket = [
    { playerId: sharedId, type: 'fa', fee: 0 },
    { playerId: sharedId, type: 'fa', fee: 0 },
  ];

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const market = loaded.transferMarket || [];

  const ids = market.map((m) => m.playerId);
  assert.equal(ids.length, new Set(ids).size, 'no playerId appears twice on the market');

  for (const row of market) {
    assert.ok(loaded.players.some((p) => p.id === row.playerId),
      `market row ${row.type} points at a live player`);
  }

  // Both entities survived the ID repair and are each reachable on the shelf.
  const keeperRow = market.find((m) => m.playerId === loaded.players.find((p) => p.name === keeper.name).id);
  const shadowRow = market.find((m) => m.playerId === loaded.players.find((p) => p.name === shadow.name).id);
  assert.ok(keeperRow, 'the player who kept the ID is still listed');
  assert.ok(shadowRow, 'the renumbered player is listed under his new ID');
  assert.notEqual(keeperRow.playerId, shadowRow.playerId, 'they are listed separately');
});

test('the repair lists every eligible free agent once and does not re-roll negotiated offers', () => {
  const g = boot(1102);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;

  // A negotiated row carries randomised data — migration must preserve it as-is.
  const contracted = G.players.filter((p) => p.teamId !== null && p.teamId !== G.myTeamId
    && !p.retired && p.contractYears > 0);
  const listed = contracted[0];
  const negotiated = { playerId: listed.id, type: 'transfer', fee: 123456, tier: 'hot' };
  // buildMarket() guards every negotiated shelf with find(m => m.playerId === p.id),
  // so one person is never offered two ways at once. A migrated save must not be
  // able to sit in a state the generator cannot produce.
  const twoWays = contracted[1];
  // A row whose player no longer exists, plus a duplicated free-agent row.
  const agents = G.players.filter((p) => isFreeAgent(G, p));
  G.transferMarket = [
    negotiated,
    { playerId: twoWays.id, type: 'transfer', fee: 777, tier: 'standard' },
    { playerId: twoWays.id, type: 'loan', fee: 0, share: 0.6, tier: 'loan' },
    { playerId: agents[0].id, type: 'fa', fee: 0 },
    { playerId: agents[0].id, type: 'fa', fee: 0 },
    { playerId: 999999, type: 'fa', fee: 0 },
  ];

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const market = loaded.transferMarket || [];

  // Every eligible free agent is on the shelf exactly once — the fix must not
  // "solve" the duplicate count by hiding hundreds of real free agents.
  const eligible = loaded.players.filter((p) => isFreeAgent(loaded, p));
  const faRows = market.filter((m) => m.type === 'fa');
  assert.equal(faRows.length, eligible.length, 'one fa row per eligible free agent');
  const faIds = new Set(faRows.map((m) => m.playerId));
  for (const p of eligible) assert.ok(faIds.has(p.id), `${p.name} is on the free-agent shelf`);

  // The negotiated offer keeps its exact terms (no re-roll on load).
  const kept = market.find((m) => m.type === 'transfer' && m.playerId === listed.id);
  assert.ok(kept, 'the transfer listing survived migration');
  assert.equal(kept.fee, 123456, 'fee is preserved, not re-rolled');
  assert.equal(kept.tier, 'hot', 'tier is preserved, not re-rolled');

  // One person is offered exactly one way, and it is the first row's terms.
  const bothWays = market.filter((m) => m.playerId === twoWays.id);
  assert.equal(bothWays.length, 1, 'a player offered as transfer AND loan keeps one row');
  assert.equal(bothWays[0].type, 'transfer', 'the first row wins');
  assert.equal(bothWays[0].fee, 777, 'the surviving row keeps its own terms');

  // The dangling row is gone.
  assert.ok(!market.some((m) => m.playerId === 999999), 'row for a non-existent player is dropped');
});
