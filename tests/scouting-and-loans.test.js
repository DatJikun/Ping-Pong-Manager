// =============================================================================
// tests/scout-reports.test.js — a scouting report must always point at somebody.
//
// A scout mission costs money and returns a generated player who is pushed into
// the world as a free agent. The report on the scouting screen is a POINTER to
// him (`realId`), and the population cap culls surplus free agents every season.
// Nothing connected the two, so the manager could pay for a mission and find the
// player quietly removed from under his own report — which then sat on the
// screen forever, clickable, doing nothing (`scoutSign` → `openNegotiate` on a
// player who no longer exists → silent return).
//
// Two rules now: a scouted player is not "surplus" and survives the cap, and a
// report whose player is genuinely gone is cleared instead of left dangling.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');
const { checkWorld } = require('./lib/invariants');

// Employs a scout and runs one mission to completion.
function scoutOnce(g, region = 'Mazowsze') {
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const scout = G.scoutPool.find((s) => s.type === 'scout');
  scout.teamId = G.myTeamId; scout.hired = true; scout.contractYears = 3;
  G.staff.push(scout);
  G.scoutMissions.push({ scoutId: scout.id, region, startMatchday: 0, duration: 0, done: false, cost: 0 });
  G.matchday = 5;
  gp.checkScoutReturns();
  return G.scoutResults.slice();
}

// Floods the world with surplus free agents so the population cap has to cull.
function floodFreeAgents(g, n = 200) {
  const G = g.PPM.state.G;
  for (let i = 0; i < n; i++) {
    const p = g.PPM.gameplay.genPlayer(null, 26, 'PL');
    p.teamId = null; p.contractYears = 0;
    G.players.push(p);
  }
}

test('a scouted player survives the population cap', () => {
  const g = boot(5501);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const reports = scoutOnce(g);
  assert.ok(reports.length > 0, 'the mission returned a report');
  const scoutedIds = reports.map((r) => r.realId);

  floodFreeAgents(g);
  g.PPM.gameplay.pruneCareerData();

  const live = new Set(G().players.map((p) => p.id));
  const lost = scoutedIds.filter((id) => !live.has(id));
  assert.deepEqual(lost, [],
    'the club paid to find him — he must not be culled as surplus');
});

test('the report stays signable after the cap has run', () => {
  const g = boot(5502);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const [report] = scoutOnce(g);
  floodFreeAgents(g);
  g.PPM.gameplay.pruneCareerData();

  const target = G().players.find((p) => p.id === report.realId);
  assert.ok(target, 'the scouted player is still in the world');
  const exp = g.PPM.gameplay.contractExpect(target, G().myTeamId);
  g._negSal = exp.salary; g._negYrs = exp.years; g._negBonus = 0; g._negRole = exp.role;
  g.PPM.gameplay.doNegotiate(target.id);
  assert.equal(target.teamId, G().myTeamId, 'and signing him actually works');
});

test('a report whose player is genuinely gone is cleared, not left dangling', () => {
  const g = boot(5503);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const [report] = scoutOnce(g);
  // Simulate the player leaving the world for a reason the cap does not cover.
  G().players = G().players.filter((p) => p.id !== report.realId);
  g.PPM.gameplay.pruneCareerData();

  assert.equal((G().scoutResults || []).some((r) => r.realId === report.realId), false,
    'a report pointing at nobody must not stay on the scouting screen');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('scout')), [],
    'and the world passes the scouting invariant');
});

test('scouting pointers stay valid across repeated season cleanups', () => {
  const g = boot(5504);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  for (let season = 0; season < 6; season++) {
    scoutOnce(g, 'Mazowsze');
    floodFreeAgents(g, 80);
    g.PPM.gameplay.pruneCareerData();
    const problems = checkWorld(G()).filter((p) => p.includes('[scouting]'));
    assert.deepEqual(problems, [], `season ${season + 1}: scouting references intact`);
  }
  // The reports themselves must not pile up without bound either.
  assert.ok((G().scoutResults || []).length <= 40,
    `scout reports stay bounded (${(G().scoutResults || []).length})`);
});

// ── loans ────────────────────────────────────────────────────────────────────
// `loanedOut` means "our player, currently away". The two directions of the same
// loan record therefore mean opposite things: a player we LENT carries the
// borrower's teamId and must be flagged (so he is not offered for transfer by
// his own club); a player we BORROWED carries our teamId, is ours to field, and
// must NOT be flagged. Getting that backwards is invisible until the season ends.
test('a borrowed player is ours to field and returns home at the season end', () => {
  const g = boot(5601);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  // Put a loan offer on the shelf from a club that is not ours.
  const target = G().players.find((p) => p.teamId !== null && p.teamId !== G().myTeamId
    && !p.retired && (p.contractYears || 0) >= 2);
  const parent = target.teamId;
  G().transferMarket.push({ playerId: target.id, type: 'loan', fee: 0, share: 0.6, tier: 'loan' });

  gp.doBorrowIn(target.id);

  assert.equal(target.teamId, G().myTeamId, 'he plays for us now');
  assert.equal(!!target.loanedOut, false, 'and is not flagged as away from us');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('[loans]')), [],
    'the loan record is consistent while he is here');

  gp.returnLoans();
  assert.equal(target.teamId, parent, 'and he goes back to his club at the season end');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('[loans]')), [],
    'and the closed loan leaves nothing dangling');
});

test('a player we lend out is flagged away and comes back', () => {
  const g = boot(5602);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = () => g.PPM.state.G;

  const mine = G().players.filter((p) => p.teamId === G().myTeamId && !p.retired);
  const lent = mine.find((p) => gp.canLoanOut(p.id).ok);
  assert.ok(lent, 'the squad has someone who can be lent out');
  const borrower = G().teams.find((t) => t.id !== G().myTeamId && t.league === 2 && !t.isPlayer);

  // doLoanOut can be refused by the borrowing club; retry until it takes.
  let guard = 0;
  while (!lent.loanedOut && guard++ < 40) gp.doLoanOut(lent.id, borrower.id, 0.5);
  assert.equal(lent.loanedOut, true, 'he is away');
  assert.equal(lent.teamId, borrower.id, 'carrying the borrower\'s club id');
  assert.equal(G().loans.find((loan) => loan.playerId === lent.id).fromTeamId, G().myTeamId,
    'the loan records the validated owner as its source');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('[loans]')), []);

  gp.returnLoans();
  assert.equal(lent.teamId, G().myTeamId, 'and he is ours again at the season end');
  assert.equal(lent.loanedOut, false, 'with the flag cleared');
  assert.deepEqual(checkWorld(G()).filter((p) => p.includes('[loans]')), []);
});

test('the loan mutator rechecks stale eligibility before randomness or mutation', () => {
  const scenarios = [
    ['final contract year', (player) => { player.contractYears = 1; }, 'loan.finalYear'],
    ['new injury', (player) => { player.injuredFor = 2; }, 'loan.injured'],
  ];

  for (const [label, makeIneligible, reasonKey] of scenarios) {
    const g = boot(label === 'final contract year' ? 5603 : 5604);
    const gp = g.PPM.gameplay;
    gp.newGame(0, 'PL');
    const G = g.PPM.state.G;
    const player = gp.getClubSeniorPlayers(G.myTeamId).find((candidate) => {
      candidate.contractYears = 2;
      candidate.injuredFor = 0;
      candidate.joinedViaTransfer = false;
      return gp.canLoanOut(candidate.id).ok;
    });
    assert.ok(player, `${label}: fixture starts eligible`);
    const borrower = G.teams.find((team) => team.id !== G.myTeamId);
    const beforePlayer = JSON.stringify(player);
    const beforeLoans = JSON.stringify(G.loans);
    let randomCalls = 0;
    let toastMessage = null;
    g.Math.random = () => { randomCalls += 1; return 0; };
    g.toast = (message) => { toastMessage = message; };

    makeIneligible(player);
    const expectedPlayer = JSON.stringify(player);
    gp.doLoanOut(player.id, borrower.id, 0.5);

    assert.notEqual(expectedPlayer, beforePlayer, `${label}: stale modal state changed after opening`);
    assert.equal(JSON.stringify(player), expectedPlayer, `${label}: rejected player state stays unchanged`);
    assert.equal(JSON.stringify(G.loans), beforeLoans, `${label}: no loan record is added`);
    assert.equal(randomCalls, 0, `${label}: eligibility is checked before negotiation randomness`);
    assert.equal(toastMessage, g.t(reasonKey), `${label}: mutator surfaces the canonical refusal reason`);
  }
});

test('only current club players can be offered for an outgoing loan', () => {
  const g = boot(5605);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const aiPlayer = G.players.find((player) => player.teamId !== null && player.teamId !== G.myTeamId && !player.retired);
  const retiredMine = gp.getClubSeniorPlayers(G.myTeamId)[0];
  retiredMine.retired = true;

  assert.deepEqual({ ...gp.canLoanOut(aiPlayer.id) }, { ok: false, reason: g.t('loan.notOwned') });
  assert.deepEqual({ ...gp.canLoanOut(retiredMine.id) }, { ok: false, reason: g.t('loan.retired') });

  const validBorrower = G.teams.find((team) => team.league === 2 && !team.isPlayer);
  const beforeAi = JSON.stringify(aiPlayer);
  const beforeLoans = JSON.stringify(G.loans);
  let randomCalls = 0;
  let message = null;
  g.Math.random = () => { randomCalls += 1; return 0; };
  g.toast = (value) => { message = value; };
  gp.doLoanOut(aiPlayer.id, validBorrower.id, 0.5);
  assert.equal(JSON.stringify(aiPlayer), beforeAi);
  assert.equal(JSON.stringify(G.loans), beforeLoans);
  assert.equal(randomCalls, 0);
  assert.equal(message, g.t('loan.notOwned'));
});

test('the loan mutator rejects invalid borrowers before randomness or state changes', () => {
  const g = boot(5606);
  const gp = g.PPM.gameplay;
  gp.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const player = gp.getClubSeniorPlayers(G.myTeamId).find((candidate) => {
    candidate.contractYears = 2;
    candidate.injuredFor = 0;
    candidate.joinedViaTransfer = false;
    return gp.canLoanOut(candidate.id).ok;
  });
  assert.ok(player);
  const l1 = G.teams.find((team) => team.league === 1 && team.id !== G.myTeamId);
  const l2PlayerTeam = G.teams.find((team) => team.league === 2 && team.id !== G.myTeamId);
  l2PlayerTeam.isPlayer = true;
  const invalidTargets = [
    ['source club', G.myTeamId],
    ['player-controlled club', l2PlayerTeam.id],
    ['Division I club', l1.id],
    ['missing club', 987654],
  ];
  let randomCalls = 0;
  const messages = [];
  g.Math.random = () => { randomCalls += 1; return 0; };
  g.toast = (message) => { messages.push(message); };
  const beforePlayer = JSON.stringify(player);
  const beforeLoans = JSON.stringify(G.loans);

  for (const [label, targetId] of invalidTargets) {
    gp.doLoanOut(player.id, targetId, 0.5);
    assert.equal(JSON.stringify(player), beforePlayer, `${label}: player is unchanged`);
    assert.equal(JSON.stringify(G.loans), beforeLoans, `${label}: loans are unchanged`);
  }

  assert.equal(randomCalls, 0);
  assert.deepEqual(messages, invalidTargets.map(() => g.t('loan.invalidBorrower')));
});
