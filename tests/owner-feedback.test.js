// =============================================================================
// tests/owner-feedback.test.js — regressions for the 2026-07-02 owner playtest
// batch (11 notes, see OPEN-ISSUES.md).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('#1 ticket revenue peaks at a sane price and collapses at rip-off prices', () => {
  const g = boot(21);
  g.PPM.gameplay.newGame(0, 'PL');
  g.PPM.state.G.infraHall = 5;
  const revenue = (price) => g.PPM.gameplay.estimateAttendance(price).attendance * price;
  const peak = Math.max(revenue(50), revenue(60), revenue(70));
  assert.ok(revenue(200) < peak * 0.2, `max price (${revenue(200)}) must earn far less than the peak (${peak})`);
  assert.ok(revenue(120) < peak, 'revenue falls beyond the sweet spot');
});

test('#2 save migration repairs duplicate entity ids from pre-fix saves', () => {
  const g = boot(22);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const src = G.players.find((p) => p.teamId !== null);
  G.players.push({ ...src, name: 'Klon A' }, { ...src, name: 'Klon B' });
  g.PPM.stateApi.loadGameFromText(JSON.stringify({ ...G, _pid: 3 }));
  const ids = g.PPM.state.G.players.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate player ids after migration');
  assert.ok(g.PPM.ui._pid > Math.max(...ids), 'counter floored above repaired ids');
});

test('#3 Top 12 uses the manager-picked entrant for the player club', () => {
  const g = boot(23);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const weakest = G.players.filter((p) => p.teamId === G.myTeamId && p.role !== 'youth')
    .sort((a, b) => g.PPM.gameplay.ovr(a) - g.PPM.gameplay.ovr(b))[0];
  G.top12Entrant = weakest.id;
  const entrants = g.PPM.gameplay.getTop12Participants(1);
  const mine = entrants.find((e) => e.team.id === G.myTeamId);
  if (mine) assert.equal(mine.player.id, weakest.id, 'picked entrant is used');
});

test('#5 getMax honours the player ceiling instead of a flat 84', () => {
  const g = boot(25);
  g.PPM.gameplay.newGame(0, 'PL');
  const p = g.PPM.gameplay.genPlayer(null, 20, 'PL');
  p.ceiling = 90;
  assert.ok(g.PPM.gameplay.getMax(p, 'foot') >= 90, 'stat cap allows reaching a 90 ceiling');
  p.ceiling = 60;
  assert.equal(g.PPM.gameplay.getMax(p, 'foot'), 84, 'low ceilings keep the 84 baseline cap');
});

test('#7 league-wide awards carry the club so the gala cannot misattribute them', () => {
  const g = boot(27);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  // Give one starter a season worth of stats so the pools are non-empty.
  G.players.filter((p) => p.role === 'senior').forEach((p) => {
    p.leagueSeasonW = 10; p.leagueSeasonL = 2;
    p.leagueSeasonPointsWon = 300; p.leagueSeasonPointsLost = 200;
  });
  const awards = g.PPM.gameplay.giveSeasonAwards();
  awards.filter((a) => a.forLeague).forEach((a) => {
    assert.ok(a.club && a.club.length > 0, `award "${a.label}" names the club`);
  });
});

test('#8 expired staff leave the player club at the season rollover sweep', () => {
  const g = boot(28);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const coach = g.PPM.gameplay.genStaff('coach', 'PL');
  coach.teamId = G.myTeamId; coach.contractYears = 0;
  G.staff.push(coach);
  g.PPM.gameplay.aiSignPlayers();
  assert.ok(!G.staff.find((s) => s.id === coach.id), 'expired staff removed from employment');
  assert.ok(G.staffPool.find((s) => s.id === coach.id), 'expired staff back on the market');
});

test('#9 top-end wage curve is softened but still convex', () => {
  const g = boot(29);
  g.PPM.gameplay.newGame(0, 'PL');
  const w = g.PPM.gameplay.playerWageForOvr;
  assert.ok(w(90) - w(87) < 40000, `87→90 costs +${w(90) - w(87)} — should be well under 40k`);
  assert.ok(w(90) / w(80) > 2.5, 'still convex per +10 OVR');
});

test('#10 borrow-in: loan listing → doBorrowIn → returnLoans round-trip', () => {
  const g = boot(30);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const p = G.players.find((x) => x.teamId !== null && x.teamId !== G.myTeamId && x.role === 'senior' && x.contractYears >= 2 && !x.isYouth);
  const fromId = p.teamId;
  G.transferMarket.push({ playerId: p.id, type: 'loan', fee: 0, share: 0.6, tier: 'loan' });
  g.PPM.gameplay.doBorrowIn(p.id);
  assert.equal(p.teamId, G.myTeamId, 'player joined on loan');
  const loan = G.loans.find((l) => l.playerId === p.id && !l.returned);
  assert.ok(loan && loan.toTeamId === G.myTeamId && loan.fromTeamId === fromId, 'loan record correct');
  g.PPM.gameplay.returnLoans();
  assert.equal(p.teamId, fromId, 'player returned to his club at season end');
});

test('#10 loaning out a final-contract-year player is blocked', () => {
  const g = boot(31);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const p = g.PPM.gameplay.getClubSeniorPlayers(G.myTeamId).at(-1);
  p.contractYears = 1;
  assert.equal(g.PPM.gameplay.canLoanOut(p.id).ok, false, 'final-year loan-out refused');
});

test('[slow] #11 AI wage discipline keeps league budgets alive over seasons', () => {
  const g = boot(32);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay; const G = g.PPM.state.G;
  for (let s = 0; s < 5; s++) {
    for (const sch of [G.scheduleL1, G.scheduleL2]) {
      for (const round of sch) for (const f of round) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));
    }
    G.matchday = 22;
    gp.endSeason();
  }
  const l2 = G.teams.filter((t) => !t.isPlayer && t.league === 2);
  const broke = l2.filter((t) => (t.budget || 0) < 5000).length;
  assert.ok(broke <= l2.length / 3, `at most a third of L2 may be broke (got ${broke}/${l2.length})`);
});
