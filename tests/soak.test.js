// =============================================================================
// tests/soak.test.js — CI-sized slice of the long-career soak.
//
// The full 30-season run lives in `npm run test:soak`; it takes minutes and is
// meant to be run deliberately. What belongs in CI is the short version: enough
// seasons to cover a complete cycle (preseason gates → 22 matchdays with the cup
// and Top 12 Masters → season change → save/load) with every world invariant
// checked, in a few seconds.
//
// The [slow] tests widen that to the other live league formats and to a run long
// enough for retirements, promotion/relegation and the Hall of Fame cap to bite.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { runCareer } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups, describeWorld } = require('./lib/invariants');

const invariantsOf = (info) => [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)];

// Plays a career and collects every invariant violation. Pass `sizes` to also
// capture the population report after each season.
async function soak(seasons, countryId, seed, sizes) {
  const problems = [];
  const result = await runCareer({
    seasons,
    seed,
    countryId,
    onSeason: sizes ? (info) => sizes.push(describeWorld(info.game)) : null,
    afterSeason: (info) => {
      const found = invariantsOf(info);
      problems.push(...found.map((p) => `S${info.season}: ${p}`));
      return found;
    },
  });
  return { result, problems };
}

test('a fresh career survives two full seasons with every invariant green', async () => {
  const { result, problems } = await soak(2, 'PL', 1234);
  assert.deepEqual(problems, []);
  assert.equal(result.seasons.length, 2);
  assert.equal(result.game.season, 3, 'the career is on season 3 afterwards');
});

// The season loop reads the league format from the save's country, and the three
// protocols (superliga / olympic / tleague) score and pair matches differently.
// A format that only works for the first season is a real long-career failure.
for (const [countryId, label] of [['JP', 'T.League (golden point)'], ['CN', 'CTTSL (olympic protocol)'], ['DE', 'TTBL (2/0 scoring)']]) {
  test(`[slow] ${countryId} — ${label} runs four seasons cleanly`, async () => {
    const { result, problems } = await soak(4, countryId, 4242);
    assert.deepEqual(problems, []);
    assert.equal(result.seasons.length, 4);
  });
}

test('[slow] twelve seasons keep population and save size bounded', async () => {
  const sizes = [];
  const { result, problems } = await soak(12, 'PL', 20260728, sizes);
  assert.deepEqual(problems, []);

  const first = sizes[0];
  const last = sizes[sizes.length - 1];
  // Retirees must be summaries, never entities, or a long career grows forever.
  assert.equal(last.retiredEntities, 0, 'no retired player is stored as a full entity');
  assert.ok(last.hallOfFame <= 20, `Hall of Fame stays capped at 20 (got ${last.hallOfFame})`);
  // Everything that is supposed to be a rolling window must actually roll.
  assert.ok(last.news <= 180, `news feed is bounded (got ${last.news})`);
  assert.ok(last.inbox <= 120, `inbox is bounded (got ${last.inbox})`);
  assert.ok(last.gameLog <= 150, `game log is bounded (got ${last.gameLog})`);
  // The living world is a fixed-size league, so its population must not drift up.
  assert.ok(last.players < first.players * 1.35,
    `player population must stay bounded: ${first.players} → ${last.players}`);
  assert.ok(last.freeAgents <= 200, `free-agent shelf stays bounded (got ${last.freeAgents})`);
  // Fixtures are pruned to the recent seasons rather than merely stripped of
  // their duel detail (2026-07-28), so what matters is that the results array
  // itself stays bounded — a season is 264 fixtures across both divisions.
  assert.ok(last.results <= 264 * 2,
    `stored fixtures must stay bounded (${last.results} after ${sizes.length} seasons)`);
  assert.ok(last.results <= first.results * 2,
    `and must not grow with the career (${first.results} → ${last.results})`);
  // The club register is the ONE thing that grows on purpose — one compact row
  // per club per season. Verify it grows exactly that fast and no faster.
  assert.equal(last.clubHistoryRows - first.clubHistoryRows, 24 * (sizes.length - 1),
    'club history grows by exactly one row per club per season');
  assert.equal(result.game.season, 13);
});


// The youth-only challenge club is a different game: doNegotiate refuses it every
// adult signing, so its academy is the ONLY source of players and every departure
// is permanent. A career there is exactly where a squad-supply bug shows up first.
test('[slow] the youth-only challenge club survives a long career', async () => {
  const problems = [];
  const result = await runCareer({
    seasons: 12,
    seed: 1234,
    countryId: 'PL',
    clubIdx: 12,
    afterSeason: (info) => {
      const found = invariantsOf(info);
      problems.push(...found.map((p) => `S${info.season}: ${p}`));
      return found;
    },
  });
  assert.deepEqual(problems, []);
  assert.equal(result.seasons.length, 12);
  const G = result.game;
  const club = G.teams.find((t) => t.id === G.myTeamId);
  assert.ok((club.traits || []).includes('youthOnly'), 'this really is the challenge club');
  const squad = G.players.filter((p) => p.teamId === G.myTeamId && !p.retired && p.role !== 'youth');
  assert.ok(squad.length >= 3,
    `it must still be able to field a team after twelve seasons (${squad.length} seniors)`);
  // And it must have built that squad itself: nobody arrived from another club.
  // (A scouted JUNIOR signing is allowed and is flagged joinedViaTransfer too,
  // so the club history is what distinguishes the two.)
  const poached = squad.filter((p) => (p.clubHistory || [])
    .some((cid) => cid !== G.myTeamId && G.teams.some((t) => t.id === cid)));
  assert.deepEqual(poached.map((p) => p.name), [],
    'a youth-only club may not end up with players taken from other clubs');
});

test('[slow] the same seed replays the same career', async () => {
  const fingerprint = async () => {
    const { result } = await soak(3, 'PL', 90210);
    const G = result.game;
    return JSON.stringify({
      table: G.teams.map((t) => [t.id, t.league, t.pts, t.budget]),
      squad: G.players.map((p) => [p.id, p.name, p.teamId, p.age, p.fh, p.men, p.salary]),
      results: G.results.map((r) => [r.season, r.matchday, r.homeId, r.awayId, r.score]),
    });
  };
  assert.equal(await fingerprint(), await fingerprint(),
    'a soak failure must be reproducible from its seed');
});
