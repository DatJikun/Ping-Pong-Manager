// =============================================================================
// tests/stress.js — Long-career stability & performance probe.
//
// Simulates many full seasons headlessly (league play + the real endSeason()
// offseason: growth, aging, promotion/relegation, AI signings, new market, new
// schedules) to answer: can a career run ~100 seasons without crashing, without
// slowing down, and without state growing unbounded (memory/lag)?
//
// Run:  node tests/stress.js [seasons]   (default 100)
// =============================================================================

const { boot } = require('./harness');

// Two modes:
//   node tests/stress.js [seasons]          — long-career stability/perf probe
//   node tests/stress.js youth [seasons]    — academy balance probe (below)
const MODE = process.argv[2] === 'youth' ? 'youth' : 'stability';

// ── Academy balance probe ────────────────────────────────────────────────────
// Owner balance target: a well-managed youth-only club (€5k start, OVR ~60) should
// find it HARD but POSSIBLE to build a League-1-quality squad (~80 OVR) purely
// through its academy, over many seasons.
//
// NOTE: the headless harness skips the DOM-bound season-finance path (wages/maint/
// prize/upkeep are charged inside runMatchday, which needs a browser). So this probe
// models the player-club economy EXPLICITLY each season — a rough L2 income, real
// wages, real academy upkeep — to test SOLVENCY alongside development. It does not
// play league fixtures (promotion churn added noise without testing the academy);
// "best-4 OVR reaches ~80 while staying solvent" is the L1-readiness proxy.
function runYouthProbe(seasons) {
  const g = boot(2024);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay; const G = () => g.PPM.state.G; const myId = G().myTeamId;
  const me = () => G().teams.find((t) => t.id === myId);
  // Reconfigure team 0 as a from-scratch youth-only club: empty senior roster, a
  // starter academy, €5k, and a youth-development coach (good management).
  G().players.filter((p) => p.teamId === myId).forEach((p) => { p.teamId = null; });
  G().infraAcademy = 2; G().infraHall = 0; me().budget = 5000;
  const coachSalary = 6000;
  G().staff = G().staff.filter((s) => !(s.teamId === myId && s.type === 'coach'));
  G().staff.push({ id: 88777, type: 'coach', teamId: myId, name: 'Akademik', age: 50, peakAge: 58, training: 82, tactics: 70, motivation: 70, synergy: 70, contractYears: 9999, coachTraits: [{ id: 'YOUTH_DEVELOPER' }], salary: coachSalary });
  for (let i = 0; i < 6; i++) { const p = gp.genYouthPlayer(myId, 'PL'); p.teamId = myId; G().players.push(p); } // seed cohort

  const ACAD_COST = [null, 10000, 25000, 55000, 90000, 138000];
  const HALL_COST = [null, 12000, 28000, 60000, 95000, 145000];
  const INFRA_ACADEMY = g.PPM.constants.INFRA_ACADEMY;
  function mineNow() { return G().players.filter((p) => p.teamId === myId && !p.retired); }
  function bestFourOvr() {
    const r = mineNow().sort((a, b) => gp.ovrBase(b) - gp.ovrBase(a)).slice(0, 4);
    return r.length ? Math.round(r.reduce((s, p) => s + gp.ovrBase(p), 0) / r.length) : 0;
  }
  function manage() {
    // Fresh academy intake for the season (the DOM preseason refills this; the probe
    // does it explicitly), then sign all of it.
    G().academyProspects = gp.genAcademyIntake(myId, G().countryId);
    let guard = 0;
    while ((G().academyProspects || []).length && guard++ < 12) gp.signAcademyProspect(0);
    // Reinvest spare cash into the academy, then the hall, always keeping a cash
    // buffer (bigger for the expensive late upgrades — a prudent manager doesn't
    // bankrupt the club on the €138k L5 jump; the downgrade valve exists for slips).
    const ia = G().infraAcademy || 0; const ac = ACAD_COST[ia + 1];
    if (ac && me().budget > ac + Math.max(30000, ac * 0.4)) gp.upgradeInfra('academy');
    const ih = G().infraHall || 0; const hc = HALL_COST[ih + 1];
    if (hc && me().budget > hc + Math.max(30000, hc * 0.4)) gp.upgradeInfra('hall');
    // Best 4 start (×1.0 development), the rest are reserves (×0.8).
    const ranked = mineNow().sort((a, b) => gp.ovrBase(b) - gp.ovrBase(a));
    ranked.forEach((p, i) => { p.role = i < 4 ? 'starter' : 'reserve'; });
    // Retain the squad: keep contracts alive (the player would renew via KONTRAKT,
    // otherwise juniors leak out when their 3-year deal lapses at 21).
    ranked.forEach((p) => { p.contractYears = Math.max(p.contractYears || 0, 4); });
    // Develop-&-sell: once 12 deep, sell the surplus (and any 30+ veterans) for fees.
    ranked.slice(12).forEach((p) => { if (p.age >= 18) gp.sellPlayer(p.id); });
    ranked.slice(4, 12).forEach((p) => { if (p.age >= 30) gp.sellPlayer(p.id); });
  }
  function chargeEconomy() {
    // Explicit player-club economy (the headless harness skips the DOM finance path).
    const wages = mineNow().reduce((s, p) => s + (p.salary || 0), 0) + coachSalary;
    const upkeep = 11000 + (INFRA_ACADEMY[Math.max(0, Math.min(5, G().infraAcademy || 0))].upkeep || 0);
    const income = 42000; // rough L2 income (prize + 3 sponsors + TV + tickets)
    me().budget = Math.max(0, me().budget + income - wages - upkeep);
  }

  console.log(`Academy balance probe (youth-only, €5k start, good management), ${seasons} seasons, seed 2024`);
  console.log('  Models L2 economy explicitly (income €42k vs wages + academy upkeep). L1-ready = best-4 OVR ~80.');
  let reachedL1ready = null, peakOvr = 0, brokeSeason = null;
  for (let s = 0; s < seasons; s++) {
    manage();
    gp.applyGrowth();      // the offseason development the academy is built around
    chargeEconomy();
    if (me().budget <= 0 && brokeSeason === null) brokeSeason = G().season + 1;
    G().season = (G().season || 1) + 1;
    const b4 = bestFourOvr(); peakOvr = Math.max(peakOvr, b4);
    if (b4 >= 80 && reachedL1ready === null) reachedL1ready = s + 1;
    if ((s + 1) % 4 === 0 || (b4 >= 80 && reachedL1ready === s + 1)) {
      console.log(`  season ${String(s + 1).padStart(3)} | best4 OVR ${String(b4).padStart(2)} | budget €${Math.round(me().budget / 1000)}k | academy L${G().infraAcademy} hall L${G().infraHall} | squad ${mineNow().length} (youth ${mineNow().filter(p => p.isYouth).length})`);
    }
  }
  console.log(`\nResult: peak best-4 OVR = ${peakOvr}; ${reachedL1ready ? 'reached L1-quality (~80) in season ' + reachedL1ready : 'did NOT reach L1 quality'}; ${brokeSeason ? 'went broke around season ' + brokeSeason : 'stayed solvent'}.`);
  const ok = reachedL1ready && reachedL1ready >= 6 && !brokeSeason;
  console.log(ok ? '✔ HARD but POSSIBLE: built an L1-ready squad over many seasons while solvent (target met).'
    : reachedL1ready ? '⚠ reached L1 quality but maybe too fast/easy or went broke — review numbers.'
    : '⚠ never reached L1 quality — may be too hard; review numbers.');
  process.exit(0);
}

if (MODE === 'youth') runYouthProbe(Number(process.argv[3] || 40));

const SEASONS = Number(process.argv[2] || 100);
const g = boot(1234);
g.PPM.gameplay.newGame(0, 'PL');
const G = () => g.PPM.state.G;
const gp = g.PPM.gameplay;

function resetStandings() {
  for (const t of G().teams) { t.w = t.l = t.d = t.pts = t.gf = t.ga = 0; t.pointsWon = t.pointsLost = 0; }
}
// The human club (team 0) is unmanaged in this probe; mimic a basic manager so it
// keeps a full roster — otherwise we'd only be testing an abandoned club, not the
// living AI world. Fill to 4 starters from the best available free agents.
function manageHumanClub() {
  const myId = G().myTeamId;
  let starters = G().players.filter(p => p.teamId === myId && !p.retired && p.role === 'starter');
  if (starters.length >= 4) return;
  const freeAgents = G().players
    .filter(p => p.teamId === null && !p.retired && p.role !== 'youth')
    .sort((a, b) => gp.ovr(b) - gp.ovr(a));
  while (starters.length < 4 && freeAgents.length) {
    const p = freeAgents.shift();
    p.teamId = myId; p.role = 'starter'; p.contractYears = Math.max(p.contractYears || 0, 2);
    starters.push(p);
  }
}
function playSeasonLeagues() {
  const sched = [G().scheduleL1, G().scheduleL2];
  const rounds = Math.max(G().scheduleL1.length, G().scheduleL2.length);
  for (let md = 0; md < rounds; md++) {
    G().matchday = md;
    for (const s of sched) {
      const fixtures = s[md] || [];
      for (const f of fixtures) {
        const r = gp.simTeamMatch(f.home, f.away, false);
        gp.applyResult(r);
      }
    }
  }
  // The browser records the completed table before the offseason resets it.
  // Keep the probe faithful so club-history growth is measured too.
  g.PPM.gameplayClubUI.recordClubSeasonHistory();
  G().phase = 'transfer';
  // The real game computes promotion/relegation in the season-finale (before
  // endSeason applies it). The probe must do the same or leagues never churn.
  gp.doPromotionRelegation();
}

const leagueOvr = (l) => {
  const ts = G().teams.filter((t) => t.league === l);
  return Math.round(ts.reduce((s, t) => s + gp.teamOvr(t.id), 0) / Math.max(1, ts.length));
};

const t0 = Date.now();
let lastMark = t0;
const sizes = (label) => {
  const G_ = G();
  const freeAgents=G_.players.filter(p=>!p.retired&&!p.loanedOut
    &&(p.teamId===null||(p.contractYears||0)<=0)&&p.teamId!==G_.myTeamId).length;
  const clubRows=Object.values(G_.clubHistory||{}).reduce((sum,rows)=>sum+(rows?.length||0),0);
  const saveKB=Math.round(JSON.stringify(G_).length/1024);
  console.log(
    `  [${label}] season=${G_.season} players=${G_.players.length} freeAgents=${freeAgents} ` +
    `(retired=${G_.players.filter(p => p.retired).length}) results=${(G_.results || []).length} ` +
    `news=${(G_.newsFeed || []).length} log=${(G_.gameLog || []).length} ` +
    `seasonHistory=${(G_.seasonHistory || []).length} clubRows=${clubRows} save=${saveKB}KB ` +
    `L1ovr=${leagueOvr(1)} L2ovr=${leagueOvr(2)} ` +
    `mem=${Math.round(process.memoryUsage().heapUsed / 1048576)}MB`);
};

console.log(`Stress test: ${SEASONS} seasons, seed 1234`);
sizes('start');
let failedAt = null;
try {
  for (let s = 0; s < SEASONS; s++) {
    resetStandings();
    manageHumanClub();
    playSeasonLeagues();
    gp.endSeason();          // real offseason
    G().phase = 'pre';       // skip the UI start-gate; schedules already regenerated
    if ((s + 1) % 10 === 0) {
      const now = Date.now();
      console.log(`  +10 seasons in ${now - lastMark}ms (${((now - lastMark) / 10).toFixed(0)}ms/season)`);
      lastMark = now;
      sizes(`after ${s + 1}`);
    }
  }
} catch (e) {
  failedAt = G().season;
  console.error(`\n✖ CRASHED in season ${failedAt}:`, e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e);
}

const total = Date.now() - t0;
console.log(`\nDone. ${failedAt ? 'FAILED at season ' + failedAt : 'completed ' + SEASONS + ' seasons'} in ${total}ms (${(total / SEASONS).toFixed(0)}ms/season avg).`);
sizes('end');
process.exit(failedAt ? 1 : 0);
