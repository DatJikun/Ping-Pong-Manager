// =============================================================================
// tests/lib/career-driver.js — headless "auto-manager" that plays real careers.
//
// The difference from tests/harness.js: the harness boots the engine, this drives
// the GAME. It walks the same code the player's clicks walk — preseason decisions,
// runMatchday() (which auto-plays the cup), the Top 12 Masters, the post-season
// gala, endSeason() — so a long-career soak exercises the real season loop rather
// than a simplified re-implementation of it.
//
// Only two things are stubbed, and neither changes an outcome:
//   * sleep() resolves immediately — it exists to pace animations.
//   * the post-season gala is "clicked away" by a timer, exactly like a player
//     pressing "ZOSTAŃ I PLANUJ KOLEJNY SEZON".
// Match results come from the real engine with a seeded Math.random, so the same
// seed always produces the same career.
//
//   const { runCareer } = require('./career-driver');
//   const report = await runCareer({ seasons: 30, seed: 1234, countryId: 'PL' });
// =============================================================================

'use strict';

const { boot } = require('../harness');

const TOTAL_MATCHDAYS = 22;

// Boots the engine and makes it run at full speed without changing any result.
function bootFast(seed) {
  const g = boot(seed);
  // Names run on their own PRNG (deliberately, so naming never shifts the balance
  // stream). It seeds itself from the clock, so pin it or the same seed produces
  // the same career under different names — useless for reproducing a failure.
  g.PPM.utils.setNameSeed((seed >>> 0) || 1);
  // Animation pacing only. Tournament bodies (Top 12) await sleep() between
  // matches; the matches themselves are already simulated by the engine.
  g.sleep = () => Promise.resolve();
  // The gala waits for the manager to close it. Keep a timer pressing the button.
  const galaClicker = setInterval(() => { g._galaResolved = true; }, 2);
  if (typeof galaClicker.unref === 'function') galaClicker.unref();
  g.__stopGalaClicker = () => clearInterval(galaClicker);
  // confirm() defaults to true in the harness; that is the right answer for the
  // flows the driver uses (staff replacement), and it never fires otherwise.
  return g;
}

// A soak failure has to say WHERE it happened, or a 30-season run is useless.
class CareerError extends Error {
  constructor(message, context) {
    super(`${message} [season ${context.season}, stage: ${context.stage}]`);
    this.name = 'CareerError';
    this.season = context.season;
    this.stage = context.stage;
    this.cause = context.cause;
    if (context.cause && context.cause.stack) this.stack += `\nCaused by: ${context.cause.stack}`;
  }
}

// ── the auto-manager ─────────────────────────────────────────────────────────
// Deliberately boring: it keeps the club legal and solvent-ish and takes the
// safest option at every fork. The point is to exercise the season machinery
// over 30 years, not to play well.
class AutoManager {
  constructor(g) {
    this.g = g;
    this.gp = g.PPM.gameplay;
    this.ui = g.PPM.ui;
  }

  get G() { return this.g.PPM.state.G; }
  get myId() { return this.G.myTeamId; }
  get me() { return this.G.teams.find((t) => t.id === this.myId); }

  mine() { return this.G.players.filter((p) => p.teamId === this.myId && !p.retired); }
  // The challenge club may not sign an adult from anywhere (doNegotiate blocks
  // it), so every player it loses is gone for good. A manager there hoards:
  // never sells, never lets a deal lapse, and keeps juniors in reserve rather
  // than graduating them the moment they turn 19.
  barredFromMarket() { return (this.me?.traits || []).includes('youthOnly'); }
  seniors() { return this.mine().filter((p) => p.role !== 'youth' && !p.loanedOut); }

  // ── preseason: the four gate decisions plus a legal squad ──────────────────
  preseason() {
    this.squadUpkeep();
    this.signSponsors();
    this.pickTechPartnership();
    this.pickBoardObjective();
    this.hireCoachIfMissing();
    this.hireScoutIfMissing();
    this.signScoutReports();
    this.clubOperations();
  }

  signSponsors() {
    const G = this.G;
    let guard = 0;
    while (G.sponsors.filter((s) => s.active).length < 3 && guard++ < 20) {
      const offers = G.sponsorOffers || [];
      if (!offers.length) break;
      // Safest money: highest reward among the goal-free offers, else the highest
      // reward overall. One season at a time keeps the shelf fresh.
      const free = offers.filter((o) => o.goal === 'none');
      const pick = (free.length ? free : offers).slice().sort((a, b) => b.reward - a.reward)[0];
      const before = G.sponsors.length;
      this.gp.signSponsorPreseason(pick.id, 1);
      if (G.sponsors.length === before) break; // refused — don't spin
    }
  }

  pickTechPartnership() {
    if (this.G.techPartnership) return;
    const pres = this.gp.calcPrestige();
    const tiers = this.g.PPM.constants.TECH_PARTNERSHIPS;
    // costPerSeason is signed: negative means the club pays. Take the best deal
    // in our prestige window — a manager who picks the one that drains €2k a year
    // eventually cannot afford a signing at all, and a club that cannot sign
    // cannot field a team.
    const inRange = tiers.filter((t) => pres >= t.prestige[0] && pres <= t.prestige[1])
      .sort((a, b) => b.costPerSeason - a.costPerSeason);
    if (inRange.length) this.gp.selectTechPartnership(inRange[0].id);
  }

  pickBoardObjective() {
    if (this.G.boardObjective) return;
    // Always the safe target: the ambitious one fires the manager on failure,
    // which would end the career instead of testing 30 seasons of it.
    if (!this.gp.selectBoardObjective('safe')) this.gp.selectBoardObjective('expected');
  }

  hireCoachIfMissing() {
    const G = this.G;
    if (G.staff.some((s) => s.teamId === this.myId && s.type === 'coach')) return;
    const candidates = (G.staffPool || []).filter((s) => s.type === 'coach' && s.teamId === null)
      .sort((a, b) => (a.salary || 0) - (b.salary || 0));
    const pick = candidates[0];
    if (!pick) return;
    if ((this.me.budget || 0) < (pick.salary || 0) * 2) return;
    this.g._staffNegSal = pick.salary;
    this.g._staffNegYrs = 3;
    this.g._staffNegBonus = 0;
    this.gp.doHireStaff(pick.id);
  }

  // A scout is what makes the scouting subsystem exist at all — without one, a
  // hundred soak seasons prove nothing about missions, reports or signings.
  hireScoutIfMissing() {
    const G = this.G;
    if (this.gp.getMyScouts().length) return;
    const pick = (G.scoutPool || []).filter((s) => s.teamId === null && !s.hired)
      .sort((a, b) => (a.salary || 0) - (b.salary || 0))[0];
    if (!pick || (this.me.budget || 0) < (pick.salary || 0) * 3) return;
    this.g._staffNegSal = pick.salary;
    this.g._staffNegYrs = 3;
    this.g._staffNegBonus = 0;
    this.gp.doHireStaff(pick.id);
  }

  // Keeps the club fieldable: promote academy graduates, renew people who are
  // about to walk, and top up from the free-agent shelf.
  squadUpkeep() {
    const G = this.G;
    const gp = this.gp;

    // 1) Academy intake — the pipeline that produced the original ID bug.
    let guard = 0;
    while ((G.academyProspects || []).length && guard++ < 6) gp.signAcademyProspect(0);

    // 2) Graduate juniors who are old enough to be useful seniors. A club that
    //    cannot buy keeps a reserve in the academy instead of emptying it.
    const graduationAge = this.barredFromMarket() ? 20 : 19;
    const keepInAcademy = this.barredFromMarket() && this.seniors().length >= 9 ? 2 : 0;
    const ready = this.mine().filter((p) => p.role === 'youth' && (p.age || 0) >= graduationAge)
      .sort((a, b) => (b.age || 0) - (a.age || 0));
    ready.slice(0, Math.max(0, ready.length - keepInAcademy)).forEach((p) => gp.promoteYouth(p.id));

    // 3) Renew EVERY player in his final year. An expired contract means he walks
    //    for free at the season change, and a squad that leaks two or three a year
    //    stops being able to field a team long before season 30.
    this.seniors().filter((p) => (p.contractYears || 0) <= 1)
      .sort((a, b) => gp.ovrBase(b) - gp.ovrBase(a))
      .forEach((p) => this.offerContract(p));
    // Juniors leak the same way once their academy deal lapses at 21.
    this.mine().filter((p) => p.role === 'youth' && (p.contractYears || 0) <= 1)
      .forEach((p) => this.offerContract(p));

    // 4) Sell surplus if the books need it, then fill up from the free-agent shelf.
    this.balanceBooks();
    this.fillSquad();

    // 5) Best four start; everyone else sits. Keeps the lineup legal after churn.
    const ranked = this.seniors().sort((a, b) => gp.ovr(b) - gp.ovr(a));
    ranked.forEach((p, i) => { if (p.role !== 'youth') p.role = i < 4 ? 'starter' : 'reserve'; });
  }

  // Offers what the agent asked for — the same numbers the negotiation modal
  // pre-fills when it opens — except that the signing bonus is trimmed to what
  // the club can actually pay. A manager with an empty account drags that slider
  // down; he does not walk away and field two players.
  offerContract(p) {
    const gp = this.gp;
    const exp = gp.contractExpect(p, this.myId);
    const market = (this.G.transferMarket || []).find((m) => m.playerId === p.id);
    const fee = market && market.type === 'transfer' ? (market.fee || 0) : 0;
    const cash = Math.max(0, this.me.budget || 0);
    if (cash < fee) return false; // a fee is not negotiable
    const bonus = Math.max(0, Math.min(exp.signingBonus || 0, cash - fee));
    this.g._negSal = exp.salary;
    this.g._negYrs = exp.years;
    this.g._negBonus = bonus;
    this.g._negRole = exp.role;
    this.g._negPid = p.id;
    const before = p.teamId;
    gp.doNegotiate(p.id);
    return p.teamId !== before;
  }

  // Wages are the thing that actually bankrupts a club over 30 seasons, and a
  // bankrupt club cannot sign the replacements it needs — the career dead-ends.
  // So the auto-manager runs a boring, solvent squad: it stops shopping once the
  // wage bill outgrows what a club at this level earns, and sells its most
  // saleable surplus when the account goes red.
  wageCeiling() {
    return this.me.league === 1 ? 260000 : 95000;
  }

  wageBill() {
    return this.mine().reduce((s, p) => s + (p.salary || 0), 0);
  }

  balanceBooks() {
    const gp = this.gp;
    if (this.barredFromMarket()) return; // selling here is one-way attrition
    const red = () => (this.me.budget || 0) < 0;
    if (!red() && this.wageBill() <= this.wageCeiling()) return;
    // Sell from the back of the queue. An overdrawn club sells down further than
    // one that is merely over its wage ceiling, but never past a legal squad.
    const surplus = this.seniors()
      .filter((p) => p.role !== 'starter')
      .sort((a, b) => gp.ovrBase(a) - gp.ovrBase(b));
    for (const p of surplus) {
      const floor = red() ? 4 : 6;
      if (this.seniors().length <= floor) break;
      if (!red() && this.wageBill() <= this.wageCeiling()) break;
      gp.sellPlayer(p.id);
    }
  }

  // Rotate who takes board A/B/C. Only three of the four starters play each
  // round, and a starter benched three rounds running loses 25 morale — at
  // morale 15 he tears up his contract and the club pays severance. A manager
  // who never looks at his lineup bleeds players and money; this one rotates.
  rotateBoardOrder() {
    const starters = this.seniors().filter((p) => p.role === 'starter')
      .sort((a, b) => (a.boardOrder ?? 99) - (b.boardOrder ?? 99));
    if (starters.length < 4) return;
    starters.forEach((p, i) => { p.boardOrder = (i + this.G.matchday) % starters.length; });
  }

  // Signs free agents until the squad can survive a season of injuries. Walks the
  // shelf best-first and never asks the same player twice — the engine only allows
  // one offer per player per round anyway, and a retry loop would spin forever
  // against the players who structurally refuse (AMBITNY stars in a second-tier
  // league).
  fillSquad(target = 9) {
    const G = this.G;
    const gp = this.gp;
    const byId = new Map(G.players.map((p) => [p.id, p]));
    // Below six the squad is one injury from a blocked matchday, so those signings
    // happen whatever the balance sheet says. Everything above that is optional and
    // waits until the club can carry the wages.
    const essential = Math.min(target, 6);
    const shelf = (G.transferMarket || [])
      .filter((row) => row.type === 'fa')
      .map((row) => byId.get(row.playerId))
      .filter((p) => p && !p.retired && p.teamId !== this.myId && p.role !== 'youth')
      .sort((a, b) => gp.ovrBase(b) - gp.ovrBase(a));
    // Start just below our own best player: the very top of the shelf refuses a
    // club of our standing, and burning offers on them wastes the window.
    const ceiling = Math.max(...this.seniors().map((p) => gp.ovrBase(p)), 40) + 4;
    const ordered = [
      ...shelf.filter((p) => gp.ovrBase(p) <= ceiling),
      ...shelf.filter((p) => gp.ovrBase(p) > ceiling),
    ];
    for (const p of ordered) {
      const have = this.seniors().length;
      if (have >= target) break;
      if (have >= essential && this.wageBill() > this.wageCeiling()) break;
      this.offerContract(p);
    }
  }

  // ── the club operations a soak would otherwise never touch ────────────────
  // Loans, scouting and infrastructure are real player actions with real
  // references (a loan moves a player between clubs; a scout mission returns a
  // generated player who then has to be signable). None of them were exercised
  // by the season loop, so a hundred seasons proved nothing about them. The
  // manager now uses each one at a modest, deterministic rate.
  clubOperations() {
    const gp = this.gp;
    const G = this.G;
    // 1) Loan out one surplus junior a season — the borrower guarantees him games.
    const loanable = this.mine()
      .filter((p) => gp.canLoanOut(p.id).ok)
      .sort((a, b) => (a.age || 0) - (b.age || 0));
    if (loanable.length && this.seniors().length > 7) {
      const target = G.teams
        .filter((t) => t.id !== this.myId && t.league === 2)
        .sort((a, b) => gp.teamOvr(a.id) - gp.teamOvr(b.id))[0];
      if (target) gp.doLoanOut(loanable[0].id, target.id, 0.3);
    }
    // 2) Keep a scout busy. checkScoutReturns() runs on the matchday tick, and a
    //    returned report has to resolve to a real, signable player.
    const scouts = gp.getMyScouts();
    const regions = this.g.PPM.constants.POLISH_REGIONS;
    if (scouts.length && regions?.length) {
      const idle = scouts.find((sc) => !(G.scoutMissions || []).some((m) => m.scoutId === sc.id && !m.done));
      if (idle && (this.me.budget || 0) > 40000) {
        gp.sendScout(idle.id, regions[(G.season || 1) % regions.length]);
      }
    }
    // 3) Borrow a player in when the squad is thin — the other direction of the
    //    same loan record, and the one that hands an AI club's player our teamId.
    if (this.seniors().length < 8) {
      const offer = (G.transferMarket || []).find((m) => m.type === 'loan');
      if (offer) gp.doBorrowIn(offer.playerId);
    }
    // 4) Reinvest into the club when genuinely rich, cheapest upgrade first.
    for (const [type, level, table] of [
      ['academy', G.infraAcademy || 0, 'INFRA_ACADEMY'],
      ['hall', G.infraHall || 0, 'INFRA_HALL'],
      ['med', G.infraMed || 0, 'INFRA_MED'],
      ['merch', G.infraMerchandising || 0, 'INFRA_MERCH'],
    ]) {
      const next = this.g.PPM.constants[table][level + 1];
      if (next && (this.me.budget || 0) > next.cost * 2 + 80000) { gp.upgradeInfra(type); break; }
    }
  }

  // Takes a job elsewhere every few seasons. A real long career is not spent at
  // one club, and acceptClubOffer() is the biggest state transition in the game —
  // the player's club changes underneath everything that referenced it. Kept to a
  // domestic move: crossing a border rebuilds the entire world with newGame(),
  // which would restart the soak's world mid-run rather than test the season loop.
  considerClubOffers(season) {
    if (season % 8 !== 0) return false;
    const offers = (this.G.clubOffers || [])
      .filter((o) => o.eligible && o.countryId === (this.G.countryId || 'PL'));
    if (!offers.length) return false;
    const before = this.myId;
    this.gp.acceptClubOffer(offers[0].clubId);
    return this.myId !== before;
  }

  // Signs whatever the scouts brought back — the report has to resolve to a real
  // player, and signing him goes through the ordinary negotiation.
  signScoutReports() {
    const G = this.G;
    for (const res of (G.scoutResults || []).slice()) {
      if (!res || res.seen) continue;
      const p = (G.players || []).find((x) => x.id === res.realId);
      res.seen = true;
      if (p && p.teamId === null && this.seniors().length < 11) this.offerContract(p);
    }
  }

  // ── in-season decisions ────────────────────────────────────────────────────
  // Decision mail BLOCKS the next matchday, so it must be cleared every round.
  // Declining is the stable default: promising a reserve a game creates an
  // obligation the auto-nomination cannot be trusted to keep.
  answerMail() {
    const pending = this.gp.pendingDecisions();
    for (const m of pending) this.gp.answerMail(m.id, false);
    return pending.length;
  }

  // If injuries leave fewer than three fieldable players the matchday is blocked
  // for good. A real manager promotes from the bench or the academy; so do we.
  describeSquad() {
    const gp = this.gp;
    const mine = this.mine();
    const injured = mine.filter((p) => (p.injuredFor || 0) > 0);
    const shelf = (this.G.transferMarket || []).filter((r) => r.type === 'fa').length;
    return `squad ${mine.length} (seniors ${this.seniors().length}, youth ${mine.filter((p) => p.role === 'youth').length},`
      + ` injured ${injured.length}), eligible ${gp.getEligibleMatchPlayers(this.myId).length},`
      + ` budget ${Math.round((this.me.budget || 0) / 1000)}k, free agents on shelf ${shelf}`;
  }

  ensureFieldable() {
    const gp = this.gp;
    // Don't wait for the squad to become illegal: a club that goes into a round
    // with five bodies is one bad injury from a blocked matchday. An overdrawn
    // account blocks every signing, so square the books before shopping.
    if (this.seniors().length < 6) { this.balanceBooks(); this.fillSquad(8); }
    if (gp.getEligibleMatchPlayers(this.myId).length >= 3) return true;
    this.mine().filter((p) => p.role === 'youth' && !(p.injuredFor > 0))
      .sort((a, b) => gp.ovr(b) - gp.ovr(a))
      .slice(0, 3)
      .forEach((p) => gp.promoteYouth(p.id));
    if (gp.getEligibleMatchPlayers(this.myId).length >= 3) return true;
    this.fillSquad();
    return gp.getEligibleMatchPlayers(this.myId).length >= 3;
  }
}

// ── save/load round trip ─────────────────────────────────────────────────────
// The real path: serialize exactly what the autosave writes, validate it the way
// a loaded file is validated, then load it back over the live state. Anything
// that cannot survive this is a save-corruption bug waiting to happen.
function saveLoadRoundTrip(g) {
  const api = g.PPM.stateApi;
  const text = api.serializeGame();
  if (!text) throw new Error('serializeGame() returned nothing');
  api.validateSaveText(text);
  const reloaded = api.loadGameFromText(text);
  if (!reloaded) throw new Error('loadGameFromText() returned nothing');

  // ROUND-TRIP IDENTITY. Loading is not a read-only operation — migration repairs
  // damage and pruneCareerData trims the career — so the first load may
  // legitimately differ from what was written. The SECOND must not: once a save
  // has been through the pipeline, saving and loading it again has to be a no-op.
  //
  // Anything else means the game hands the player a different world than the one
  // they saved. That is how an AI club's best junior was quietly dropping out of
  // its lineup on every load (rebalanceAiLineup left `isYouth` on a starter, and
  // the migration demoted him back to the academy).
  const settled = api.serializeGame();
  const again = api.loadGameFromText(settled);
  const twice = api.serializeGame();
  if (twice !== settled) {
    throw new Error(`save/load is not stable: reloading a settled save changed it (${diffSummary(settled, twice)})`);
  }
  return { bytes: text.length, game: again };
}

// Names the first few fields that changed, so a stability failure points at the
// culprit instead of dumping two megabytes of JSON.
function diffSummary(a, b) {
  let left, right;
  try { left = JSON.parse(a); right = JSON.parse(b); } catch { return 'unparseable'; }
  const diffs = [];
  const walk = (x, y, path) => {
    if (diffs.length >= 4) return;
    if (x === y) return;
    if (typeof x !== typeof y || x === null || y === null || typeof x !== 'object') {
      diffs.push(`${path}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
      return;
    }
    if (Array.isArray(x) !== Array.isArray(y)) { diffs.push(`${path}: shape changed`); return; }
    if (Array.isArray(x)) {
      if (x.length !== y.length) { diffs.push(`${path}: length ${x.length} → ${y.length}`); return; }
      for (let i = 0; i < x.length && diffs.length < 4; i++) walk(x[i], y[i], `${path}[${i}]`);
      return;
    }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (diffs.length >= 4) return;
      walk(x[k], y[k], `${path}.${k}`);
    }
  };
  walk(left, right, '$');
  return diffs.join('; ') || 'byte length differs only';
}

// ── the season loop ──────────────────────────────────────────────────────────
// Plays `seasons` further seasons on an ALREADY-BOOTED sandbox whose store.G is
// a live career. Works from any phase, so it drives both a fresh newGame() and a
// loaded save that was mid-season when the owner exported it.
async function playSeasons(g, seasons, options = {}) {
  const {
    onSeason = null,          // (info) => void — called after every completed season
    afterSeason = null,       // (info) => string[] — extra checks; strings fail the run
    saveEverySeason = true,
  } = options;

  const gp = g.PPM.gameplay;
  const ui = g.PPM.ui;
  const G = () => g.PPM.state.G;
  const ctx = { season: G() ? G().season : 0, stage: 'start' };
  const manager = new AutoManager(g);
  const seasonsRun = [];
  const startedAt = Date.now();

  const fail = (message, cause) => { throw new CareerError(message, { ...ctx, cause }); };
  const guarded = async (stage, fn) => {
    ctx.stage = stage;
    try {
      return await fn();
    } catch (error) {
      throw new CareerError(`${stage} threw: ${error && error.message}`, { ...ctx, cause: error });
    }
  };

  for (let s = 0; s < seasons; s++) {
    ctx.season = G().season;
    const seasonStart = Date.now();

    // A save exported during the transfer window still owes the world a season
    // change before the next one can begin.
    if (G().phase === 'transfer') await guarded('endSeason (carried over)', () => gp.endSeason());

    // ── preseason ─────────────────────────────────────────────────────────────
    if (G().phase === 'preseason') {
      await guarded('preseason-decisions', () => manager.preseason());
      await guarded('startSeason', () => gp.startSeason());
      if (G().phase !== 'pre') {
        const active = G().sponsors.filter((x) => x.active).length;
        const missing = [];
        if (active < 3) missing.push(`sponsors ${active}/3`);
        if (!G().techPartnership) missing.push('tech partnership');
        if (!G().boardObjective) missing.push('board objective');
        fail(`startSeason() refused to start — missing: ${missing.join(', ') || 'unknown'}`);
      }
    } else {
      // Mid-season resume: no gate decisions to take, but the squad still has to
      // be legal and the mailbox still blocks play.
      await guarded('squad upkeep (mid-season resume)', () => manager.squadUpkeep());
    }

    // ── the season ────────────────────────────────────────────────────────────
    ui.autoPlay = true; // no animation, no nomination modal — the game's own fast path
    let rounds = 0;
    while (G().phase === 'pre') {
      ctx.stage = `matchday ${G().matchday + 1}`;
      if (rounds++ > TOTAL_MATCHDAYS + 4) fail(`season did not finish after ${rounds} rounds (stuck at matchday ${G().matchday})`);

      // renderApp() evaluates scout returns in the real game; headless has no render.
      gp.checkScoutReturns();
      await guarded(`inbox before matchday ${G().matchday + 1}`, () => manager.answerMail());

      // Top 12 Masters is due before the final round and blocks auto-play until
      // it is played — exactly like the dashboard button.
      for (const league of [1, 2]) {
        if (!gp.shouldPlayTop12(league)) continue;
        await guarded(`top12 L${league}`, async () => {
          if (gp.myLeague() === league) gp.openTop12Picker(league); // exercises the picker markup
          await gp.runTop12Masters(league);
        });
        if (!G().top12MastersDone[league]) fail(`Top 12 Masters L${league} did not complete`);
      }

      ctx.stage = `squad check before matchday ${G().matchday + 1}`;
      manager.rotateBoardOrder();
      if (!manager.ensureFieldable()) fail(`cannot field 3 players at matchday ${G().matchday + 1} — ${manager.describeSquad()}`);
      ctx.stage = `matchday ${G().matchday + 1}`;

      const before = G().matchday;
      await guarded(`runMatchday ${before + 1}`, () => gp.runMatchday());
      if (G().phase === 'pre' && G().matchday === before) {
        fail(`runMatchday() made no progress at matchday ${before + 1}`);
      }
    }
    ui.autoPlay = false;

    if (G().phase !== 'transfer') fail(`season ended in phase "${G().phase}" (expected "transfer")`);

    // Club offers live in the transfer window and endSeason() clears them.
    await guarded('club offers', () => manager.considerClubOffers(G().season));

    const finishedSeason = G().season;
    const simMs = Date.now() - seasonStart;

    // ── season change ─────────────────────────────────────────────────────────
    await guarded('endSeason', () => gp.endSeason());
    if (G().season !== finishedSeason + 1) fail(`endSeason() left the career on season ${G().season}`);

    // ── save / load once per season ───────────────────────────────────────────
    let saveBytes = JSON.stringify(G()).length;
    if (saveEverySeason) {
      const trip = await guarded('save/load round trip', () => saveLoadRoundTrip(g));
      saveBytes = trip.bytes;
    }

    const info = { season: finishedSeason, simMs, saveBytes, game: G(), sandbox: g };
    seasonsRun.push(info);
    if (onSeason) onSeason(info);
    if (afterSeason) {
      ctx.stage = 'post-season invariants';
      const problems = afterSeason(info) || [];
      if (problems.length) {
        const err = new CareerError(`${problems.length} invariant violation(s)`, ctx);
        err.problems = problems;
        throw err;
      }
    }
  }

  return { ok: true, seasons: seasonsRun, totalMs: Date.now() - startedAt, game: G(), sandbox: g };
}

// Starts a brand-new career and plays it for `seasons`.
async function runCareer(options = {}) {
  const { seasons = 30, seed = 1234, countryId = 'PL', clubIdx = 0, difficulty = null, ...rest } = options;
  const g = bootFast(seed);
  try {
    // The new-game wizard stores the choice here; newGame() reads it back.
    if (difficulty) g.PPM.ui._newSaveDifficulty = difficulty;
    g.PPM.gameplay.newGame(clubIdx, countryId);
    return await playSeasons(g, seasons, rest);
  } finally {
    g.__stopGalaClicker();
  }
}

module.exports = { runCareer, playSeasons, bootFast, saveLoadRoundTrip, diffSummary, AutoManager, CareerError, TOTAL_MATCHDAYS };
