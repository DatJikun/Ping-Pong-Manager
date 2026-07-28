// =============================================================================
// tests/migration-repairs.test.js — damage found in the owner's real careers.
//
// Every case here was first observed in an exported save (season 4, 8 or 11 of
// the "KS Piorun" career) and is reproduced synthetically so the repair has a
// test that does not depend on a private file being present.
//
// All of them share one origin: for a long time the entity-id counter rewound on
// resume, so several players ended up sharing an id. The duplicate ids themselves
// are already repaired on load; these are the leftovers that repair could not
// see — merged career histories, a market row pointing at your own squad, and a
// staff record shadowed by a stale copy of itself.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

// Builds a real save, lets the caller damage the parsed object, then loads it
// back through the production migration path.
function loadDamaged(seed, damage) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  const parsed = JSON.parse(g.PPM.stateApi.serializeGame());
  damage(parsed, g);
  const fresh = boot(seed + 1);
  const G = fresh.PPM.stateApi.loadGameFromText(JSON.stringify(parsed));
  return { g: fresh, G };
}

const ages = (rows) => rows.map((r) => `S${r.season}:${r.age}`);

test('a career history merged from two players keeps only its owner\'s rows', () => {
  const { G } = loadDamaged(11, (save) => {
    const p = save.players[0];
    p.age = 24;
    save.season = 8;
    // What a shared id actually produced: the two men's season snapshots
    // interleaved in one bucket, one aged 24 and one aged 31.
    save.playerHistory[p.id] = [
      { season: 6, age: 22, ovr: 60 }, { season: 6, age: 29, ovr: 71 },
      { season: 7, age: 23, ovr: 62 }, { season: 7, age: 30, ovr: 70 },
      { season: 8, age: 24, ovr: 64 }, { season: 8, age: 31, ovr: 69 },
    ];
  });
  const p = G.players[0];
  assert.deepEqual(ages(G.playerHistory[p.id]), ['S6:22', 'S7:23', 'S8:24'],
    'only the 24-year-old\'s own timeline survives');
});

test('a history that belongs to somebody else entirely is cleared, not shown', () => {
  const { G } = loadDamaged(12, (save) => {
    const p = save.players[0];
    p.age = 20;
    save.season = 8;
    save.playerHistory[p.id] = [{ season: 8, age: 33, ovr: 78 }];
  });
  const p = G.players[0];
  assert.deepEqual(G.playerHistory[p.id], [],
    'better an empty chart than another player\'s career');
});

test('an undamaged history is left exactly as it was', () => {
  const { G } = loadDamaged(13, (save) => {
    const p = save.players[0];
    p.age = 26;
    save.season = 4;
    // Real shape: a creation snapshot taken before the first birthday, then one
    // row per season afterwards.
    save.playerHistory[p.id] = [
      { season: 2, age: 24, ovr: 61 },
      { season: 2, age: 25, ovr: 63 },
      { season: 3, age: 26, ovr: 65 },
    ];
    save._expectHistoryFor = p.id;
  });
  const id = G._expectHistoryFor;
  assert.deepEqual(ages(G.playerHistory[id]), ['S2:24', 'S2:25', 'S3:26'],
    'migration must not rewrite a healthy career chart');
});

test('the transfer market never offers a player from your own squad', () => {
  const { G } = loadDamaged(14, (save) => {
    const mine = save.players.find((p) => p.teamId === save.myTeamId && p.contractYears > 0);
    save.transferMarket.push({ playerId: mine.id, type: 'transfer', fee: 25000 });
    save._ownPlayerId = mine.id;
  });
  const rows = G.transferMarket.filter((r) => r.playerId === G._ownPlayerId);
  assert.deepEqual(rows, [], 'a stale fee row for our own player is dropped on load');
});

test('a staff id shared with a stale pool copy resolves to the employed person', () => {
  const g = boot(15);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;

  const scout = gp.genStaff('scout', 'PL');
  scout.teamId = G.myTeamId;
  scout.hired = true;
  scout.contractYears = 2;
  G.staff.push(scout);
  // The season change mirrors our own scouts into scoutPool so the market page
  // can grey them out. The mirror is a shallow copy of the same person.
  G.scoutPool.unshift({ ...scout, contractYears: 99 });

  const found = gp.findStaffById(scout.id);
  assert.equal(found, scout, 'the employed record wins over its pool mirror');
  assert.equal(found.contractYears, 2, 'and carries the real contract, not the copy\'s');

  // Renewing through the hire flow must land on the employed record.
  g._staffNegSal = scout.salary;
  g._staffNegYrs = 3;
  g._staffNegBonus = 0;
  gp.doHireStaff(scout.id);
  assert.equal(scout.contractYears, 3, 'the renewal reaches the scout we actually employ');
  assert.equal(G.staff.filter((s) => s.id === scout.id).length, 1, 'and does not clone him');
});

test('a club that fell below the protocol minimum graduates its own juniors on load', () => {
  const { G } = loadDamaged(16, (save) => {
    const club = save.teams.find((t) => !t.isPlayer);
    const squad = save.players.filter((p) => p.teamId === club.id);
    // Strip it down to one senior, then give it an academy full of juniors —
    // exactly the shape Akademia Orłów had in the owner's season-11 save.
    squad.slice(1).forEach((p, i) => {
      if (i < 4) { p.role = 'youth'; p.isYouth = true; p.age = 19 + (i % 2); }
      else p.teamId = null;
    });
    save._brokenClub = club.id;
  });
  const seniors = G.players.filter((p) => p.teamId === G._brokenClub && p.role !== 'youth' && !p.retired);
  assert.ok(seniors.length >= 3,
    `the club must be able to field a team again — has ${seniors.length} senior(s)`);
});

// Not migration, but the same family of long-career dead-ends: a club that goes
// into the red mid-season must still be able to rebuild a legal squad.
test('an overdrawn club can still sign a free agent on a zero-cost package', () => {
  const g = boot(17);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const me = G.teams.find((t) => t.isPlayer);

  // A benched starter walking out on severance (applySeveranceRelease) charges
  // the club with no floor, so this is a state real careers reach.
  me.budget = -25000;

  const target = G.players.find((p) => p.teamId === null && !p.retired && p.role !== 'youth');
  assert.ok(target, 'the world has a free agent');
  const exp = gp.contractExpect(target, G.myTeamId);
  g._negSal = exp.salary;
  g._negYrs = exp.years;
  g._negBonus = 0;      // the manager drags the bonus slider to zero
  g._negRole = exp.role;
  gp.doNegotiate(target.id);

  assert.equal(target.teamId, G.myTeamId,
    'a package that costs nothing must not be refused for lack of budget');
  assert.equal(me.budget, -25000, 'and it must not move the balance');
});

test('an overdrawn club is still refused a package it cannot pay for', () => {
  const g = boot(18);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const me = G.teams.find((t) => t.isPlayer);
  me.budget = -25000;

  const target = G.players.find((p) => p.teamId === null && !p.retired && p.role !== 'youth');
  const exp = gp.contractExpect(target, G.myTeamId);
  g._negSal = exp.salary;
  g._negYrs = exp.years;
  g._negBonus = 40000;  // a bonus the club plainly cannot fund
  g._negRole = exp.role;
  gp.doNegotiate(target.id);

  assert.notEqual(target.teamId, G.myTeamId, 'the club cannot buy what it cannot afford');
  assert.equal(me.budget, -25000, 'and the balance is untouched');
});
