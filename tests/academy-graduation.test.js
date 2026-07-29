// =============================================================================
// tests/academy-graduation.test.js — juniors finish the academy; the club then
// decides whether to keep them.
//
// Owner call 2026-07-29: "mają kończyć akademię i niektórzy odchodzą a niektórzy
// zostają zależnie od decyzji i potrzeb klubu."
//
// Before this, nobody decided anything. An academy deal was three flat years
// signed at 16-19 against a graduation gate at 21, so most contracts lapsed
// first and the junior evaporated on his birthday — at every club, including
// the player's, and with no warning. A club that had paid for an academy was in
// practice stocking the rest of the league.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const juniorsOf = (G, teamId) => G.players.filter(
  (p) => p.teamId === teamId && !p.retired && p.role === 'youth');

// Ages a junior to `targetAge` through the real offseason, so the graduation
// gate in applyGrowth() is the thing under test.
function ageTo(g, player, targetAge) {
  const G = () => g.PPM.state.G;
  let guard = 0;
  while (player.age < targetAge && guard++ < 12) {
    g.PPM.gameplay.applyGrowth();
    G().season++;
  }
}

test('an academy contract lasts until the junior turns 21', () => {
  const g = boot(6001);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.teams.forEach((t) => { if (!t.isPlayer) t.infraAcademy = Math.max(1, t.infraAcademy || 0); });
  G.infraAcademy = Math.max(1, G.infraAcademy);

  g.PPM.gameplay.aiSignPlayers();
  const intake = [
    ...g.PPM.gameplay.genAcademyIntake(G.myTeamId, 'PL'),
    // Only academy graduates: rebalanceAiLineup() also labels ordinary under-21
    // squad players "youth", and those carry normal squad contracts.
    ...G.players.filter((p) => p.role === 'youth' && p.academyProfile && p.teamId !== null),
  ];
  assert.ok(intake.length > 0, 'both pipelines produced juniors');

  const tooShort = intake.filter((p) => (p.contractYears || 0) < 21 - p.age);
  assert.deepEqual(tooShort.map((p) => `${p.name} age ${p.age} / ${p.contractYears}y`), [],
    'no junior may run out of contract before the graduation gate');
});

test("the player's junior graduates into the reserves instead of vanishing", () => {
  const g = boot(6002);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  G().infraAcademy = 2;
  const junior = g.PPM.gameplay.genAcademyIntake(G().myTeamId, 'PL')[0];
  junior.age = 16;
  junior.contractYears = Math.max(3, 22 - junior.age);
  junior.teamId = G().myTeamId;
  G().players.push(junior);
  G().playerHistory[junior.id] = [];

  ageTo(g, junior, 21);

  assert.equal(junior.teamId, G().myTeamId, 'he is still ours at 21');
  assert.equal(junior.role, 'reserve', 'and has joined the senior squad');
  assert.equal(junior.isYouth, false);
  // The renewal decision is then the manager's, through the normal contract flow.
  assert.ok((junior.contractYears || 0) > 0, 'with a contract still running');
});

test('an AI club keeps a graduate it needs', () => {
  const g = boot(6003);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer && !(t.traits || []).includes('youthOnly'));
  // Strip the squad down so the club is short of bodies.
  G().players.filter((p) => p.teamId === club.id).slice(2).forEach((p) => { p.teamId = null; });

  const junior = g.PPM.gameplay.genYouthPlayer(club.id, 'PL');
  junior.teamId = club.id;
  junior.age = 20;
  junior.contractYears = 2;
  G().players.push(junior);
  G().playerHistory[junior.id] = [];

  g.PPM.gameplay.applyGrowth();

  assert.equal(junior.teamId, club.id, 'a club that is short of players keeps its graduate');
  assert.equal(junior.role, 'reserve');
});

test('an AI club lets a graduate go when it has a full squad and he is not good enough', () => {
  const g = boot(6004);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer && !(t.traits || []).includes('youthOnly'));
  club.principal = null; // no youth-focused board to give him the benefit of the doubt
  const squad = G().players.filter((p) => p.teamId === club.id && !p.retired);
  assert.ok(squad.length >= 7, 'the club is not short of players');

  const junior = g.PPM.gameplay.genYouthPlayer(club.id, 'PL');
  junior.teamId = club.id;
  junior.age = 20;
  junior.contractYears = 2;
  // Clearly below the squad, with no upside left to bet on.
  ['fh', 'bh', 'srv', 'ret', 'foot', 'men'].forEach((k) => { junior[k] = 20; });
  junior.ceiling = 25;
  G().players.push(junior);
  G().playerHistory[junior.id] = [];

  let released = 0;
  for (let attempt = 0; attempt < 25; attempt++) {
    junior.teamId = club.id; junior.role = 'youth'; junior.isYouth = true;
    junior.age = 20; junior.contractYears = 2;
    // applyGrowth ages the whole world; keep the rest of the squad under
    // contract so the club stays "full" across attempts.
    G().players.forEach((p) => { if (p.teamId === club.id && p !== junior) p.contractYears = 3; });
    g.PPM.gameplay.applyGrowth();
    if (junior.teamId === null) released++;
  }
  assert.ok(released > 12,
    `a full club should usually let a weak graduate go — kept him ${25 - released}/25 times`);
});

test('a released graduate becomes a free agent rather than disappearing', () => {
  const g = boot(6005);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer && !(t.traits || []).includes('youthOnly'));
  const junior = g.PPM.gameplay.genYouthPlayer(club.id, 'PL');
  junior.teamId = club.id;
  junior.age = 20;
  junior.contractYears = 0; // his deal already lapsed — the old failure mode
  G().players.push(junior);
  G().playerHistory[junior.id] = [];

  g.PPM.gameplay.applyGrowth();

  assert.ok(G().players.includes(junior), 'he is still in the world');
  assert.equal(junior.teamId, null, 'as a free agent');
  assert.equal(junior.role, 'reserve', 'available to any club that wants him');
});
