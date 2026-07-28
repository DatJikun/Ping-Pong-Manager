// =============================================================================
// tests/soak.js — long-career soak runner.
//
//   npm run test:soak                      30 seasons, PL, seed 1234
//   node tests/soak.js --seasons=10        shorter run
//   node tests/soak.js --country=JP        a different league format
//   node tests/soak.js --seed=99 --club=3  a different world / club
//   node tests/soak.js --quiet             one line per season only
//
// Starts a NEW career and plays it season after season through the real game
// loop — preseason decisions, every matchday (the cup auto-plays inside it), the
// Top 12 Masters, the post-season gala and the season change — checking the world
// invariants and doing a full save → validate → load round trip after each one.
//
// Exit code 0 = the whole career survived with every invariant green.
// Exit code 1 = something broke; the report names the season and the stage.
// =============================================================================

'use strict';

const { runCareer } = require('./lib/career-driver');
const { checkWorld, checkLiveLookups, describeWorld } = require('./lib/invariants');

function parseArgs(argv) {
  const out = { seasons: 30, seed: 1234, country: 'PL', club: 0, quiet: false, milestones: [1, 10, 20, 30] };
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'seasons') out.seasons = Number(v);
    else if (k === 'seed') out.seed = Number(v);
    else if (k === 'country') out.country = v;
    else if (k === 'club') out.club = Number(v);
    else if (k === 'quiet') out.quiet = true;
    else if (!Number.isNaN(Number(k))) out.seasons = Number(k);
  }
  return out;
}

const PAD = (v, n) => String(v).padStart(n);

// The per-season population line the owner asked for.
function seasonLine(stats, simMs) {
  return `  S${PAD(stats.season, 2)} | ${PAD(simMs, 6)}ms | save ${PAD(stats.saveKB, 5)}KB`
    + ` | players ${PAD(stats.players, 4)} (FA ${PAD(stats.freeAgents, 3)}, youth ${PAD(stats.youth, 3)})`
    + ` | staff ${PAD(stats.staff, 3)}+${PAD(stats.staffCandidates, 3)}`
    + ` | market ${PAD(stats.market, 4)} | inbox ${PAD(stats.inbox, 3)} | news ${PAD(stats.news, 3)}`
    + ` | results ${PAD(stats.results, 5)} (detail ${PAD(stats.resultsWithDetail, 4)})`
    + ` | hist ${PAD(stats.playerHistoryRows, 5)} | HoF ${PAD(stats.hallOfFame, 2)}`
    + ` | clubRows ${PAD(stats.clubHistoryRows, 4)}`;
}

function milestoneTable(rows, milestones) {
  const cols = ['season', 'players', 'freeAgents', 'youth', 'staff', 'staffCandidates', 'market',
    'inbox', 'news', 'results', 'playerHistoryRows', 'hallOfFame', 'clubHistoryRows', 'saveKB', 'simMs'];
  const picked = milestones.map((m) => rows.find((r) => r.season === m)).filter(Boolean);
  if (!picked.length) return '';
  const width = cols.map((c) => Math.max(c.length, ...picked.map((p) => String(p[c]).length)));
  const line = (cells) => '  ' + cells.map((c, i) => PAD(c, width[i])).join('  ');
  return [line(cols), line(cols.map((_, i) => '-'.repeat(width[i]))), ...picked.map((p) => line(cols.map((c) => p[c])))].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const label = `${args.seasons} seasons / ${args.country} / seed ${args.seed} / club ${args.club}`;
  console.log(`Long-career soak: ${label}`);
  console.log('  after every season: world invariants + live lookups + save/validate/load round trip\n');

  const rows = [];
  let result;
  try {
    result = await runCareer({
      seasons: args.seasons,
      seed: args.seed,
      countryId: args.country,
      clubIdx: args.club,
      onSeason: (info) => {
        const stats = describeWorld(info.game, { simMs: info.simMs, saveKB: Math.round(info.saveBytes / 1024) });
        stats.season = info.season; // describeWorld reads the ALREADY-advanced season
        rows.push(stats);
        if (!args.quiet) console.log(seasonLine(stats, info.simMs));
      },
      afterSeason: (info) => [...checkWorld(info.game), ...checkLiveLookups(info.sandbox)],
    });
  } catch (error) {
    console.error(`\n✖ SOAK FAILED — ${error.message}`);
    if (error.problems) {
      console.error(`\n  ${error.problems.length} invariant violation(s):`);
      for (const p of error.problems.slice(0, 40)) console.error(`    ${p}`);
      if (error.problems.length > 40) console.error(`    … and ${error.problems.length - 40} more`);
    } else if (error.cause) {
      console.error(`\n${error.cause.stack}`);
    }
    console.error(`\n  Reproduce with: node tests/soak.js --seasons=${args.seasons} --seed=${args.seed} --country=${args.country} --club=${args.club}`);
    process.exit(1);
  }

  const first = rows[0] || {};
  const last = rows[rows.length - 1] || {};
  console.log(`\n  Milestones (${label}):`);
  console.log(milestoneTable(rows, args.milestones.filter((m) => m <= args.seasons)));

  const grow = (k) => (first[k] ? `${first[k]} → ${last[k]} (×${(last[k] / first[k]).toFixed(2)})` : `${first[k]} → ${last[k]}`);
  console.log('\n  Growth over the career:');
  for (const k of ['players', 'staff', 'market', 'inbox', 'news', 'playerHistoryRows', 'hallOfFame', 'clubHistoryRows', 'results', 'saveKB']) {
    console.log(`    ${k.padEnd(18)} ${grow(k)}`);
  }
  const totalS = (result.totalMs / 1000).toFixed(1);
  console.log(`\n✔ ${rows.length} seasons completed in ${totalS}s (${Math.round(result.totalMs / rows.length)}ms/season). All invariants green.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
