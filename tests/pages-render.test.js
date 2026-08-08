// =============================================================================
// tests/pages-render.test.js — every screen the player can reach must render.
//
// pages.js is the one file where a bad merge, a removed feature or a renamed
// helper produces nothing until the moment a real player clicks the tab — the
// unit tests parse the file and exercise the engine, but never actually build a
// screen. This walks every navigation target in index.html and renders it, in
// both locales, in the three career phases, on a fresh world and on a world that
// has been running for a few seasons.
//
// It asserts almost nothing about the CONTENT on purpose: the point is that the
// page produces markup instead of throwing, which is the failure this catches.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');

// The nav is the contract: whatever index.html offers, the player can click.
function navTargets() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...new Set([...html.matchAll(/go\('([a-z0-9]+)'\)/g)].map((m) => m[1]))];
}

// pages.js is DOM-bound, so it is not part of the headless harness load order.
function bootWithPages(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  assert.equal(typeof g.PPM.ratingStars?.renderRating, 'function',
    'pages load after the shared rating renderer');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });
  return g;
}

// Drives the REAL route (renderApp -> the page's branch) rather than guessing a
// function name, and captures what lands in #content so the markup can be read.
function renderPage(g, page) {
  let captured = '';
  const realGet = g.document.getElementById;
  g.document.getElementById = function (id) {
    const el = realGet.call(this, id);
    if (id === 'content') Object.defineProperty(el, 'innerHTML', {
      configurable: true, get: () => captured, set: (v) => { captured = String(v); },
    });
    return el;
  };
  try {
    g.PPM.ui.page = page;
    g.PPM.pages.renderApp();
  } finally {
    g.document.getElementById = realGet;
  }
  return captured;
}

function visibleText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function visiblePeakRows(profileHtml, label = 'Peak OVR') {
  return visibleText(profileHtml).match(new RegExp(`${label}\\s*:?\\s*\\d+`, 'gi')) || [];
}

function setPlayerOvr(player, value) {
  for (const stat of ['fh', 'bh', 'srv', 'ret', 'foot', 'men']) player[stat] = value;
  player.equipment = { blade: 'ALL', sponge: 'SREDNIA' };
}

test('every navigation target in index.html renders', () => {
  const g = bootWithPages(9001);
  const targets = navTargets();
  assert.ok(targets.length >= 10, `found ${targets.length} nav targets`);

  const broken = [];
  for (const page of targets) {
    try {
      const html = renderPage(g, page);
      if (typeof html !== 'string' || html.length < 20) broken.push(`${page}: produced no markup`);
      if (/undefined|\[object Object\]|NaN/.test(html)) {
        broken.push(`${page}: markup contains ${html.match(/undefined|\[object Object\]|NaN/)[0]}`);
      }
    } catch (error) {
      broken.push(`${page}: ${error.message}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every screen survives all three career phases', () => {
  const g = bootWithPages(9002);
  const targets = navTargets();
  const broken = [];
  for (const phase of ['preseason', 'pre', 'transfer']) {
    g.PPM.state.G.phase = phase;
    for (const page of targets) {
      try { renderPage(g, page); } catch (error) { broken.push(`${phase}/${page}: ${error.message}`); }
    }
  }
  assert.deepEqual(broken, []);
});

test('every screen renders in both locales', () => {
  const g = bootWithPages(9003);
  const targets = navTargets();
  const broken = [];
  for (const locale of ['en', 'pl']) {
    g.PPM.i18n.setLocale(locale);
    for (const page of targets) {
      try {
        const html = renderPage(g, page);
        // A missing key renders as the raw dotted key — visible to the player.
        const raw = html.match(/[>"\s]([a-z][a-zA-Z0-9]+\.[a-zA-Z0-9.]{3,})[<"\s]/);
        if (raw && !/\d/.test(raw[1]) && !raw[1].includes('.js')) {
          broken.push(`${locale}/${page}: looks like an untranslated key "${raw[1]}"`);
        }
      } catch (error) {
        broken.push(`${locale}/${page}: ${error.message}`);
      }
    }
  }
  g.PPM.i18n.setLocale('en');
  assert.deepEqual(broken, []);
});

test('Cup and dashboard explain the club Cup state and reward ladder in English and Polish', () => {
  const g = bootWithPages(9019);
  const G = g.PPM.state.G;
  const mine = { id: G.myTeamId, name: 'My Club', isReal: true };
  const opponent = { id: 9919, name: 'Cup Opponent', isReal: true };
  G.cup = { rounds: [[{ home: mine, away: opponent, result: null }]], currentRound: 0, finished: false, winner: null };
  G.matchday = 3;
  G.cupPlayedThisSeason = false;

  for (const [locale, expected] of Object.entries({
    en: ['32-team single-elimination', 'After matchdays 4, 8, 12, 16 and 20', 'Winner: €35,000', 'Next round after matchday 4'],
    pl: ['32 drużyny w systemie pucharowym', 'Po kolejkach 4, 8, 12, 16 i 20', 'Zwycięzca: 35 000 €', 'Następna runda po kolejce 4'],
  })) {
    g.PPM.i18n.setLocale(locale);
    const cup = visibleText(renderPage(g, 'cup'));
    const dash = visibleText(renderPage(g, 'dash'));
    for (const text of expected) assert.match(cup, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${locale} Cup page: ${text}`);
    assert.match(dash, new RegExp(expected[3].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${locale} dashboard: next trigger`);
  }
});

test('the squad page and dashboard use one ordered senior match squad', () => {
  const g = bootWithPages(9004);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId).slice(0, 6);
  const selected = [seniors[4], seniors[1], seniors[5], seniors[0], seniors[3]];
  G.lastMatchSelection = {
    base: selected.slice(0, 3).map((player) => player.id),
    reserves: selected.slice(3).map((player) => player.id),
  };
  selected.forEach((player, index) => {
    const value = 42 + index;
    player.fh = player.bh = player.srv = player.ret = player.foot = player.men = value;
  });
  selected[1].injuredFor = 2;
  const loaned = seniors.find((player) => !selected.includes(player));
  const borrower = G.teams.find((team) => team.id !== G.myTeamId);
  G.loans.push({ playerId: loaned.id, fromTeamId: G.myTeamId, toTeamId: borrower.id, returned: false, originalRole: 'senior' });
  loaned.teamId = borrower.id;
  loaned.loanedOut = true;

  g.PPM.ui.squadTab = 'squad';
  for (const locale of ['en', 'pl']) {
    g.PPM.i18n.setLocale(locale);
    const squad = g.PPM.pages.pageSquad();
    const visibleText = squad.replace(/<[^>]*>/g, ' ');
    for (const player of gp.getClubSeniorPlayers(G.myTeamId, true)) {
      assert.equal(visibleText.split(player.name).length - 1, 1, `${locale}: ${player.name} appears once`);
    }
    assert.doesNotMatch(squad, /First team|Skład główny|promoteToStarter|demoteToReserve/);
    assert.match(squad, /A —|A —/);
    assert.match(squad, locale === 'en' ? /Injured.*2 round/i : /Kontuzja.*2/i);
    assert.match(squad, new RegExp(borrower.name));
    assert.doesNotMatch(squad, />\s*(?:squad|match\.nom)\.[a-zA-Z.]+\s*</);
  }

  g.PPM.i18n.setLocale('en');
  const dash = g.PPM.pages.pageDash();
  const positions = selected.map((player) => dash.indexOf(player.name));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'dashboard keeps A/B/C/R1/R2 order');
});

test('dashboard resolves the selected technical partner and semantic news', () => {
  const g = bootWithPages(9010);
  g.PPM.i18n.setLocale('en');
  g.PPM.state.G.techContract = {
    partnerId: 'tp_national', rubberId: 'speed', termYears: 1, yearsLeft: 1,
    signedSeason: 1, annualCashflow: -1200,
  };
  g.PPM.state.G.techPartnership = 'tp_national';
  g.PPM.state.G.newsFeed = [{
    msgKey: 'news.newManager',
    msgParams: { club: 'Test Club', season: 1 },
    type: 'hot',
    season: 1,
    matchday: 0,
  }];

  const html = renderPage(g, 'dash');
  assert.match(html, /PulseForge Performance/);
  assert.match(html, /A new manager takes over Test Club ahead of season 1\./);
  assert.doesNotMatch(html, /undefined/);
});

test('sponsor screens localize semantic and historic tier values', () => {
  const g = bootWithPages(9012);
  const G = g.PPM.state.G;
  G.sponsors = [];
  G.sponsorOffers = [
    { id: 8001, name: 'Test Local', tier: 'Lokalny', goal: 'none', reward: 20000, maxYears: 1 },
    { id: 8002, name: 'Test Elite', tier: 'elite', goal: 'top3', reward: 90000, maxYears: 2 },
  ];

  g.PPM.i18n.setLocale('en');
  const english = `${g.PPM.pages.pageSponsors()} ${g.PPM.pages.pagePreseason()}`;
  assert.match(english, /Test Local[^]*Local/);
  assert.match(english, /Test Elite[^]*Elite/);
  assert.doesNotMatch(english, /Lokalny|Regionalny|Krajowy|Elitarny/);
  assert.doesNotMatch(english, /sponsor\.tier\./);

  g.PPM.i18n.setLocale('pl');
  const polish = `${g.PPM.pages.pageSponsors()} ${g.PPM.pages.pagePreseason()}`;
  assert.match(polish, /Test Local[^]*Lokalny/);
  assert.match(polish, /Test Elite[^]*Elitarny/);
  assert.doesNotMatch(polish, /sponsor\.tier\./);
});

test('Club defers contract choices to preseason instead of offering midseason signing', () => {
  const g = bootWithPages(9013);
  g.PPM.i18n.setLocale('en');
  g.PPM.state.G.seasonHistory = [{ position: 1 }];

  const club = g.PPM.pages.pageClub();
  assert.match(club, /Sign a partner during preseason/i);
  assert.doesNotMatch(club, /selectTechPartnership\(/);
});

test('technical contracts render one active Club summary and preseason-only term choices', () => {
  const g = bootWithPages(9015);
  const G = g.PPM.state.G;
  g.PPM.i18n.setLocale('en');

  const noDeal = g.PPM.pages.pageClub();
  assert.match(noDeal, /Sign a partner during preseason/i);
  assert.doesNotMatch(noDeal, /selectTechPartnership\(/);
  assert.doesNotMatch(noDeal, /Club rubbers|setRubberTier/);

  g.PPM.ui.preStep = 1;
  const offers = g.PPM.pages.pagePreseason();
  assert.match(offers, /Choose a contract length/i);
  assert.match(offers, /id="tpy-tp_local"/);
  assert.match(offers, /1 season\s*\(-€1,000\)/);
  assert.match(offers, /2 seasons\s*\(-€960\)/);
  assert.match(offers, /3 seasons\s*\(-€920\)/);
  assert.match(offers, /selectTechPartnership\('tp_local',\(document\.getElementById\('tpy-tp_local'\)/);

  G.techContract = {
    partnerId: 'tp_pro', rubberId: 'offensive', termYears: 2, yearsLeft: 1,
    signedSeason: 0, annualCashflow: -1600,
  };
  G.techPartnership = 'tp_pro';
  const active = g.PPM.pages.pageClub();
  assert.match(active, /Offensive profile/);
  assert.match(active, /Offensive rubber/);
  assert.match(active, /Best fit:.*Forehand looper.*Two-winged attacker/i);
  assert.match(active, /FH \+1\s*\/\s*SRV \+1/);
  assert.match(active, /Annual cost\/income:.*-€1,600/i);
  assert.match(active, /1 of 2 seasons remaining/i);
  assert.match(active, /Termination fee:.*€2,500/i);
  assert.match(active, /terminateTechPartnership\(\)/);
  assert.doesNotMatch(active, /tech-card|selectTechPartnership\(/);
  assert.doesNotMatch(active, /undefined|(?:club|pre|equipment)\.[a-z.]+/i);

  const carried = g.PPM.pages.pagePreseason();
  assert.match(carried, /continues from the previous season; replace it through Club with paid termination/i);
  assert.doesNotMatch(carried, /id="tpy-/);
  assert.doesNotMatch(carried, /selectTechPartnership\(/);
});

test('technical-contract effects show exact localized development and commercial benefits', () => {
  const g = bootWithPages(9017);
  const G = g.PPM.state.G;
  const local = {
    partnerId: 'tp_local', rubberId: 'development', termYears: 1, yearsLeft: 1,
    signedSeason: G.season, annualCashflow: -1000,
  };
  const world = {
    partnerId: 'tp_world', rubberId: 'commercial', termYears: 1, yearsLeft: 1,
    signedSeason: G.season, annualCashflow: 3500,
  };

  for (const [locale, development, marketability] of [
    ['en', /5% player development/i, /15% marketability/i],
    ['pl', /5% rozwoju zawodników/i, /15% marketingu/i],
  ]) {
    g.PPM.i18n.setLocale(locale);
    G.techContract = null;
    G.techPartnership = null;
    g.PPM.ui.preStep = 1;
    const offers = g.PPM.pages.pagePreseason();
    assert.match(offers, development, `${locale}: development offer shows its exact bonus`);
    assert.match(offers, marketability, `${locale}: world offer shows its exact bonus`);

    G.techContract = world;
    G.techPartnership = 'tp_world';
    assert.match(g.PPM.pages.pageClub(), marketability,
      `${locale}: active Club summary shows the commercial bonus`);
  }

  let toast = '';
  g.toast = value => { toast = value; };
  g.PPM.i18n.setLocale('en');
  G.techContract = null;
  G.techPartnership = null;
  assert.equal(g.PPM.gameplay.selectTechPartnership('tp_local', 1), true);
  assert.match(toast, /5% player development/i);
  assert.doesNotMatch(toast, /mentalności|rozwoju|okładzina/i,
    'English success toast contains no leaked Polish partner description');
});

test('preseason distinguishes newly signed and carried technical contracts in both locales', () => {
  const g = bootWithPages(9018);
  const G = g.PPM.state.G;
  const contract = {
    partnerId: 'tp_local', rubberId: 'development', termYears: 2, yearsLeft: 2,
    signedSeason: G.season, annualCashflow: -960,
  };

  for (const [locale, newCopy, carriedCopy, policyCopy] of [
    ['en', /signed this preseason/i, /continues from the previous season; replace it through Club with paid termination/i,
      /one active contract at a time[\s\S]*1–3 seasons[\s\S]*paid termination through Club/i],
    ['pl', /podpisano w tym okresie przygotowawczym/i, /trwa z poprzedniego sezonu/i,
      /jedna aktywna umowa[\s\S]*1–3 sezony[\s\S]*płatnego rozwiązania.*Klub/i],
  ]) {
    g.PPM.i18n.setLocale(locale);
    G.techContract = { ...contract, signedSeason: G.season };
    G.techPartnership = 'tp_local';
    g.PPM.ui.preStep = 1;
    const current = g.PPM.pages.pagePreseason();
    assert.match(current, newCopy, `${locale}: current-season signing is new`);
    assert.doesNotMatch(current, carriedCopy, `${locale}: current-season signing is not carried`);
    assert.match(current, policyCopy, `${locale}: contract policy explains terms and termination`);

    G.techContract = { ...contract, signedSeason: G.season - 1 };
    const carried = g.PPM.pages.pagePreseason();
    assert.match(carried, carriedCopy, `${locale}: earlier signing carries over`);
  }
});

test('player modifier explanation uses the contract rubber profile, including legacy packages', () => {
  const g = bootWithPages(9014);
  g.PPM.i18n.setLocale('en');
  const G = g.PPM.state.G;
  const player = g.PPM.gameplay.getClubSeniorPlayers(G.myTeamId)[0];
  G.techContract = {
    partnerId: 'tp_pro', rubberId: 'legacy_pro', termYears: 1, yearsLeft: 1,
    signedSeason: 1, annualCashflow: -1600,
  };
  G.techPartnership = 'tp_pro';

  g.PPM.gameplay.openPlayerModal(player.id);
  const legacy = g.document.getElementById('modal').innerHTML;
  assert.match(legacy, /Personal blade and sponge:/);
  assert.match(legacy, /Partner rubber: Pro rubber/);
  assert.match(legacy, /Partner-rubber modifiers: FH \+2.*SRV \+1.*RET \+1/);
  assert.match(legacy, /FH \+2/);
  assert.match(legacy, /RET \+1/);

  G.techContract = { ...G.techContract, partnerId: 'tp_elite', rubberId: 'balanced' };
  G.techPartnership = 'tp_elite';
  g.PPM.gameplay.openPlayerModal(player.id);
  const balanced = g.document.getElementById('modal').innerHTML;
  assert.match(balanced, /FH \+1/);
  assert.match(balanced, /BH \+1/);
});

test('external player profiles show personal equipment without a hidden club rubber', () => {
  const g = bootWithPages(9016);
  g.PPM.i18n.setLocale('en');
  const G = g.PPM.state.G;
  const external = G.players.find((player) => player.teamId !== null && player.teamId !== G.myTeamId);

  g.PPM.gameplay.openPlayerModal(external.id);
  const profile = g.document.getElementById('modal').innerHTML;
  assert.match(profile, /Personal blade and sponge/i);
  assert.doesNotMatch(profile, /Club rubber/i);
});

test('external player profiles do not attribute personal equipment to a technical partner', () => {
  const g = bootWithPages(9019);
  const G = g.PPM.state.G;
  const external = G.players.find((player) => player.teamId !== null && player.teamId !== G.myTeamId);
  external.equipment = { blade: 'OFF', sponge: 'GRUBA' };

  for (const [locale, equipmentLabel, partnerLabel] of [
    ['en', /Total match-equipment effect/i, /Technical partner/i],
    ['pl', /Łączny wpływ sprzętu meczowego/i, /Partner techniczny/i],
  ]) {
    g.PPM.i18n.setLocale(locale);
    g.PPM.gameplay.openPlayerModal(external.id);
    const profile = g.document.getElementById('modal').innerHTML;
    assert.match(profile, equipmentLabel, `${locale}: aggregate equipment effect is named truthfully`);
    assert.doesNotMatch(profile, partnerLabel,
      `${locale}: personal blade and sponge are not credited to a technical partner`);
  }
});

test('player profile shows one translated peak row only when a trusted positive ceiling is known', () => {
  const g = bootWithPages(9011);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const player = gp.getClubSeniorPlayers(G.myTeamId)[0];
  setPlayerOvr(player, 62);
  player.ceiling = 84;
  delete player.academyProfile;

  gp.openPlayerModal(player.id);
  let profileHtml = g.document.getElementById('modal').innerHTML;
  assert.match(profileHtml, /rating-stars__ovr">62</);
  assert.equal(visiblePeakRows(profileHtml).length, 1);
  assert.match(visiblePeakRows(profileHtml)[0], /Peak OVR.*84/i);
  assert.match(profileHtml, /rating-stars--profile/);

  g.PPM.i18n.setLocale('pl');
  gp.openPlayerModal(player.id);
  profileHtml = g.document.getElementById('modal').innerHTML;
  assert.equal(visiblePeakRows(profileHtml, 'Szczytowe OVR').length, 1);
  assert.match(visiblePeakRows(profileHtml, 'Szczytowe OVR')[0], /Szczytowe OVR.*84/i);
  assert.match(profileHtml, /rating-stars--profile/);

  g.PPM.i18n.setLocale('en');
  const academyKnown = gp.getClubSeniorPlayers(G.myTeamId)[1];
  setPlayerOvr(academyKnown, 62);
  delete academyKnown.ceiling;
  academyKnown.academyProfile = { ...(academyKnown.academyProfile || {}), ceiling: 84 };
  gp.openPlayerModal(academyKnown.id);
  profileHtml = g.document.getElementById('modal').innerHTML;
  assert.equal(visiblePeakRows(profileHtml).length, 1);
  assert.match(visiblePeakRows(profileHtml)[0], /Peak OVR.*84/i);

  const unknown = gp.getClubSeniorPlayers(G.myTeamId)[2];
  setPlayerOvr(unknown, 62);
  unknown.peakAge = 29;
  delete unknown.ceiling;
  if (unknown.academyProfile) delete unknown.academyProfile.ceiling;
  gp.openPlayerModal(unknown.id);
  profileHtml = g.document.getElementById('modal').innerHTML;
  assert.match(profileHtml, /rating-stars--profile/);
  assert.match(profileHtml, /Potential is unknown/i);
  assert.equal(visiblePeakRows(profileHtml).length, 0);
  assert.match(visibleText(profileHtml), /peak 29/i, 'peak age remains visible as age information');
});

test('player profile treats the generated zero ceiling sentinel as unknown', () => {
  const g = bootWithPages(9012);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const player = gp.getClubSeniorPlayers(G.myTeamId)[0];
  setPlayerOvr(player, 62);
  player.ceiling = 0;
  delete player._ceilingEstimated;

  gp.openPlayerModal(player.id);
  const profileHtml = g.document.getElementById('modal').innerHTML;
  assert.match(profileHtml, /rating-stars--profile/);
  assert.match(profileHtml, /Potential is unknown/i);
  assert.equal(visiblePeakRows(profileHtml).length, 0);
});

test('dashboard and squad summaries persist a missing ceiling for exact profile disclosure', () => {
  const g = bootWithPages(9013);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  const player = seniors[0];
  setPlayerOvr(player, 68);
  player.age = 20;
  player.traits = [];
  delete player.ceiling;
  delete player._ceilingEstimated;
  if (player.academyProfile) delete player.academyProfile.ceiling;
  G.lastMatchSelection = {
    base: seniors.slice(0, 3).map(candidate => candidate.id),
    reserves: seniors.slice(3, 5).map(candidate => candidate.id),
  };

  const dashboard = g.PPM.pages.pageDash();
  assert.match(dashboard, new RegExp(`${player.name}[\\s\\S]*?rating-stars--summary`));
  g.PPM.ui.squadTab = 'squad';
  const squad = g.PPM.pages.pageSquad();
  assert.match(squad, new RegExp(`${player.name}[\\s\\S]*?rating-stars--summary`));
  assert.equal(player.ceiling, 86, 'the first summary estimate becomes the persisted ceiling');

  gp.openPlayerModal(player.id);
  const profileHtml = g.document.getElementById('modal').innerHTML;
  assert.match(profileHtml, /rating-stars--profile/);
  assert.doesNotMatch(profileHtml, /Potential is unknown/i);
  assert.equal(visiblePeakRows(profileHtml).length, 1);
  assert.match(visiblePeakRows(profileHtml)[0], /Peak OVR.*86/i);
});

test('the first synthesized ceiling survives player changes and serializes in only the existing field', () => {
  const g = bootWithPages(9014);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const player = gp.getClubSeniorPlayers(G.myTeamId)[0];
  setPlayerOvr(player, 68);
  player.age = 20;
  player.traits = [];
  delete player.academyProfile;
  delete player.ceiling;
  delete player._ceilingEstimated;
  const fieldsBeforeEstimate = new Set(Object.keys(player));

  const firstEstimate = gp.playerCeiling(player);
  player.age = 33;
  setPlayerOvr(player, 75);
  const estimateAfterMutation = gp.playerCeiling(player);
  const savedPlayer = JSON.parse(g.PPM.stateApi.serializeGame()).players
    .find(candidate => candidate.id === player.id);
  const addedFields = Object.keys(player).filter(field => !fieldsBeforeEstimate.has(field));

  assert.equal(firstEstimate, 86);
  assert.equal(estimateAfterMutation, 86, 'age and stat changes cannot recalculate potential');
  assert.equal(player.ceiling, 86);
  assert.equal(savedPlayer.ceiling, 86);
  assert.deepEqual(addedFields, ['ceiling']);
  assert.equal(Object.hasOwn(player, '_ceilingEstimated'), false);
  assert.equal(Object.hasOwn(savedPlayer, '_ceilingEstimated'), false);
});

test('an entity-only positive ceiling remains exact after list rendering', () => {
  const g = bootWithPages(9015);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId);
  const player = seniors[0];
  setPlayerOvr(player, 62);
  player.ceiling = 84;
  delete player.academyProfile;
  G.lastMatchSelection = {
    base: seniors.slice(0, 3).map(candidate => candidate.id),
    reserves: seniors.slice(3, 5).map(candidate => candidate.id),
  };

  const dashboard = g.PPM.pages.pageDash();
  assert.match(dashboard, new RegExp(`${player.name}[\\s\\S]*?rating-stars--summary`));
  gp.openPlayerModal(player.id);
  const profileHtml = g.document.getElementById('modal').innerHTML;

  assert.doesNotMatch(profileHtml, /Potential is unknown/i);
  assert.equal(visiblePeakRows(profileHtml).length, 1);
  assert.match(visiblePeakRows(profileHtml)[0], /Peak OVR.*84/i);
});

test('[slow] every screen still renders after several seasons of a real career', async () => {
  const { runCareer } = require('./lib/career-driver');
  const result = await runCareer({ seasons: 4, seed: 9004, countryId: 'PL' });
  const g = result.sandbox;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });

  const broken = [];
  for (const page of navTargets()) {
    try { renderPage(g, page); } catch (error) { broken.push(`${page}: ${error.message}`); }
  }
  g.__stopGalaClicker();
  assert.deepEqual(broken, [],
    'a screen that only breaks on an aged world is exactly what unit tests miss');
});

test('a removed feature leaves no dangling navigation', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pages = fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8');
  const routed = new Set([...pages.matchAll(/ui\.page===['"]([a-z0-9]+)['"]/g)].map((m) => m[1]));
  const unrouted = navTargets().filter((p) => !routed.has(p));
  assert.deepEqual(unrouted, [],
    'every nav button must have a route in renderApp()');
});
