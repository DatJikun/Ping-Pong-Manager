const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');

function bootWithPages(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });
  return g;
}

function marketRow(html, name) {
  const start = html.indexOf(`<span class="pname">${name}</span>`);
  assert.notEqual(start, -1, `${name} is rendered in the market`);
  const rowStart = html.lastIndexOf('<tr', start);
  const rowEnd = html.indexOf('</tr>', start);
  return html.slice(rowStart, rowEnd + 5);
}

function setPlayerOvr(player, value) {
  for (const stat of ['fh', 'bh', 'srv', 'ret', 'foot', 'men']) player[stat] = value;
}

function setPlayerCurrentOvr60(player) {
  setPlayerOvr(player, 59);
  player.fh = 63;
}

function setControlledRating(player, name, current, ceiling) {
  player.name = name;
  player.equipment = { blade: 'ALL', sponge: 'SREDNIA' };
  setPlayerOvr(player, current);
  if (ceiling === undefined) delete player.ceiling;
  else player.ceiling = ceiling;
  return player;
}

function setControlledStaff(staff, name, current, ceiling) {
  staff.name = name;
  staff.age = staff.peakAge = 52;
  if (staff.type === 'coach') {
    staff.tactics = staff.training = staff.motivation = staff.synergy = current;
  } else if (staff.type === 'scout') {
    staff.accuracy = staff.network = current;
  } else if (staff.type === 'physio') {
    staff.injReduction = staff.recovery = staff.prevention = current;
  } else if (staff.type === 'psychologist') {
    staff.moraleBoost = staff.mentalTraining = staff.pressure = current;
  }
  if (ceiling === undefined) delete staff.ceiling;
  else staff.ceiling = ceiling;
  return staff;
}

function ratingAfter(html, name) {
  const start = html.indexOf(name);
  assert.notEqual(start, -1, `${name} is rendered`);
  const match = html.slice(start).match(/<span class="rating-stars [\s\S]*?<span class="rating-stars__ovr">\d+<\/span><\/span>/);
  assert.ok(match, `${name} is followed by a shared rating`);
  return match[0];
}

function visibleText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertSummaryRating(html, player, current, hiddenPeaks = []) {
  const rating = ratingAfter(html, player.name);
  assert.match(rating, /rating-stars--summary/);
  assert.equal((rating.match(/rating-stars__slot/g) || []).length, 5);
  assert.match(rating, new RegExp(`rating-stars__ovr">${current}<`));
  const root = rating.match(/<span class="rating-stars[^>]*>/)?.[0] || '';
  assert.doesNotMatch(root, /\btitle=/);
  const aria = root.match(/aria-label="([^"]*)"/)?.[1] || '';
  assert.match(aria, new RegExp(`(?:Current OVR|Aktualne OVR) ${current}\\b`), `${player.name} names current OVR accessibly`);
  for (const peak of hiddenPeaks) {
    assert.doesNotMatch(aria, new RegExp(`\\b${peak}\\b`), `${player.name} hides peak ${peak} from accessibility text`);
  }
  return rating;
}

function assertNoRawTranslationKey(html) {
  assert.doesNotMatch(visibleText(html), /\b(?:rating|staff|history)\.[a-z][a-zA-Z.]*\b/);
}

function assertNoPotentialNumber(html, peak) {
  assert.doesNotMatch(
    visibleText(html),
    new RegExp(`(?:peak(?: OVR)?|potential|ceiling|szczytowe OVR|sufit)[^0-9]{0,12}${peak}\\b`, 'i'),
  );
}

test('transfer rows show current rating with a non-disclosing peak outline', () => {
  const g = bootWithPages(4201);
  const G = g.PPM.state.G;
  const player = G.players.find(p => p.teamId !== G.myTeamId && p.role !== 'youth');
  const staff = G.staff.find(s => s.teamId !== null && s.teamId !== G.myTeamId && s.type === 'coach');
  assert.ok(player, 'controlled player fixture exists');
  assert.ok(staff, 'controlled staff fixture exists');

  player.name = 'Current Player';
  player.teamId = null;
  player.equipment = null;
  player.ceiling = 95;
  setPlayerOvr(player, 59);
  G.transferMarket = [{ playerId: player.id, type: 'transfer', fee: 0 }];
  staff.name = 'Current Staff';
  staff.age = staff.peakAge = 52;
  staff.tactics = staff.training = staff.motivation = staff.synergy = 54;
  staff.ceiling = 91;

  g.PPM.ui.marketTypeFilter = 'player';
  const playerRow = marketRow(g.PPM.pages.pageMarket(), player.name);
  g.PPM.ui.marketTypeFilter = 'coach';
  const staffRow = marketRow(g.PPM.pages.pageMarket(), staff.name);

  for (const row of [playerRow, staffRow]) {
    assert.match(row, /rating-stars--compact/);
    assert.equal((row.match(/rating-stars__ovr/g) || []).length, 1);
    const visibleText = row.replace(/<[^>]*>/g, ' ');
    assert.doesNotMatch(visibleText, /\bPeak\b|peak OVR|95|91/i);
    const ratingRoot = row.match(/<span class="rating-stars[^>]*>/)?.[0] || '';
    assert.doesNotMatch(ratingRoot, /\btitle=/);
    const aria = ratingRoot.match(/aria-label="([^"]*)"/)?.[1] || '';
    assert.doesNotMatch(aria, /95|91/);
  }
});

test('transfer market minimum stars filters on current OVR, not peak OVR', () => {
  const g = bootWithPages(4202);
  const G = g.PPM.state.G;
  const player = G.players.find(p => p.teamId !== G.myTeamId && p.role !== 'youth');
  assert.ok(player, 'controlled player fixture exists');

  player.name = 'Current Threshold Player';
  player.teamId = null;
  player.equipment = null;
  player.ceiling = 95;
  setPlayerOvr(player, 59);
  assert.equal(g.PPM.gameplay.ovr(player), 59);
  G.transferMarket = [{ playerId: player.id, type: 'transfer', fee: 0 }];
  g.PPM.ui.marketTypeFilter = 'player';
  g.PPM.ui.mktStars = 3;

  assert.doesNotMatch(g.PPM.pages.pageMarket(), /Current Threshold Player/);
  player.equipment = null;
  setPlayerCurrentOvr60(player);
  assert.equal(g.PPM.gameplay.ovr(player), 60);
  assert.match(g.PPM.pages.pageMarket(), /Current Threshold Player/);
  player.equipment = null;
  setPlayerOvr(player, 59);
  player.ceiling = 100;
  assert.doesNotMatch(g.PPM.pages.pageMarket(), /Current Threshold Player/);
});

test('staff cards, negotiations and club overview rows use shared summary disclosure', () => {
  const g = bootWithPages(4206);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  let owned = G.staff.find(staff => staff.teamId === G.myTeamId && staff.type === 'coach');
  if (!owned) {
    owned = gp.genStaff('coach', G.countryId);
    owned.teamId = G.myTeamId;
    G.staff.push(owned);
  }
  setControlledStaff(owned, 'Summary Club Coach', 64, 93);
  let scout = G.staff.find(staff => staff.teamId === G.myTeamId && staff.type === 'scout');
  if (!scout) {
    scout = gp.genStaff('scout', G.countryId);
    scout.teamId = G.myTeamId;
    G.staff.push(scout);
  }
  setControlledStaff(scout, 'Summary Academy Scout', 63, 94);
  const external = G.staff.find(staff => staff.teamId !== null && staff.teamId !== G.myTeamId && staff.type === 'coach');
  assert.ok(external, 'external staff fixture exists');
  setControlledStaff(external, 'Summary Market Coach', 62, 95);
  const player = setControlledRating(
    gp.getClubSeniorPlayers(G.myTeamId)[0], 'Summary Overview Player', 65, 96,
  );
  G.staffHistory[owned.id] = [
    { season: 1, ovr: 61 },
    { season: 2, ovr: 67 },
  ];

  const renderSurfaces = () => {
    g.PPM.ui.squadTab = 'youth';
    g.PPM.ui.academyTab = 'scouts';
    g.PPM.ui.marketTypeFilter = 'coach';
    g.PPM.ui.historyTab = 'coaches';
    const pages = {
      owned: g.PPM.pages.pageStaff(),
      academy: g.PPM.pages.pageSquad(),
      market: g.PPM.pages.pageMarket(),
      history: g.PPM.pages.pageHistory(),
    };
    gp.openStaffNeg(owned.id);
    pages.negotiation = g.document.getElementById('modal').innerHTML;
    gp.openTeamOverview(G.myTeamId);
    pages.overview = g.document.getElementById('modal').innerHTML;
    return pages;
  };

  for (const locale of ['en', 'pl']) {
    g.PPM.i18n.setLocale(locale);
    const pages = renderSurfaces();
    for (const html of Object.values(pages)) assertNoRawTranslationKey(html);

    assertSummaryRating(pages.owned, owned, 64, [93]);
    assertNoPotentialNumber(pages.owned, 93);
    assertSummaryRating(pages.academy, scout, 63, [94]);
    assertNoPotentialNumber(pages.academy, 94);
    assertSummaryRating(pages.market, external, 62, [95]);
    assertNoPotentialNumber(pages.market, 95);
    assertSummaryRating(pages.history, owned, 64, [93]);
    assertNoPotentialNumber(pages.history, 93);
    assertSummaryRating(pages.negotiation, owned, 64, [93]);
    assertNoPotentialNumber(pages.negotiation, 93);
    assertSummaryRating(pages.overview, player, 65, [96]);
    assertSummaryRating(pages.overview, owned, 64, [93]);
    assertNoPotentialNumber(pages.overview, 96);
    assertNoPotentialNumber(pages.overview, 93);

    assert.match(visibleText(pages.owned), locale === 'en' ? /52 yrs · peak age 52/ : /52 lat · wiek szczytu 52/);
    assert.match(visibleText(pages.history), locale === 'en'
      ? /History: 61 → 67 \/ Recorded high OVR 67/
      : /Historia: 61 → 67 \/ Zapisane najwyższe OVR 67/);
  }
});

test('staff profiles disclose only explicit positive persisted ceilings', () => {
  const g = bootWithPages(4207);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  let known = G.staff.find(staff => staff.teamId === G.myTeamId && staff.type === 'coach');
  if (!known) {
    known = gp.genStaff('coach', G.countryId);
    known.teamId = G.myTeamId;
    G.staff.push(known);
  }
  setControlledStaff(known, 'Known Peak Coach', 64, 92);
  const unknown = G.staff.find(staff => staff.id !== known.id && staff.teamId !== null && staff.type === 'coach');
  assert.ok(unknown, 'unknown staff fixture exists');
  setControlledStaff(unknown, 'Unknown Peak Staff', 63, undefined);

  gp.openStaffModal(known.id);
  let html = g.document.getElementById('modal').innerHTML;
  assert.equal((html.match(/<span class="rating-stars [^"]*rating-stars--profile[^"]*"/g) || []).length, 1);
  assert.equal((html.match(/rating-stars__slot/g) || []).length, 5);
  assert.match(html, /rating-stars__ovr">64</);
  assert.equal((visibleText(html).match(/Peak OVR 92/g) || []).length, 1);
  assert.match(visibleText(html), /52 yrs · peak age 52/);
  assertNoRawTranslationKey(html);

  gp.openStaffModal(unknown.id);
  html = g.document.getElementById('modal').innerHTML;
  assert.equal((html.match(/<span class="rating-stars [^"]*rating-stars--profile[^"]*"/g) || []).length, 1);
  assert.equal((html.match(/rating-stars__slot/g) || []).length, 5);
  assert.match(html, /rating-stars__ovr">63</);
  assert.doesNotMatch(visibleText(html), /Peak OVR \d+/);
  assert.match(visibleText(html), /52 yrs · peak age 52/);
  assert.ok(Number.isFinite(unknown.ceiling) && unknown.ceiling > 0,
    'opening may synthesize metadata without making the original ceiling known');

  unknown.ceiling = 0;
  gp.openStaffModal(unknown.id);
  html = g.document.getElementById('modal').innerHTML;
  assert.doesNotMatch(visibleText(html), /Peak OVR \d+/);

  g.PPM.i18n.setLocale('pl');
  gp.openStaffModal(known.id);
  html = g.document.getElementById('modal').innerHTML;
  assert.equal((visibleText(html).match(/Szczytowe OVR 92/g) || []).length, 1);
  assert.match(visibleText(html), /52 lat · wiek szczytu 52/);
  assertNoRawTranslationKey(html);
});

test('dashboard, squad, academy, loan and league player summaries use shared non-disclosing ratings', () => {
  const g = bootWithPages(4203);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  const senior = setControlledRating(seniors[0], 'Summary Senior', 62, 84);
  G.lastMatchSelection = {
    base: seniors.slice(0, 3).map(player => player.id),
    reserves: seniors.slice(3, 5).map(player => player.id),
  };

  const dashboard = g.PPM.pages.pageDash();
  assertSummaryRating(dashboard, senior, 62, [84]);
  assertNoPotentialNumber(dashboard, 84);

  g.PPM.ui.squadTab = 'squad';
  const squad = g.PPM.pages.pageSquad();
  assertSummaryRating(squad, senior, 62, [84]);
  assertNoPotentialNumber(squad, 84);

  const youth = setControlledRating(gp.genYouthPlayer(G.myTeamId, G.countryId), 'Summary Youth', 61, 86);
  youth.teamId = G.myTeamId;
  youth.role = 'youth';
  youth.isYouth = true;
  youth.academyProfile = { ...(youth.academyProfile || {}), ceiling: 86, region: 'Test Region' };
  G.players.push(youth);
  g.PPM.ui.squadTab = 'youth';
  g.PPM.ui.academyTab = 'squad';
  const academySquad = g.PPM.pages.pageSquad();
  assertSummaryRating(academySquad, youth, 61, [86]);
  assertNoPotentialNumber(academySquad, 86);

  const prospect = setControlledRating(gp.genYouthPlayer(G.myTeamId, G.countryId), 'Summary Prospect', 60, 88);
  prospect.academyProfile = { ...(prospect.academyProfile || {}), ceiling: 88, region: 'Intake Region' };
  G.infraAcademy = 1;
  G.academyProspects = [prospect];
  g.PPM.ui.academyTab = 'intake';
  const intake = g.PPM.pages.pageSquad();
  assertSummaryRating(intake, prospect, 60, [88]);
  assertNoPotentialNumber(intake, 88);

  const reportReal = G.players.find(player => player.teamId !== G.myTeamId && player.role !== 'youth');
  setControlledRating(reportReal, 'Hidden Real Prospect', 62, 91);
  const reported = { ...reportReal, name: 'Estimated Scout Prospect', ceilingHint: 83 };
  setPlayerOvr(reported, 62);
  G.scoutResults = [{ realId: reportReal.id, reported, region: 'Report Region', seen: true }];
  g.PPM.ui.academyTab = 'reports';
  const report = g.PPM.pages.pageSquad();
  const reportRating = assertSummaryRating(report, reported, 62, [83, 91]);
  assert.match(reportRating, /rating-stars__clip--peak" style="width:15%"/,
    'the fifth outline uses the reported 83 estimate, not the real 91 ceiling');
  assertNoPotentialNumber(report, 83);
  assertNoPotentialNumber(report, 91);

  senior.leagueSeasonPointsWon = 999;
  const myLeague = G.teams.find(team => team.id === G.myTeamId).league;
  g.PPM.ui.leagueTab = myLeague === 1 ? 'l1' : 'l2';
  g.PPM.ui.leagueStatsTab = 'points_for';
  const league = g.PPM.pages.pageLeague();
  assertSummaryRating(league, senior, 62, [84]);
  assertNoPotentialNumber(league, 84);
});

test('loaned-out and loaned-in squad cards retain base OVR through shared ratings', () => {
  const g = bootWithPages(4204);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const borrower = G.teams.find(team => team.id !== G.myTeamId);
  const lender = G.teams.find(team => team.id !== G.myTeamId && team.id !== borrower.id);
  const loanedOut = setControlledRating(gp.getClubSeniorPlayers(G.myTeamId)[0], 'Shared Loan Out', 63, 87);
  const loanedIn = setControlledRating(
    G.players.find(player => player.teamId === lender.id && player.role !== 'youth'),
    'Shared Loan In', 64, 89,
  );
  loanedOut.teamId = borrower.id;
  loanedOut.loanedOut = true;
  loanedIn.teamId = G.myTeamId;
  G.loans = [
    { playerId: loanedOut.id, fromTeamId: G.myTeamId, toTeamId: borrower.id, returned: false },
    { playerId: loanedIn.id, fromTeamId: lender.id, toTeamId: G.myTeamId, returned: false, wageShare: 0.6 },
  ];
  g.PPM.ui.squadTab = 'loans';
  const loans = g.PPM.pages.pageSquad();
  assertSummaryRating(loans, loanedOut, 63, [87]);
  assertSummaryRating(loans, loanedIn, 64, [89]);
  assertNoPotentialNumber(loans, 87);
  assertNoPotentialNumber(loans, 89);
});

test('runtime player modals, live HUD and Top-12 cards use shared summary disclosure', async () => {
  const g = bootWithPages(4205);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  const player = setControlledRating(seniors[0], 'Runtime Summary Player', 62, 84);
  player.contractYears = 3;
  player.injuredFor = 0;
  player.leagueSeasonW = 999;
  player.leagueSeasonL = 0;
  player.leagueSeasonD = 0;

  gp.openMatchNomination(() => {});
  let html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, player, 62, [84]);
  assertNoPotentialNumber(html, 84);

  gp.openLoanModal(player.id);
  html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, player, 62, [84]);
  assertNoPotentialNumber(html, 84);

  const freeAgent = setControlledRating(
    G.players.find(candidate => candidate.teamId === null && !candidate.retired),
    'Runtime Negotiation Player', 64, 90,
  );
  gp.openNegotiate(freeAgent.id);
  html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, freeAgent, 64, [90]);
  assertNoPotentialNumber(html, 90);

  const opponent = G.teams.find(team => team.league === gp.myLeague() && team.id !== G.myTeamId);
  const opponentPlayer = G.players.find(candidate => candidate.teamId === opponent.id && candidate.role !== 'youth');
  const hud = gp.renderVME(
    G.teams.find(team => team.id === G.myTeamId), opponent,
    [{ homePlayer: player.id, awayPlayer: opponentPlayer.id, setScores: [{ home: 11, away: 8 }], homeWin: true }],
    0, 0, 0, true, { setIndex: 0, home: 0, away: 0 },
  );
  assertSummaryRating(hud, player, 62, [84]);
  assertNoPotentialNumber(hud, 84);

  G.phase = 'pre';
  G.matchday = 21;
  G.top12MastersDone = { 1: false, 2: false };
  const leagueId = gp.myLeague();
  gp.openTop12Picker(leagueId);
  html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, player, 62, [84]);
  assertNoPotentialNumber(html, 84);

  g.setTimeout = callback => { callback(); return 0; };
  await gp.runTop12Masters(leagueId);
  html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, player, 62, [84]);
  assertNoPotentialNumber(html, 84);

  const prospect = setControlledRating(gp.genYouthPlayer(G.myTeamId, G.countryId), 'Legacy Intake Player', 60, 88);
  prospect.academyProfile = { ...(prospect.academyProfile || {}), ceiling: 88 };
  G.infraAcademy = 1;
  G.academyProspects = [prospect];
  gp.pullYouth();
  html = g.document.getElementById('modal').innerHTML;
  assertSummaryRating(html, prospect, 60, [88]);
  assertNoPotentialNumber(html, 88);
});
