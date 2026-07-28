// =============================================================================
// tests/lib/invariants.js — reusable world-integrity checks for a career save.
//
// One place that answers "is this save still internally consistent?". Used by
// the long-career soak runner (after every season), by the real-save regression
// tests, and by unit tests. Everything here works on the plain save object, so
// it can be pointed at a live store.G, at a freshly parsed .json file, or at a
// save that has just been round-tripped through serialize/load.
//
// Design rules:
//   * Every check is a small named function that returns violation strings.
//     No assertions here — the caller decides how loud a violation is.
//   * Checks are about REFERENTIAL INTEGRITY and IMPOSSIBLE STATE, never about
//     balance. A world where the player is broke is valid; a world where a
//     player belongs to a club that does not exist is not.
//   * Nothing inspects source text. These are behavioural checks on data.
//
//   const { checkWorld, describeWorld } = require('./invariants');
//   const problems = checkWorld(G);          // [] when healthy
// =============================================================================

'use strict';

const TOTAL_MATCHDAYS = 22;
const HOF_LIMIT = 20;

// ── helpers ──────────────────────────────────────────────────────────────────
const isInt = (v) => Number.isInteger(v);
const num = (v) => typeof v === 'number';
const bad = (v) => num(v) && !Number.isFinite(v);

function arr(v) { return Array.isArray(v) ? v : []; }

// Walks the whole save and reports every NaN / Infinity, with a readable path.
// Capped so a systemic breakage doesn't produce a megabyte of output.
function findNonFinite(root, limit = 25) {
  const out = [];
  const seen = new Set();
  const stack = [[root, '$']];
  while (stack.length && out.length < limit) {
    const [node, path] = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node)) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (bad(v)) out.push(`${path}[${i}] = ${v}`);
        else if (v && typeof v === 'object') stack.push([v, `${path}[${i}]`]);
      }
    } else {
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (bad(v)) out.push(`${path}.${k} = ${v}`);
        else if (v && typeof v === 'object') stack.push([v, `${path}.${k}`]);
      }
    }
  }
  return out;
}

// ── individual invariants ────────────────────────────────────────────────────

// Every by-id lookup in the game is a first-match `find`, so a duplicate id
// silently makes one entity impersonate another (the reported "clicking a new
// academy junior opens someone else" class of bug).
function playerIdDomain(G) {
  const problems = [];
  const players = arr(G.players);
  const seen = new Map();
  for (const p of players) {
    if (!p) { problems.push('players contains a null entry'); continue; }
    if (!isInt(p.id) || p.id < 0) { problems.push(`player "${p.name}" has a non-integer id (${p.id})`); continue; }
    if (seen.has(p.id)) problems.push(`duplicate player id ${p.id}: "${seen.get(p.id)}" and "${p.name}"`);
    else seen.set(p.id, p.name);
  }
  // Pending pools become real players on signing, so they share the id domain
  // even while they live in their own arrays.
  for (const key of ['academyProspects', 'academyTrial']) {
    const pending = arr(G[key]);
    for (const p of pending) {
      if (!p) { problems.push(`${key} contains a null entry`); continue; }
      if (!isInt(p.id) || p.id < 0) { problems.push(`${key} entry "${p.name}" has a non-integer id (${p.id})`); continue; }
      if (seen.has(p.id)) problems.push(`${key} entry "${p.name}" reuses live player id ${p.id} ("${seen.get(p.id)}")`);
      else seen.set(p.id, `${key}:${p.name}`);
    }
  }
  return problems;
}

// Staff, scouts and PR directors are looked up across several collections by the
// same id. Two DIFFERENT people may never share one id; the same person appearing
// in two collections (an employed scout mirrored into scoutPool) is expected.
function staffIdDomain(G) {
  const problems = [];
  const identity = (s) => `${s.name}|${s.type}|${s.age}|${s.nationality}`;
  const seen = new Map();
  const visit = (s, where) => {
    if (!s) return;
    if (!isInt(s.id) || s.id < 0) { problems.push(`${where} member "${s.name}" has a non-integer id (${s.id})`); return; }
    const prev = seen.get(s.id);
    if (prev && prev.identity !== identity(s)) {
      problems.push(`staff id ${s.id} is shared by two different people: "${prev.name}" (${prev.where}) and "${s.name}" (${where})`);
      return;
    }
    if (!prev) seen.set(s.id, { identity: identity(s), name: s.name, where });
  };
  arr(G.staff).forEach((s) => visit(s, 'staff'));
  visit(G.prDirector, 'prDirector');
  arr(G.teams).forEach((t) => visit(t && t.prDirector, `teams[${t && t.id}].prDirector`));
  arr(G.staffPool).forEach((s) => visit(s, 'staffPool'));
  arr(G.scoutPool).forEach((s) => visit(s, 'scoutPool'));
  arr(G.prDirectorPool).forEach((s) => visit(s, 'prDirectorPool'));
  return problems;
}

// Every teamId must resolve. A dangling club reference shows up in the UI as a
// player with team "?" and breaks squad/table maths silently.
function clubReferences(G) {
  const problems = [];
  const teamIds = new Set(arr(G.teams).map((t) => t && t.id));
  // Club ids must be unique: the engine indexes clubs by id, so a duplicate would
  // make two clubs share a budget, a table row and a squad.
  if (teamIds.size !== arr(G.teams).length) problems.push('two clubs share the same id');
  if (!teamIds.has(G.myTeamId)) problems.push(`myTeamId ${G.myTeamId} does not resolve to a team`);
  const playerTeams = new Set(arr(G.teams).filter((t) => t && t.isPlayer).map((t) => t.id));
  if (playerTeams.size !== 1) problems.push(`expected exactly one isPlayer team, found ${playerTeams.size}`);
  else if (!playerTeams.has(G.myTeamId)) problems.push('the isPlayer team is not myTeamId');

  for (const p of arr(G.players)) {
    if (!p) continue;
    if (p.teamId !== null && p.teamId !== undefined && !teamIds.has(p.teamId)) {
      problems.push(`player ${p.id} "${p.name}" belongs to unknown team ${p.teamId}`);
    }
    for (const cid of arr(p.clubHistory)) {
      if (!teamIds.has(cid)) problems.push(`player ${p.id} "${p.name}" has unknown club ${cid} in clubHistory`);
    }
  }
  for (const s of arr(G.staff)) {
    if (!s) continue;
    if (s.teamId !== null && s.teamId !== undefined && !teamIds.has(s.teamId)) {
      problems.push(`staff ${s.id} "${s.name}" belongs to unknown team ${s.teamId}`);
    }
  }
  for (const key of Object.keys(G.clubHistory || {})) {
    if (!teamIds.has(Number(key))) problems.push(`clubHistory has rows for unknown team ${key}`);
  }
  return problems;
}

// A retired player must not survive as a full entity — the career would grow
// without bound and the retiree would keep showing up in squad/market lookups.
function retirementCleanup(G) {
  const problems = [];
  const stillHere = arr(G.players).filter((p) => p && p.retired);
  if (stillHere.length) {
    problems.push(`${stillHere.length} retired player(s) still stored as full entities (e.g. ${stillHere[0].name})`);
  }
  const hof = arr(G.hallOfFame);
  if (hof.length > HOF_LIMIT) problems.push(`hallOfFame holds ${hof.length} entries, limit is ${HOF_LIMIT}`);
  for (const e of hof) {
    if (!e) { problems.push('hallOfFame contains a null entry'); continue; }
    if (typeof e.name !== 'string' || !e.name) problems.push(`hallOfFame entry ${e.id} has no name`);
    // HoF rows are summaries, not entities: they must not carry live-object weight.
    if (e.awards && arr(e.awards).length > 60) problems.push(`hallOfFame entry "${e.name}" carries ${e.awards.length} awards`);
  }
  return problems;
}

// The transfer shelf stores ids only, so a stale row shows the wrong person (or
// the same person several times) in the market list.
function transferMarket(G) {
  const problems = [];
  const byId = new Map(arr(G.players).filter((p) => p && isInt(p.id)).map((p) => [p.id, p]));
  const seen = new Set();
  for (const row of arr(G.transferMarket)) {
    if (!row) { problems.push('transferMarket contains a null row'); continue; }
    const p = byId.get(row.playerId);
    if (!p) { problems.push(`transferMarket row points at missing player ${row.playerId}`); continue; }
    if (seen.has(row.playerId)) { problems.push(`transferMarket lists player ${row.playerId} "${p.name}" more than once`); continue; }
    seen.add(row.playerId);
    if (p.retired) problems.push(`transferMarket lists retired player "${p.name}"`);
    if (p.teamId === G.myTeamId) problems.push(`transferMarket lists own player "${p.name}"`);
    if (bad(row.fee)) problems.push(`transferMarket row for "${p.name}" has a non-finite fee`);
    if (row.type === 'fa') {
      const isFree = p.teamId === null || (p.contractYears || 0) <= 0;
      if (!isFree) problems.push(`transferMarket free-agent row for "${p.name}" but he is contracted to team ${p.teamId}`);
    }
  }
  for (const id of arr(G.marketShortlist)) if (!byId.has(id)) problems.push(`marketShortlist references missing player ${id}`);
  return problems;
}

// A loan has two clubs and one player; every one of them must exist and the
// player's own flags must agree with the loan record.
function loanIntegrity(G) {
  const problems = [];
  const byId = new Map(arr(G.players).filter((p) => p && isInt(p.id)).map((p) => [p.id, p]));
  const teamIds = new Set(arr(G.teams).map((t) => t && t.id));
  const openLoansByPlayer = new Map();
  for (const l of arr(G.loans)) {
    if (!l) { problems.push('loans contains a null entry'); continue; }
    const p = byId.get(l.playerId);
    if (!p) {
      // A loan for a player who has since left the world is only acceptable
      // once it has been closed off.
      if (!l.returned) problems.push(`open loan references missing player ${l.playerId}`);
      continue;
    }
    if (!teamIds.has(l.fromTeamId)) problems.push(`loan of "${p.name}" comes from unknown team ${l.fromTeamId}`);
    if (!teamIds.has(l.toTeamId)) problems.push(`loan of "${p.name}" goes to unknown team ${l.toTeamId}`);
    if (l.fromTeamId === l.toTeamId) problems.push(`loan of "${p.name}" has the same club on both sides`);
    if (l.returned) continue;
    if (openLoansByPlayer.has(l.playerId)) problems.push(`"${p.name}" is out on two open loans at once`);
    openLoansByPlayer.set(l.playerId, l);
    if (p.teamId !== l.toTeamId) problems.push(`"${p.name}" is loaned to team ${l.toTeamId} but his teamId is ${p.teamId}`);
    if (!p.loanedOut) problems.push(`"${p.name}" has an open loan but loanedOut is not set`);
  }
  for (const p of byId.values()) {
    if (p.loanedOut && !openLoansByPlayer.has(p.id)) problems.push(`"${p.name}" is flagged loanedOut with no open loan record`);
  }
  return problems;
}

// Squad shape: the roles the engine understands, a fieldable player club, and
// no club left as an empty shell that the match engine cannot use.
function squadIntegrity(G) {
  const problems = [];
  const ROLES = new Set(['starter', 'reserve', 'youth']);
  const byTeam = new Map();
  for (const p of arr(G.players)) {
    if (!p || p.teamId === null || p.teamId === undefined) continue;
    if (!ROLES.has(p.role)) problems.push(`player ${p.id} "${p.name}" has unknown role "${p.role}"`);
    if (p.isYouth && p.role !== 'youth') problems.push(`player "${p.name}" is isYouth but role is "${p.role}"`);
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, []);
    byTeam.get(p.teamId).push(p);
  }
  for (const t of arr(G.teams)) {
    if (!t) continue;
    const squad = byTeam.get(t.id) || [];
    const senior = squad.filter((p) => p.role !== 'youth' && !p.loanedOut);
    const starters = squad.filter((p) => p.role === 'starter');
    if (starters.length > 4) problems.push(`team "${t.name}" fields ${starters.length} starters (max 4)`);
    // The engine needs three bodies to run the protocol. Nobody manages an AI
    // club, so it must ALWAYS be able to field one; the player's club is his own
    // problem during the preseason window, and only has to be legal once the
    // season is actually running (which is also when the game itself enforces it).
    const mustBeFieldable = t.id !== G.myTeamId || G.phase === 'pre';
    if (mustBeFieldable && senior.length < 3) {
      problems.push(`team "${t.name}" has only ${senior.length} senior player(s) — cannot field a legal team`);
    }
    if (![1, 2].includes(t.league)) problems.push(`team "${t.name}" is in unknown league ${t.league}`);
  }
  for (const league of [1, 2]) {
    const n = arr(G.teams).filter((t) => t && t.league === league).length;
    if (n !== 12) problems.push(`league ${league} has ${n} teams (expected 12)`);
  }
  return problems;
}

// The season's fixture lists must actually be playable: right number of rounds,
// clubs from the right league, nobody playing twice in the same round.
function scheduleIntegrity(G) {
  const problems = [];
  for (const [league, key] of [[1, 'scheduleL1'], [2, 'scheduleL2']]) {
    const sched = arr(G[key]);
    if (sched.length !== TOTAL_MATCHDAYS) {
      problems.push(`${key} has ${sched.length} rounds (expected ${TOTAL_MATCHDAYS})`);
      continue;
    }
    const leagueIds = new Set(arr(G.teams).filter((t) => t && t.league === league).map((t) => t.id));
    sched.forEach((round, idx) => {
      const used = new Set();
      for (const f of arr(round)) {
        if (!leagueIds.has(f.home) || !leagueIds.has(f.away)) {
          problems.push(`${key} round ${idx} pairs clubs outside league ${league} (${f.home} vs ${f.away})`);
        }
        if (f.home === f.away) problems.push(`${key} round ${idx} has a club playing itself (${f.home})`);
        if (used.has(f.home)) problems.push(`${key} round ${idx}: club ${f.home} plays twice`);
        if (used.has(f.away)) problems.push(`${key} round ${idx}: club ${f.away} plays twice`);
        used.add(f.home); used.add(f.away);
      }
    });
  }
  return problems;
}

// The league table is derived state; it must agree with the results that were
// actually stored for the current season.
function leagueTable(G) {
  const problems = [];
  const results = arr(G.results).filter((r) => r && r.season === G.season);
  const played = new Map();
  for (const r of results) {
    for (const [id, won, lost, drew] of [
      [r.homeId, r.homeWin && !r.isDraw, !r.homeWin && !r.isDraw, !!r.isDraw],
      [r.awayId, !r.homeWin && !r.isDraw, r.homeWin && !r.isDraw, !!r.isDraw],
    ]) {
      const row = played.get(id) || { w: 0, l: 0, d: 0 };
      if (won) row.w++; else if (lost) row.l++; else if (drew) row.d++;
      played.set(id, row);
    }
  }
  for (const t of arr(G.teams)) {
    if (!t) continue;
    for (const k of ['w', 'd', 'l', 'pts', 'gf', 'ga', 'budget', 'pointsWon', 'pointsLost']) {
      if (bad(t[k])) problems.push(`team "${t.name}" has non-finite ${k}`);
    }
    if ((t.pts || 0) < 0) problems.push(`team "${t.name}" has negative points`);
    const row = played.get(t.id) || { w: 0, l: 0, d: 0 };
    const tally = (t.w || 0) + (t.d || 0) + (t.l || 0);
    if (tally !== row.w + row.d + row.l) {
      problems.push(`team "${t.name}" table says ${tally} games, stored results say ${row.w + row.d + row.l}`);
    }
    if ((t.w || 0) !== row.w || (t.l || 0) !== row.l || (t.d || 0) !== row.d) {
      problems.push(`team "${t.name}" W/D/L ${t.w}/${t.d}/${t.l} disagrees with results ${row.w}/${row.d}/${row.l}`);
    }
  }
  return problems;
}

// Career/season history must belong to the person it is filed under.
//
// The engine writes one snapshot when a player enters the world (pre-birthday)
// and one per season from applyGrowth() (post-birthday, still stamped with the
// season that just ended). So `age - season` is constant for a single person's
// whole history, except for a single +1 step between the creation snapshot and
// the first growth snapshot. Two people's rows landing in one bucket — the
// failure mode behind "history of the wrong player" — breaks that arithmetic on
// the very first shared row.
function historyOwnership(G) {
  const problems = [];
  const byId = new Map(arr(G.players).filter((p) => p && isInt(p.id)).map((p) => [p.id, p]));
  for (const [key, snaps] of Object.entries(G.playerHistory || {})) {
    const id = Number(key);
    const p = byId.get(id);
    if (!p) { problems.push(`playerHistory kept for player ${id} who is no longer in the world`); continue; }
    const rows = arr(snaps);
    let prev = null;
    let birthdaySteps = 0;
    for (const s of rows) {
      if (!s) { problems.push(`playerHistory[${id}] contains a null snapshot`); continue; }
      if (s.season > G.season) problems.push(`playerHistory[${id}] has a snapshot from the future (S${s.season} > S${G.season})`);
      if (prev) {
        if (s.season < prev.season) problems.push(`playerHistory[${id}] goes back in time (S${prev.season} then S${s.season})`);
        const drift = ((s.age || 0) - s.season) - ((prev.age || 0) - prev.season);
        if (drift < 0 || drift > 1) {
          problems.push(`playerHistory[${id}] "${p.name}": S${prev.season}/age ${prev.age} → S${s.season}/age ${s.age} is not one person's timeline`);
        } else {
          birthdaySteps += drift;
        }
      }
      prev = s;
    }
    if (birthdaySteps > 1) {
      problems.push(`playerHistory[${id}] "${p.name}": ${birthdaySteps} off-season birthdays in one history (expected at most 1)`);
    }
    if (prev && (prev.age || 0) > (p.age || 0)) {
      problems.push(`playerHistory[${id}] "${p.name}" last snapshot age ${prev.age} exceeds current age ${p.age}`);
    }
  }
  const staffIds = new Set([
    ...arr(G.staff), ...arr(G.staffPool), ...arr(G.scoutPool), ...arr(G.prDirectorPool),
    G.prDirector, ...arr(G.teams).map((t) => t && t.prDirector),
  ].filter(Boolean).map((s) => s.id));
  for (const key of Object.keys(G.staffHistory || {})) {
    if (!staffIds.has(Number(key))) problems.push(`staffHistory kept for staff ${key} who is no longer in the world`);
  }
  return problems;
}

// The permanent club register: one row per club per season, positions inside the
// league's range, and finite numbers. This is the record the owner expects to
// keep growing (slowly) forever, so it has to stay correct forever.
function clubHistoryIntegrity(G) {
  const problems = [];
  for (const [key, rows] of Object.entries(G.clubHistory || {})) {
    const list = arr(rows);
    const seasons = new Set();
    for (const row of list) {
      if (!row) { problems.push(`clubHistory[${key}] contains a null row`); continue; }
      if (seasons.has(row.season)) problems.push(`clubHistory[${key}] has two rows for season ${row.season}`);
      seasons.add(row.season);
      if (row.season > G.season) problems.push(`clubHistory[${key}] has a row from the future (S${row.season})`);
      if (![1, 2].includes(row.league)) problems.push(`clubHistory[${key}] S${row.season} has league ${row.league}`);
      if (!(row.position >= 1 && row.position <= 12)) problems.push(`clubHistory[${key}] S${row.season} has position ${row.position}`);
      for (const k of ['pts', 'w', 'd', 'l', 'gf', 'ga', 'played', 'pointsWon', 'pointsLost', 'ovr', 'budget']) {
        if (bad(row[k])) problems.push(`clubHistory[${key}] S${row.season} has non-finite ${k}`);
      }
      const played = (row.w || 0) + (row.d || 0) + (row.l || 0);
      if ((row.played || 0) !== played) problems.push(`clubHistory[${key}] S${row.season}: played ${row.played} vs W/D/L sum ${played}`);
    }
  }
  return problems;
}

// Money must stay a number. A single NaN budget silently poisons every later
// transfer, wage and sponsor calculation.
function financeIntegrity(G) {
  const problems = [];
  for (const t of arr(G.teams)) {
    if (!t) continue;
    if (!num(t.budget) || !Number.isFinite(t.budget)) problems.push(`team "${t.name}" budget is not a finite number (${t.budget})`);
  }
  for (const p of arr(G.players)) {
    if (!p) continue;
    if (p.salary !== undefined && bad(p.salary)) problems.push(`player "${p.name}" has a non-finite salary`);
    if (p.contractYears !== undefined && bad(p.contractYears)) problems.push(`player "${p.name}" has non-finite contractYears`);
  }
  for (const s of arr(G.staff)) {
    if (!s) continue;
    if (s.salary !== undefined && bad(s.salary)) problems.push(`staff "${s.name}" has a non-finite salary`);
  }
  const fin = G.seasonFinance;
  if (fin) {
    for (const [k, v] of Object.entries(fin)) if (bad(v)) problems.push(`seasonFinance.${k} is ${v}`);
  }
  for (const entry of arr(G.budgetLog)) {
    if (!entry) continue;
    for (const [k, v] of Object.entries(entry)) if (bad(v)) problems.push(`budgetLog S${entry.season}.${k} is ${v}`);
  }
  return problems;
}

// The engine reads six attributes off every player on every point; a missing or
// non-numeric one produces NaN ratings that spread through the whole match.
function playerStats(G) {
  const problems = [];
  const KEYS = ['fh', 'bh', 'srv', 'ret', 'foot', 'men'];
  for (const p of [...arr(G.players), ...arr(G.academyProspects), ...arr(G.academyTrial)]) {
    if (!p) continue;
    for (const k of KEYS) {
      if (!num(p[k]) || !Number.isFinite(p[k])) { problems.push(`player "${p.name}" has invalid ${k} (${p[k]})`); break; }
    }
    if (!num(p.age) || p.age < 12 || p.age > 60) problems.push(`player "${p.name}" has implausible age ${p.age}`);
  }
  return problems;
}

// Anything the save needs to still be a save.
function saveShape(G) {
  const problems = [];
  if (!Number.isFinite(G.season)) problems.push('season is not a number');
  if (!Array.isArray(G.teams)) problems.push('teams is not an array');
  if (!Array.isArray(G.players)) problems.push('players is not an array');
  if (!['pre', 'preseason', 'transfer'].includes(G.phase)) problems.push(`unknown phase "${G.phase}"`);
  if (!Number.isFinite(G.matchday) || G.matchday < 0 || G.matchday > TOTAL_MATCHDAYS) problems.push(`matchday out of range (${G.matchday})`);
  for (const key of ['teams', 'players', 'staff', 'results', 'newsFeed', 'inbox', 'hallOfFame', 'transferMarket', 'loans', 'seasonHistory']) {
    if (G[key] !== undefined && !Array.isArray(G[key])) problems.push(`${key} should be an array`);
  }
  return problems;
}

const CHECKS = [
  ['save-shape', saveShape],
  ['player-id-domain', playerIdDomain],
  ['staff-id-domain', staffIdDomain],
  ['club-references', clubReferences],
  ['retirement-cleanup', retirementCleanup],
  ['transfer-market', transferMarket],
  ['loans', loanIntegrity],
  ['squads', squadIntegrity],
  ['schedules', scheduleIntegrity],
  ['league-table', leagueTable],
  ['history-ownership', historyOwnership],
  ['club-history', clubHistoryIntegrity],
  ['finance', financeIntegrity],
  ['player-stats', playerStats],
  ['non-finite', (G) => findNonFinite(G).map((p) => `non-finite value at ${p}`)],
];

// Runs every invariant. `skip` lets a caller drop a check that legitimately does
// not apply (e.g. league-table mid-offseason, when standings have been reset
// before the next season's results exist).
function checkWorld(G, options = {}) {
  if (!G || typeof G !== 'object') return ['no game object'];
  const skip = new Set(options.skip || []);
  const problems = [];
  for (const [name, fn] of CHECKS) {
    if (skip.has(name)) continue;
    let found;
    try {
      found = fn(G) || [];
    } catch (error) {
      found = [`invariant threw: ${error && error.message}`];
    }
    for (const p of found) problems.push(`[${name}] ${p}`);
  }
  return problems;
}

// Checks that only the live game object can answer — they need the game's own
// lookup functions, so they prove the UI would resolve the RIGHT entity rather
// than merely that the ids look unique.
function checkLiveLookups(sandbox) {
  const problems = [];
  const gp = sandbox.PPM.gameplay;
  const G = sandbox.PPM.state.G;
  if (!G) return ['no game object'];
  // Academy cards pass (id, source, index). Every card must resolve to its own
  // prospect — this is the exact path that used to open a different player.
  for (const key of ['academyProspects', 'academyTrial']) {
    arr(G[key]).forEach((p, i) => {
      const resolved = gp.resolvePlayerProfile(p.id, key, i);
      if (resolved !== p) problems.push(`[live-lookup] ${key}[${i}] "${p.name}" resolves to "${resolved && resolved.name}"`);
      // Without the pending hint the same id must NOT hit a different live player.
      const plain = gp.resolvePlayerProfile(p.id);
      if (plain && plain !== p) problems.push(`[live-lookup] ${key}[${i}] "${p.name}" collides with live player "${plain.name}"`);
    });
  }
  // Market rows and shortlist entries must open the player they name.
  for (const row of arr(G.transferMarket)) {
    const resolved = gp.resolvePlayerProfile(row.playerId);
    if (!resolved) { problems.push(`[live-lookup] market row ${row.playerId} resolves to nobody`); continue; }
    if (resolved.id !== row.playerId) problems.push(`[live-lookup] market row ${row.playerId} resolves to player ${resolved.id}`);
  }
  // Staff lookups span four collections; the employed person must win.
  for (const s of arr(G.staff)) {
    const found = gp.findStaffById(s.id);
    if (found !== s) problems.push(`[live-lookup] staff "${s.name}" (id ${s.id}) resolves to "${found && found.name}"`);
  }
  return problems;
}

// ── population / size report ─────────────────────────────────────────────────
// The numbers the owner asked to see per season. Kept separate from the checks:
// growth is measured and reported, not asserted, so a threshold never has to be
// guessed before the data exists.
function describeWorld(G, extra = {}) {
  const players = arr(G.players);
  const isFree = (p) => !p.retired && !p.loanedOut
    && (p.teamId === null || (p.contractYears || 0) <= 0) && p.teamId !== G.myTeamId;
  const clubRows = Object.values(G.clubHistory || {}).reduce((s, rows) => s + arr(rows).length, 0);
  const historyRows = Object.values(G.playerHistory || {}).reduce((s, rows) => s + arr(rows).length, 0);
  const json = JSON.stringify(G);
  return {
    season: G.season,
    players: players.length,
    freeAgents: players.filter(isFree).length,
    youth: players.filter((p) => p.role === 'youth').length,
    retiredEntities: players.filter((p) => p.retired).length,
    staff: arr(G.staff).length,
    staffCandidates: arr(G.staffPool).length + arr(G.scoutPool).length + arr(G.prDirectorPool).length,
    market: arr(G.transferMarket).length,
    inbox: arr(G.inbox).length,
    news: arr(G.newsFeed).length,
    gameLog: arr(G.gameLog).length,
    results: arr(G.results).length,
    resultsWithDetail: arr(G.results).filter((r) => r && r.matchups).length,
    playerHistoryKeys: Object.keys(G.playerHistory || {}).length,
    playerHistoryRows: historyRows,
    hallOfFame: arr(G.hallOfFame).length,
    clubHistoryRows: clubRows,
    seasonHistory: arr(G.seasonHistory).length,
    loans: arr(G.loans).length,
    saveKB: Math.round(json.length / 1024),
    ...extra,
  };
}

module.exports = {
  checkWorld,
  checkLiveLookups,
  describeWorld,
  findNonFinite,
  HOF_LIMIT,
  TOTAL_MATCHDAYS,
  checks: Object.fromEntries(CHECKS),
};
