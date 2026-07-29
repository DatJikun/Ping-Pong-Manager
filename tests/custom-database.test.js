// =============================================================================
// tests/custom-database.test.js — a career built from a user-supplied database.
//
// The start screen accepts a .json file of teams and players and, if it holds at
// least 24 clubs, builds the whole world from it instead of the shipped content.
// loadDatabaseFile() checks only that `teams` and `players` are arrays — every
// other field is trusted. So user data flows straight into the world, and nothing
// tested what happens next: not one season, let alone a long career.
//
// These tests build databases by hand, start careers from them and then hold them
// to the same invariants as any other world.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { bootFast, playSeasons } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups } = require('./lib/invariants');

// A well-formed database: 24 clubs split evenly, a full squad each.
function goodDatabase() {
  const teams = [];
  const players = [];
  for (let i = 0; i < 24; i++) {
    teams.push({
      name: `Custom Club ${i + 1}`,
      countryId: 'PL',
      league: i < 12 ? 1 : 2,
      budget: i < 12 ? 220000 : 70000,
      infraHall: i % 3, infraMed: 0, infraAcademy: i % 2, infraMerchandising: 0,
      traits: [],
    });
    for (let j = 0; j < 10; j++) {
      players.push({
        name: `Custom Player ${i + 1}-${j + 1}`,
        countryId: 'PL', nationality: 'PL',
        teamIndex: i,
        age: 20 + ((i + j) % 14),
        role: j < 4 ? 'starter' : 'reserve',
        contractYears: 1 + ((i + j) % 3),
      });
    }
  }
  return { name: 'Test DB', teams, players };
}

function bootWithDatabase(seed, db) {
  const g = bootFast(seed);
  g.PPM.customDatabase = db;
  g.PPM.gameplay.newGame(0, 'PL');
  return g;
}

test('a career built from a custom database is a valid world', () => {
  const db = goodDatabase();
  const g = bootWithDatabase(3201, db);
  try {
    const G = g.PPM.state.G;
    assert.equal(G.teams.length, 24, 'all 24 custom clubs are in');
    assert.equal(G.teams[0].name, 'Custom Club 1', 'and they are the custom ones');
    assert.equal(G.teams.filter((t) => t.league === 1).length, 12);
    assert.ok(G.customDatabase, 'the save records that it came from a database');
    assert.deepEqual([...checkWorld(G), ...checkLiveLookups(g)], []);
  } finally { g.__stopGalaClicker(); }
});

test('[slow] a custom-database career survives several seasons', async () => {
  const g = bootWithDatabase(3202, goodDatabase());
  try {
    const problems = [];
    await playSeasons(g, 4, {
      afterSeason: (info) => {
        const found = [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)];
        problems.push(...found.map((p) => `S${info.season}: ${p}`));
        return found;
      },
    });
    assert.deepEqual(problems, []);
    assert.equal(g.PPM.state.G.season, 5);
  } finally { g.__stopGalaClicker(); }
});

test('a custom-database career saves and reloads', () => {
  const g = bootWithDatabase(3203, goodDatabase());
  try {
    const api = g.PPM.stateApi;
    const text = api.serializeGame();
    api.validateSaveText(text);
    const fresh = bootFast(3204);
    try {
      const reloaded = fresh.PPM.stateApi.loadGameFromText(text);
      assert.equal(reloaded.teams[0].name, 'Custom Club 1');
      assert.deepEqual(checkWorld(reloaded), []);
    } finally { fresh.__stopGalaClicker(); }
  } finally { g.__stopGalaClicker(); }
});

// ── databases a person might plausibly hand it ───────────────────────────────
// loadDatabaseFile() validates almost nothing, so these are reachable. None of
// them may produce a world that cannot be played.

test('a database with fewer than 24 clubs falls back to the shipped world', () => {
  const db = goodDatabase();
  db.teams = db.teams.slice(0, 10);
  const g = bootWithDatabase(3205, db);
  try {
    const G = g.PPM.state.G;
    assert.equal(G.teams.length, 24, 'the world is still complete');
    assert.notEqual(G.teams[0].name, 'Custom Club 1', 'built from the shipped names');
    assert.deepEqual(checkWorld(G), []);
  } finally { g.__stopGalaClicker(); }
});

test('a database that puts every club in one division still yields two', () => {
  const db = goodDatabase();
  db.teams.forEach((t) => { t.league = 1; });
  const g = bootWithDatabase(3206, db);
  try {
    const G = g.PPM.state.G;
    const problems = checkWorld(G);
    // The engine needs two divisions of twelve to build schedules at all. Whatever
    // it does with a one-division database, it must not be an unplayable world.
    assert.deepEqual(problems.filter((p) => p.includes('[schedules]')), [],
      'the fixtures must still be playable');
    assert.deepEqual(problems.filter((p) => p.includes('[squads]')), [],
      'and every club must still be able to field a team');
  } finally { g.__stopGalaClicker(); }
});

test('a database with no players at all still produces full squads', () => {
  const db = goodDatabase();
  db.players = [];
  const g = bootWithDatabase(3207, db);
  try {
    const G = g.PPM.state.G;
    assert.ok(G.players.length > 100, 'the engine generated the squads itself');
    assert.deepEqual([...checkWorld(G), ...checkLiveLookups(g)], []);
  } finally { g.__stopGalaClicker(); }
});

test('a database with players pointing at clubs that do not exist is not trusted', () => {
  const db = goodDatabase();
  db.players.push({ name: 'Ghost', countryId: 'PL', teamIndex: 999, age: 25 });
  db.players.push({ name: 'Nameless Club Player', countryId: 'PL', teamName: 'Nowhere FC', age: 25 });
  const g = bootWithDatabase(3208, db);
  try {
    const G = g.PPM.state.G;
    assert.equal(G.players.some((p) => p.name === 'Ghost'), false,
      'a player attached to a club index that does not exist is dropped');
    assert.deepEqual(checkWorld(G).filter((p) => p.includes('unknown team')), [],
      'and nothing is left pointing at a club that is not there');
  } finally { g.__stopGalaClicker(); }
});

test('a database with duplicate club names does not produce two clubs with one identity', () => {
  const db = goodDatabase();
  db.teams.forEach((t) => { t.name = 'Same Name'; });
  const g = bootWithDatabase(3209, db);
  try {
    const G = g.PPM.state.G;
    // Names may repeat — ids may not, because every lookup in the engine is by id.
    assert.equal(new Set(G.teams.map((t) => t.id)).size, G.teams.length,
      'club ids stay unique even when the names collide');
    assert.deepEqual(checkWorld(G).filter((p) => p.includes('same id')), []);
  } finally { g.__stopGalaClicker(); }
});
