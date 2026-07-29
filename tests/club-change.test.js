// =============================================================================
// tests/club-change.test.js — taking a job at another club, mid-career.
//
// The post-season gala offers the manager other clubs, and accepting one is the
// biggest state transition in the game: the player's club changes underneath
// everything that referenced it. Across a country border it goes further and
// builds a whole new world with newGame(), keeping only the manager's prestige,
// his season history and the record book.
//
// The soak never accepted an offer, so nothing had ever exercised either path —
// and a career that spans several clubs is exactly what a long career is.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups } = require('./lib/invariants');

// Puts a concrete, accepted-able offer on the table. generateClubOffers() gates on
// prestige, so the manager is given enough of it.
function offerFrom(g, { sameCountry = true } = {}) {
  const G = g.PPM.state.G;
  G.managerPrestige = 95;
  const offers = g.PPM.gameplay.getFilteredClubOffers?.() || G.clubOffers || [];
  const pick = (G.clubOffers || []).find((o) => (o.countryId === G.countryId) === sameCountry && o.eligible)
    || (G.clubOffers || []).find((o) => (o.countryId === G.countryId) === sameCountry);
  if (pick) pick.eligible = true;
  return { pick, offers };
}

async function careerWithOffers(seed, seasons = 2) {
  const g = bootFast(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  await playSeasons(g, seasons, { saveEverySeason: false });
  // Offers are generated at the season end; make sure some exist.
  if (!(g.PPM.state.G.clubOffers || []).length) g.PPM.gameplay.getFilteredClubOffers?.();
  return g;
}

test('[slow] moving to another club in the same league leaves a consistent world', async () => {
  const g = await careerWithOffers(2601);
  try {
    const G = () => g.PPM.state.G;
    const oldId = G().myTeamId;
    const { pick } = offerFrom(g, { sameCountry: true });
    if (!pick) return; // no domestic offer this run — nothing to assert against

    g.PPM.gameplay.acceptClubOffer(pick.clubId);

    assert.notEqual(G().myTeamId, oldId, 'the manager changed clubs');
    assert.equal(G().teams.filter((t) => t.isPlayer).length, 1, 'and only one club is his');
    assert.equal(G().teams.find((t) => t.isPlayer).id, G().myTeamId, 'consistently');
    // Infrastructure belongs to the club, not the manager.
    const nu = G().teams.find((t) => t.id === G().myTeamId);
    assert.equal(G().infraAcademy, nu.infraAcademy || 0, 'he inherits the new club\'s academy');
    assert.deepEqual([...checkWorld(G()), ...checkLiveLookups(g)], [],
      'the world holds together across the move');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a career continues cleanly at the new club', async () => {
  const g = await careerWithOffers(2602);
  try {
    const G = () => g.PPM.state.G;
    const { pick } = offerFrom(g, { sameCountry: true });
    if (!pick) return;
    g.PPM.gameplay.acceptClubOffer(pick.clubId);

    const problems = [];
    await playSeasons(g, 3, {
      afterSeason: (info) => {
        const found = [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)];
        problems.push(...found.map((p) => `S${info.season}: ${p}`));
        return found;
      },
    });
    assert.deepEqual(problems, [], 'three more seasons at the new club');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] moving abroad keeps the manager\'s record and a valid world', async () => {
  const g = await careerWithOffers(2603);
  try {
    const G = () => g.PPM.state.G;
    const beforeSeasons = (G().seasonHistory || []).length;
    const beforeSeason = G().season;
    const { pick } = offerFrom(g, { sameCountry: false });
    if (!pick) return; // no foreign offer this run
    // read AFTER the helper raises it, or the assertion tests the helper
    const beforePrestige = G().managerPrestige;

    g.PPM.gameplay.acceptClubOffer(pick.clubId);

    assert.notEqual(G().countryId, 'PL', 'he is abroad');
    assert.equal(G().season, beforeSeason, 'the calendar did not restart');
    assert.equal(G().managerPrestige, beforePrestige, 'his prestige came with him');
    assert.equal((G().seasonHistory || []).length, beforeSeasons, 'and so did his record');
    assert.deepEqual([...checkWorld(G()), ...checkLiveLookups(g)], [],
      'the new world is internally consistent');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a career that moved abroad saves, reloads and plays on', async () => {
  const g = await careerWithOffers(2604);
  try {
    const G = () => g.PPM.state.G;
    const { pick } = offerFrom(g, { sameCountry: false });
    if (!pick) return;
    g.PPM.gameplay.acceptClubOffer(pick.clubId);

    const api = g.PPM.stateApi;
    const text = api.serializeGame();
    api.validateSaveText(text);
    const reloaded = api.loadGameFromText(text);
    assert.deepEqual(checkWorld(reloaded), [], 'it survives the round trip');

    const problems = [];
    await playSeasons(g, 2, {
      afterSeason: (info) => {
        const found = checkWorld(info.game);
        problems.push(...found.map((p) => `S${info.season}: ${p}`));
        return found;
      },
    });
    assert.deepEqual(problems, [], 'and two seasons abroad stay clean');
  } finally { g.__stopGalaClicker(); }
});

test('an offer the manager has not earned is refused', async () => {
  const g = bootFast(2605);
  try {
    g.PPM.gameplay.newGame(0, 'PL');
    const G = () => g.PPM.state.G;
    const oldId = G().myTeamId;
    G().clubOffers = [{ clubId: 5, clubIndex: 5, clubName: 'Too Good For You',
      countryId: 'PL', eligible: false, prestigeNeed: 90 }];
    g.PPM.gameplay.acceptClubOffer(5);
    assert.equal(G().myTeamId, oldId, 'prestige gates the move');
  } finally { g.__stopGalaClicker(); }
});
