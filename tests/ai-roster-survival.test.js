// =============================================================================
// tests/ai-roster-survival.test.js — AI clubs must stay fieldable for decades.
//
// Regression cover for a long-career failure found by the soak runner and then
// confirmed in the owner's real season-11 save: "Akademia Orłów" (the youth-only
// challenge club) was down to ONE senior player, i.e. it could no longer field
// the three players the match protocol needs.
//
// Cause: nothing ever renewed an AI club's own expiring contracts. Ordinary
// clubs hide that, because rebalanceAiLineup tags every under-21 squad member as
// "youth", the age-21 gate ejects anyone whose deal has lapsed, and the club then
// simply re-signs from the free-agent shelf. A youth-only club is barred from
// that shelf by design, so each player it grew walked one season after graduating
// and the roster drained to nothing.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

// Runs the real offseason repeatedly. No league fixtures are needed: the drain
// happened entirely in the season-change code (aging, contract expiry, AI market).
function ageWorld(g, seasons) {
  const gp = g.PPM.gameplay;
  const G = () => g.PPM.state.G;
  for (let i = 0; i < seasons; i++) {
    gp.applyGrowth();
    G().season++;
    G().players.forEach((p) => { if (p.role === 'youth' && p.age >= 21) p.isYouth = false; });
    gp.aiSignPlayers();
    gp.maintainAiRosters();
    gp.pruneCareerData();
  }
}

const seniorsOf = (G, teamId) => G.players.filter(
  (p) => p.teamId === teamId && !p.retired && p.role !== 'youth' && !p.loanedOut);

test('[slow] every AI club can still field a legal team after 12 offseasons', () => {
  const g = boot(31337);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  ageWorld(g, 12);

  const broken = G().teams
    .filter((t) => !t.isPlayer)
    .map((t) => ({ name: t.name, seniors: seniorsOf(G(), t.id).length }))
    .filter((row) => row.seniors < 3);

  assert.deepEqual(broken, [],
    `clubs below the 3-player protocol minimum: ${broken.map((b) => `${b.name} (${b.seniors})`).join(', ')}`);
});

test('[slow] the youth-only club keeps a squad it grew itself', () => {
  const g = boot(20260728);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => (t.traits || []).includes('youthOnly'));
  assert.ok(club, 'the world contains a youth-only club');
  assert.ok(!club.isPlayer, 'and it is AI-run in this test');

  ageWorld(g, 15);

  const seniors = seniorsOf(G(), club.id);
  assert.ok(seniors.length >= 4,
    `${club.name} should still carry a squad after 15 seasons — has ${seniors.length} senior(s)`);
  // It must have GROWN them: a youth-only club may not buy from the market.
  const homegrown = seniors.filter((p) => p.academyProfile || p.clubHistory?.[0] === club.id);
  assert.ok(homegrown.length >= 3,
    `${club.name} should be built from its own academy — only ${homegrown.length}/${seniors.length} are homegrown`);
});

// The retention rule is deliberately narrow: it must not turn every AI club into
// a squad that never loses anyone, because free agents leaving expiring deals are
// what keeps the transfer market stocked.
test('ordinary AI clubs still release players when contracts expire', () => {
  const g = boot(5150);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const ordinary = G().teams.find((t) => !t.isPlayer && !(t.traits || []).includes('youthOnly'));
  const victim = G().players.find((p) => p.teamId === ordinary.id && !p.retired);
  victim.contractYears = 0;

  g.PPM.gameplay.aiSignPlayers();

  assert.notEqual(victim.teamId, ordinary.id,
    'an expired contract at an ordinary club must still free the player up');
});

// Fast version of the same rule, for every-commit CI: one offseason is enough to
// show that a market-barred club renews instead of emptying out.
test('a market-barred club renews its own expiring contracts in one offseason', () => {
  const g = boot(777);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => (t.traits || []).includes('youthOnly'));
  const squad = G().players.filter((p) => p.teamId === club.id && !p.retired);
  assert.ok(squad.length >= 3, 'the club starts with a squad');
  squad.forEach((p) => { p.contractYears = 0; });

  g.PPM.gameplay.aiSignPlayers();

  // (the club also takes on new juniors in the same pass — what matters is that
  // nobody it already had was released)
  const left = squad.filter((p) => p.teamId !== club.id);
  assert.deepEqual(left.map((p) => p.name), [],
    'a club that may not use the transfer market keeps everyone it has');
  assert.ok(squad.every((p) => (p.contractYears || 0) > 0), 'on live contracts');
});
