// =============================================================================
// tests/matchday-manual.test.js — the matchday a player actually watches.
//
// The soak plays every round with `ui.autoPlay = true`, which is the game's own
// fast path: it skips the pre-match nomination modal AND the entire point-by-point
// animation. So a hundred soak seasons prove nothing about either — and between
// them they are most of what the player interacts with during a match.
//
// These drive the slow path: name a squad through nomToggle/nomConfirm, let
// runMatchday() replay the match through buildSetTimeline() and renderVME() for
// every point, and then check the result is the same shape the fast path produces
// and that the three men the manager named are the ones who played.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast } = require('./lib/career-driver');
const { checkWorld } = require('./lib/invariants');

// Opens a career and gets it into a playable season without auto-play.
function startedCareer(seed) {
  const g = bootFast(seed);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  (G.sponsorOffers || []).slice(0, 3).forEach((s) => gp.signSponsorPreseason(s.id, 1));
  const pres = gp.calcPrestige();
  const tp = g.PPM.constants.TECH_PARTNERSHIPS.find((t) => pres >= t.prestige[0] && pres <= t.prestige[1]);
  gp.selectTechPartnership(tp.id);
  gp.selectBoardObjective('safe');
  gp.startSeason();
  g.PPM.ui.autoPlay = false; // the slow path, deliberately
  return g;
}

function clearSelection(g) {
  g.PPM.gameplay.nomClear();
}
function nameSquad(g, baseIds) {
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  clearSelection(g);
  const available = gp.getEligibleMatchPlayers(G.myTeamId);
  const required = Math.min(5, available.length);
  const chosen = [...baseIds];
  available.forEach((player) => {
    if (chosen.length < required && !chosen.includes(player.id)) chosen.push(player.id);
  });
  chosen.forEach((id) => gp.nomToggle(id));
  gp.nomConfirm();
  return chosen;
}

// nomConfirm() calls runMatchday() but does not hand back its promise, so the
// round finishes after the confirm returns. Wait for the state to move.
async function waitFor(check, label) {
  for (let i = 0; i < 4000; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error(`timed out waiting for ${label}`);
}

// Who actually stepped on court in our match this round.
function playedIds(G) {
  const r = (G.results || []).filter((x) => x.season === G.season
    && (x.homeId === G.myTeamId || x.awayId === G.myTeamId)).pop();
  if (!r) return null;
  const mine = r.homeId === G.myTeamId;
  const ids = new Set();
  for (const mu of r.matchups || []) {
    const side = mine ? (mu.homePair || [mu.homePlayer]) : (mu.awayPair || [mu.awayPlayer]);
    side.forEach((id) => ids.add(id));
  }
  return ids;
}

test('[slow] a matchday played the slow way puts the named squad on court', async () => {
  const g = startedCareer(7701);
  try {
    const gp = g.PPM.gameplay;
    const G = () => g.PPM.state.G;
    gp.pendingDecisions().forEach((m) => gp.answerMail(m.id, false));

    // runMatchday() opens the nomination modal and returns; the round runs from
    // the modal's callback.
    gp.runMatchday();
    assert.equal(G().matchday, 0, 'it waited for a squad to be named');

    // Name three from the bottom of the pecking order, so the choice is visible in
    // the result rather than matching what auto-nomination would have picked.
    const eligible = gp.getEligibleMatchPlayers(G().myTeamId)
      .sort((a, b) => gp.ovr(a) - gp.ovr(b));
    assert.ok(eligible.length >= 3, 'there are players to choose from');
    const named = eligible.slice(0, 3).map((p) => p.id);
    const selected = nameSquad(g, named);
    assert.deepEqual(G().matchNomination.base, named, 'the modal recorded that squad');
    assert.equal(selected.length, 5, 'the manager also filled R1/R2');
    await waitFor(() => G().matchday === 1, 'the round to be played');
    const played = playedIds(G());
    assert.ok(played, 'our match was recorded');
    for (const id of named) {
      assert.ok(played.has(id),
        `the manager named ${id} and he must be the one who played`);
    }
  } finally { g.__stopGalaClicker(); }
});

test('[slow] the animated matchday produces the same shape of result as the fast one', async () => {
  const g = startedCareer(7702);
  try {
    const gp = g.PPM.gameplay;
    const G = () => g.PPM.state.G;
    gp.pendingDecisions().forEach((m) => gp.answerMail(m.id, false));

    gp.runMatchday();
    nameSquad(g, gp.getEligibleMatchPlayers(G().myTeamId).slice(0, 3).map((p) => p.id));
    await waitFor(() => G().matchday === 1, 'the round to be played');

    const round = (G().results || []).filter((r) => r.matchday === 0 && r.season === G().season);
    assert.equal(round.length, 12, 'both divisions played their six fixtures');
    for (const r of round) {
      // The animation replays a result that was already committed, so every
      // invariant of a match still has to hold after walking it point by point.
      assert.ok(r.matchups.length >= 3 && r.matchups.length <= 5, 'a legal protocol');
      assert.equal(Math.max(r.hTeamW, r.aTeamW), 3, 'someone reached three');
      assert.equal(r.isDraw, false);
      for (const mu of r.matchups) {
        for (const set of mu.setScores || []) {
          const hi = Math.max(set.home, set.away), lo = Math.min(set.home, set.away);
          assert.ok(hi >= 6 && hi - lo >= 1, `a played set score (${set.home}:${set.away})`);
        }
      }
    }
    assert.deepEqual(checkWorld(G()), [], 'and the world is intact after an animated round');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a whole season played the slow way stays consistent', async () => {
  const g = startedCareer(7703);
  try {
    const gp = g.PPM.gameplay;
    const G = () => g.PPM.state.G;
    let rounds = 0;
    while (G().phase === 'pre' && rounds++ < 30) {
      gp.pendingDecisions().forEach((m) => gp.answerMail(m.id, false));
      for (const L of [1, 2]) if (gp.shouldPlayTop12(L)) await gp.runTop12Masters(L);
      if (gp.getEligibleMatchPlayers(G().myTeamId).length < 3) break;
      const md = G().matchday;
      gp.runMatchday();
      // Every round goes through the modal, like a player's does.
      nameSquad(g, gp.getEligibleMatchPlayers(G().myTeamId).slice(0, 3).map((p) => p.id));
      await waitFor(() => G().matchday !== md || G().phase !== 'pre', 'the round to finish');
      if (G().matchday === md) break;
    }
    assert.equal(G().matchday, 22,
      `the season ran to its end without auto-play (eligible ${gp.getEligibleMatchPlayers(G().myTeamId).length}, seniors ${gp.getClubSeniorPlayers(G().myTeamId).length})`);
    assert.equal(G().phase, 'transfer');
    assert.deepEqual(checkWorld(G()), [],
      'a season of animated, hand-nominated rounds leaves a clean world');
  } finally { g.__stopGalaClicker(); }
});

test('a nomination of fewer than three players is refused', () => {
  const g = startedCareer(7704);
  try {
    const gp = g.PPM.gameplay;
    const G = () => g.PPM.state.G;
    gp.pendingDecisions().forEach((m) => gp.answerMail(m.id, false));
    gp.runMatchday();
    const eligible = gp.getEligibleMatchPlayers(G().myTeamId);
    // Empty the pre-filled selection, then offer only one name.
    clearSelection(g);
    gp.nomToggle(eligible[0].id);
    gp.nomConfirm();
    assert.equal(G().matchNomination, null,
      'the protocol needs every available slot up to five, so one cannot be confirmed');
    assert.equal(G().matchday, 0, 'and the round has not started');
  } finally { g.__stopGalaClicker(); }
});
