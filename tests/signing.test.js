// =============================================================================
// tests/signing.test.js — Regression tests for player signing (bug B1).
//
// B1: signing a free agent always dropped them to the bench, so a club could end
// up fielding only 3 starters. A new signing should fill an empty starter slot.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

// Helper: sign a free agent now via doNegotiate, bypassing the modal by setting
// the negotiation globals the function reads.
function signFreeAgent(g, player, role) {
  // Offer well above any expectation so the player accepts (testing placement, not
  // haggling). Base it on the wage curve so it scales with the economy.
  const expected = g.PPM.gameplay.contractExpect(player, g.PPM.state.G.myTeamId).salary;
  g.window._negSal = Math.round(expected * 1.5) + 20000;
  g.window._negYrs = 3;
  g.window._negBonus = 5000;
  g.window._negRole = role || 'starter';
  g.PPM.gameplay.doNegotiate(player.id);
}

test('signing a free agent joins the unified senior squad', () => {
  const g = boot(101);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const myId = G.myTeamId;

  // Grab a free agent (no team) and sign them.
  const freeAgent = G.players.find((p) => p.teamId === null && !p.retired && p.role !== 'youth');
  assert.ok(freeAgent, 'a free agent exists');
  G.teams.find((t) => t.id === myId).budget = 10_000_000; // ensure affordable
  signFreeAgent(g, freeAgent, 'starter');

  const after = g.PPM.state.G;
  const signed = after.players.find((p) => p.id === freeAgent.id);
  assert.equal(signed.teamId, myId, 'player joined the club');
  assert.equal(signed.role, 'senior');
  assert.ok(g.PPM.gameplay.getClubSeniorPlayers(myId).some((p) => p.id === signed.id));
});

test('a contract role promise does not create a hidden permanent lineup', () => {
  const g = boot(202);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const myId = G.myTeamId;
  const selectionBefore = JSON.parse(JSON.stringify(G.lastMatchSelection));

  const freeAgent = G.players.find((p) => p.teamId === null && !p.retired && p.role !== 'youth');
  G.teams.find((t) => t.id === myId).budget = 10_000_000;
  signFreeAgent(g, freeAgent, 'starter');

  const signed = g.PPM.state.G.players.find((p) => p.id === freeAgent.id);
  assert.equal(signed.role, 'senior');
  assert.equal(signed.promisedRole, 'starter');
  assert.deepEqual(JSON.parse(JSON.stringify(g.PPM.state.G.lastMatchSelection)), selectionBefore,
    'signing does not silently rewrite the manager-picked five');
});
