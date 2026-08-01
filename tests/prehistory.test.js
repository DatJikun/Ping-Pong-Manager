// =============================================================================
// tests/prehistory.test.js — starting a career into a world that already has one.
//
// The new-game wizard can pre-simulate N seasons before handing the club over,
// so the player inherits a league with records, champions and a Hall of Fame
// instead of a blank sheet. simulateBackgroundSeasons() does that by setting
// `myTeamId = null` and running the full season machinery with NO player club —
// the exact shape where every `myTeam()` call has nothing to return.
//
// It had no test at all: the soak always starts from a fresh newGame().
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups, describeWorld } = require('./lib/invariants');

async function preHistory(seed, years, clubIdx = 0) {
  const g = bootFast(seed);
  g.PPM.gameplay.newGame(clubIdx, 'PL');
  await g.PPM.gameplay.simulateBackgroundSeasons(years);
  return g;
}

test('[slow] a career can start into a world with years of history behind it', async () => {
  const g = await preHistory(4101, 10);
  try {
    const G = g.PPM.state.G;

    assert.equal(G.season, 11, 'ten seasons happened before the manager arrived');
    assert.equal(G.myTeamId, 0, 'and the club was handed over');
    assert.equal(G.teams.filter((t) => t.isPlayer).length, 1, 'to exactly one club');

    // The point of pre-history is that the records already exist.
    const clubRows = Object.values(G.clubHistory || {}).reduce((s, r) => s + (r?.length || 0), 0);
    assert.ok(clubRows >= 24 * 10, `every club has a season row per year (${clubRows})`);
    assert.ok(G.hallOfFame.length > 0, 'players have already retired into the Hall of Fame');
    assert.ok(Object.keys(G.records || {}).length > 0, 'and there are records to beat');

    assert.deepEqual([...checkWorld(G), ...checkLiveLookups(g)], [],
      'the inherited world is internally consistent');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] the handed-over club is playable, not a shell', async () => {
  const g = await preHistory(4102, 8);
  try {
    const G = () => g.PPM.state.G;
    const gp = g.PPM.gameplay;
    const club = gp.myTeam();

    assert.ok(club, 'myTeam() resolves again after the handover');
    assert.ok(gp.getEligibleMatchPlayers(G().myTeamId).length >= 3,
      'the club can field a team on day one');
    assert.equal(G().phase, 'preseason', 'and the manager starts in the preseason');
    assert.ok((G().sponsorOffers || []).length >= 3, 'with sponsors to sign');
    assert.ok((G().boardObjectiveOptions || []).length > 0, 'and a board objective to choose');
    // The welcome mail is how the player learns what he walked into.
    assert.ok((G().inbox || []).length > 0, 'and a welcome message');
  } finally { g.__stopGalaClicker(); }
});

test('[slow] handover exposes only the current-season welcome message', async () => {
  const g = await preHistory(4101, 5);
  try {
    const { inbox, season } = g.PPM.state.G;
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].subjectKey, 'mail.welcomeSubject');
    assert.equal(inbox[0].season, season);
  } finally { g.__stopGalaClicker(); }
});

test('[slow] playing on from pre-history keeps every invariant green', async () => {
  const g = await preHistory(4103, 10);
  try {
    const problems = [];
    const before = describeWorld(g.PPM.state.G);
    await playSeasons(g, 4, {
      afterSeason: (info) => {
        const found = [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)];
        problems.push(...found.map((p) => `S${info.season}: ${p}`));
        return found;
      },
    });
    assert.deepEqual(problems, []);
    const after = describeWorld(g.PPM.state.G);
    assert.equal(g.PPM.state.G.season, 15, 'ten pre-simulated plus four played');
    assert.equal(after.retiredEntities, 0, 'retirees are still summaries only');
    assert.ok(after.hallOfFame <= 20, 'and the Hall of Fame is still capped');
    assert.ok(after.players < before.players * 1.3,
      `population stays bounded across the handover (${before.players} → ${after.players})`);
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a pre-simulated career saves and reloads', async () => {
  const g = await preHistory(4104, 6);
  try {
    const api = g.PPM.stateApi;
    const text = api.serializeGame();
    api.validateSaveText(text);
    const fresh = bootFast(4105);
    try {
      const reloaded = fresh.PPM.stateApi.loadGameFromText(text);
      assert.equal(reloaded.season, g.PPM.state.G.season);
      assert.equal(reloaded.myTeamId, g.PPM.state.G.myTeamId);
      assert.deepEqual(checkWorld(reloaded), [],
        'an inherited world survives the save/load round trip');
    } finally { fresh.__stopGalaClicker(); }
  } finally { g.__stopGalaClicker(); }
});
