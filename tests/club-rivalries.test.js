// =============================================================================
// tests/club-rivalries.test.js — a club's head-to-head history is permanent.
//
// Long saves prune old fixtures (they are the single biggest thing in a career
// file). The club overview's RIVALRIES panel counted every fixture ever played
// straight out of store.G.results, so pruning silently reduced a club's defining
// rivalry to "this season". The totals now live in a compact permanent ledger
// that is folded in BEFORE the fixtures are dropped.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

// Plays a full league season and closes it the way the game does.
function playSeason(g) {
  const gp = g.PPM.gameplay;
  const G = () => g.PPM.state.G;
  G().teams.forEach((t) => { t.w = t.l = t.d = t.pts = t.gf = t.ga = 0; t.pointsWon = t.pointsLost = 0; });
  for (const schedule of [G().scheduleL1, G().scheduleL2]) {
    for (const round of schedule) for (const f of round) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));
  }
  g.PPM.gameplayClubUI.recordClubSeasonHistory();
  gp.doPromotionRelegation();
  gp.endSeason();
  G().phase = 'pre';
}

const totalGames = (g, tid) => g.PPM.gameplayClubUI.getClubRivalries(tid)
  .reduce((sum, r) => sum + r.games, 0);

test('head-to-head totals survive the pruning of old fixtures', () => {
  const g = boot(8100);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer).id;

  playSeason(g);
  const afterOne = totalGames(g, club);
  assert.equal(afterOne, 22, 'a full season is 22 fixtures for every club');

  for (let i = 0; i < 4; i++) playSeason(g);

  // The fixtures themselves are gone…
  const stillStored = (G().results || []).filter((r) => r.homeId === club || r.awayId === club).length;
  assert.ok(stillStored < 110, `old fixtures are pruned (kept ${stillStored})`);
  // …but the rivalry record is not.
  assert.equal(totalGames(g, club), 110, 'five seasons of head-to-head are all still counted');
});

test('a rivalry row keeps a consistent win/draw/loss breakdown', () => {
  const g = boot(8101);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer).id;

  for (let i = 0; i < 3; i++) playSeason(g);

  const rows = g.PPM.gameplayClubUI.getClubRivalries(club);
  assert.ok(rows.length > 0, 'the club has opponents on record');
  for (const r of rows) {
    assert.equal(r.wins + r.draws + r.losses, r.games,
      `W/D/L must add up for opponent ${r.oppId}`);
    assert.ok(r.close <= r.games, 'close matches cannot outnumber matches');
    assert.notEqual(r.oppId, club, 'a club is not its own rival');
  }
});

test('folding the same season twice does not double the record', () => {
  const g = boot(8102);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const club = G().teams.find((t) => !t.isPlayer).id;

  playSeason(g);
  const before = totalGames(g, club);
  // recordClubSeasonHistory + pruneCareerData both fold; neither may double-count.
  g.PPM.gameplayClubUI.foldAllSeasonsIntoRivalries();
  g.PPM.gameplay.pruneCareerData();
  g.PPM.gameplayClubUI.foldAllSeasonsIntoRivalries();

  assert.equal(totalGames(g, club), before, 'the ledger is idempotent');
});

test('the ledger is bounded by the league, not by the length of the career', () => {
  const g = boot(8103);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  for (let i = 0; i < 3; i++) playSeason(g);
  const small = JSON.stringify(G().clubRivalries).length;
  for (let i = 0; i < 5; i++) playSeason(g);
  const bigger = JSON.stringify(G().clubRivalries).length;

  // Eight seasons instead of three: the same clubs, the same opponents, just
  // larger counters. Growth must be marginal, not proportional.
  assert.ok(bigger < small * 1.4,
    `rivalry ledger must not grow with the career: ${small} → ${bigger} bytes`);
  assert.ok(bigger < 120000, `and must stay small in absolute terms (${bigger} bytes)`);
});

test('the season in progress is counted before it is folded in', () => {
  const g = boot(8104);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const club = G().teams.find((t) => !t.isPlayer).id;

  playSeason(g);
  const closed = totalGames(g, club);

  // One round of the new season, not yet recorded anywhere permanent.
  for (const f of G().scheduleL1[0]) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));
  for (const f of G().scheduleL2[0]) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));

  assert.equal(totalGames(g, club), closed + 1,
    'the live season shows up immediately, exactly once');
});
