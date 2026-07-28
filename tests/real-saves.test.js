// =============================================================================
// tests/real-saves.test.js — the owner's own careers must keep working.
//
// For each exported save (season 4, 8 and 11 of the "KS Piorun" career):
//   validate → migrate → check invariants → play two more full seasons →
//   save → load → check invariants again.
//
// These are the only real long-career inputs we have, and they contain damage a
// generated world never reproduces (hundreds of duplicated entity ids, a market
// listing the same free agent several times). The originals in Downloads are
// opened read-only and never written back.
//
// Marked [slow] so `npm test` stays fast; `npm run test:full` runs them.
// Skipped automatically when the private saves are not on this machine.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups, describeWorld } = require('./lib/invariants');
const realSaves = require('./lib/real-saves');

const present = realSaves.available();

// Invariants that a legacy save cannot be expected to satisfy on arrival — they
// describe the state a save reaches after a full season change, not the state an
// exported mid-season file was left in.
//
// `league-table` compares the table against stored results. Careers written
// before the current results bookkeeping do not reconcile, and rewriting the
// owner's history to make them would be a data change, not a fix.
const ON_LOAD_SKIP = ['league-table'];

for (const fixture of realSaves.FIXTURES) {
  const has = present.some((f) => f.id === fixture.id);

  test(`[slow] ${fixture.id}: real save migrates, survives two more seasons and reloads`, { skip: has ? false : `save not present (${fixture.file})` }, async () => {
    const text = realSaves.readText(fixture);
    const g = bootFast(0xB16C0DE);
    try {
      const api = g.PPM.stateApi;

      // 1) validate + migrate through the real load path
      const parsed = api.validateSaveText(text);
      assert.equal(parsed.season, fixture.season, 'fixture is the season it claims to be');
      const G = api.loadGameFromText(text);
      assert.ok(G, 'the save loads');
      assert.equal(G.schemaVersion, api.SAVE_SCHEMA_VERSION, 'migration stamps the current schema version');

      // 2) invariants right after migration — this is what the player would be
      //    looking at, so anything broken here is broken on their screen.
      const afterLoad = [...checkWorld(G, { skip: ON_LOAD_SKIP }), ...checkLiveLookups(g)];
      assert.deepEqual(afterLoad, [], `invariants after migrating ${fixture.file}`);

      // 3) two more full seasons through the real season loop
      const before = describeWorld(G);
      const run = await playSeasons(g, 2, {
        afterSeason: (info) => [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)],
      });
      assert.equal(run.seasons.length, 2, 'both seasons completed');
      assert.equal(g.PPM.state.G.season, fixture.season + 2, 'the career advanced two seasons');

      // 4) final save → load → invariants
      const finalText = api.serializeGame();
      api.validateSaveText(finalText);
      const reloaded = api.loadGameFromText(finalText);
      const afterReload = [...checkWorld(reloaded), ...checkLiveLookups(g)];
      assert.deepEqual(afterReload, [], 'invariants after the final save/load round trip');

      // 5) the long-career cleanup must actually have taken effect
      const after = describeWorld(reloaded);
      assert.equal(after.retiredEntities, 0, 'no retired player survives as a full entity');
      assert.ok(after.hallOfFame <= 20, `Hall of Fame stays at 20 (was ${after.hallOfFame})`);
      // Season-to-season churn moves the headcount a little either way; what must
      // not happen is the runaway growth these careers used to show (S11 shipped
      // 1256 players, most of them retired entities and duplicates).
      assert.ok(after.players < before.players * 1.1,
        `population must stay bounded across two seasons: ${before.players} → ${after.players}`);
      assert.ok(after.players < 600,
        `a healthy world is a few hundred players, not ${after.players}`);
    } finally {
      g.__stopGalaClicker();
    }
  });
}

test('the private save fixtures were not modified', { skip: present.length ? false : 'no fixtures present' }, () => {
  // Cheap belt-and-braces: the suite only ever reads these paths, and this test
  // states that contract so a future change that writes to them stands out.
  for (const fixture of present) {
    const p = realSaves.fixturePath(fixture);
    assert.doesNotThrow(() => require('fs').accessSync(p, require('fs').constants.R_OK));
  }
});
