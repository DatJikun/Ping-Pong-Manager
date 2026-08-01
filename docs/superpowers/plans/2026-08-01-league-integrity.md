# League Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one deterministic league order drive every table, sporting decision, objective, reward, history row, and position-based income calculation.

**Architecture:** Add one pure comparator and one fresh-array standings helper to `src/core/gameplay.js`, export both through the existing browser-global gameplay API, and replace every position-dependent point-only sort with that boundary. UI files consume the same helper and expose the deciding duel score alongside the already-visible small-point score.

**Tech Stack:** Browser-global JavaScript, Node.js built-in test runner, VM-based UI harness, Electron application.

## Global Constraints

- Ranking order is league points, team-duel difference, small-point difference, small points scored, deterministic club ID, then club name.
- Missing legacy counters count as zero; this stage does not change the save schema.
- Existing country-specific league point rules remain unchanged.
- Statistical leaderboards are not league-position consumers and retain their own sorting.
- Work only in `C:\Users\mwojn\Desktop\Ping-Pong-Manager-master\.worktrees\itch-beta` on `beta/itch-candidate`.

---

### Task 1: Lock the ranking contract with a failing regression

**Files:**
- Create: `tests/league-ordering.test.js`
- Inspect: `src/core/gameplay.js`
- Inspect: `src/core/gameplay.club-ui.js`
- Inspect: `src/ui/pages.js`
- Inspect: `src/ui/shell.js`

**Interfaces:**
- Consumes: current `team` fields `pts`, `gf`, `ga`, `pointsWon`, `pointsLost`, `id`, and `name`.
- Produces: executable behavior expectations for `compareLeagueTeams(a, b)` and `leagueStandings(league)` plus cross-system agreement.

- [x] **Step 1: Write the comparator hierarchy test**

Create `tests/league-ordering.test.js` with a small `team()` factory and assertions that isolate each successive criterion:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');
const team = (overrides = {}) => ({
  id: 99, name: 'Zeta', league: 1, pts: 20,
  gf: 10, ga: 10, pointsWon: 400, pointsLost: 400,
  ...overrides,
});

test('league comparator applies every tie-break in order', () => {
  const gp = boot(4101).PPM.gameplay;
  const cases = [
    [team({ pts: 21 }), team({ pts: 20, gf: 99 }), 'league points'],
    [team({ gf: 12 }), team({ gf: 11 }), 'team-duel difference'],
    [team({ pointsWon: 410 }), team({ pointsLost: 410 }), 'small-point difference'],
    [team({ pointsWon: 410, pointsLost: 410 }), team({ pointsWon: 400, pointsLost: 400 }), 'small points scored'],
    [team({ id: 2 }), team({ id: 10 }), 'club id'],
    [team({ id: 'legacy', name: 'Alpha' }), team({ id: 'legacy', name: 'Zeta' }), 'club name'],
  ];
  for (const [winner, loser, label] of cases) {
    assert.ok(gp.compareLeagueTeams(winner, loser) < 0, label);
  }
});
```

- [x] **Step 2: Write the cross-system consistency test**

In the same file, boot a fresh Polish career, set all Division I clubs to equal ranking counters, reverse their storage order, and use ascending club ID/name as the expected deterministic order. Assert:

```js
const expected = [...division].sort((a, b) =>
  String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) ||
  a.name.localeCompare(b.name, 'en'));
G.teams = [...G.teams.filter((t) => t.league !== 1), ...division.reverse()];
assert.deepEqual(Array.from(gp.leagueStandings(1), (t) => t.id), expected.map((t) => t.id));
```

Make the first expected club the player club, then assert all of these real consumers agree:

```js
assert.equal(gp.checkGoal({ goal: 'top1' }), true);
assert.equal(gp.calcTVRights(), 55000);
gp.giveSeasonAwards();
assert.ok(G.players.some((p) => p.teamId === expected[0].id &&
  (p.awards || []).some((a) => a.type === 'league_champion')));
const movement = gp.doPromotionRelegation();
assert.deepEqual(movement.relegated, expected.slice(-2).reverse().map((t) => t.name));
gp.recordClubSeasonHistory();
assert.deepEqual(expected.map((t) => G.clubHistory[t.id].at(-1).position),
  expected.map((_, index) => index + 1));
```

Load `src/ui/pages.js` and `src/ui/shell.js` into the same VM, assert the club
names occur in expected order in the table markup, and assert the header reports
the same position. Audit `src/core/gameplay.js`, `src/core/gameplay.club-ui.js`,
`src/ui/pages.js`, and `src/ui/shell.js` after GREEN for direct point-only league
sorts; this is a review gate rather than a brittle source-text test.

- [x] **Step 3: Run the new test and verify RED**

Run:

```powershell
node --test tests/league-ordering.test.js
```

Expected: FAIL because `compareLeagueTeams` and `leagueStandings` are not exported and point-only consumers disagree with the deterministic order.

- [x] **Step 4: Commit the failing regression**

```powershell
git add -- tests/league-ordering.test.js
git commit -m "test: expose inconsistent league tie-breaks"
```

### Task 2: Centralize every position-dependent league order

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/core/gameplay.club-ui.js`
- Modify: `src/ui/pages.js`
- Modify: `src/ui/shell.js`
- Modify: `src/i18n/i18n.js`
- Test: `tests/league-ordering.test.js`

**Interfaces:**
- Consumes: the ranking contract fixed by Task 1.
- Produces: `compareLeagueTeams(a, b): number` and `leagueStandings(league): Team[]` on `window.PPM.gameplay`.

- [x] **Step 1: Implement the minimal shared helpers**

Near the existing team helpers in `src/core/gameplay.js`, add:

```js
function leagueNumber(value){
  const numeric=Number(value);
  return Number.isFinite(numeric)?numeric:0;
}
function compareLeagueTeams(a,b){
  const criteria=[
    leagueNumber(b?.pts)-leagueNumber(a?.pts),
    (leagueNumber(b?.gf)-leagueNumber(b?.ga))-(leagueNumber(a?.gf)-leagueNumber(a?.ga)),
    (leagueNumber(b?.pointsWon)-leagueNumber(b?.pointsLost))-(leagueNumber(a?.pointsWon)-leagueNumber(a?.pointsLost)),
    leagueNumber(b?.pointsWon)-leagueNumber(a?.pointsWon),
  ];
  for(const result of criteria)if(result)return result;
  const idResult=String(a?.id??'').localeCompare(String(b?.id??''),'en',{numeric:true});
  return idResult||String(a?.name??'').localeCompare(String(b?.name??''),'en');
}
function leagueStandings(league){
  return (store.G?.teams||[]).filter(team=>team.league===league).slice().sort(compareLeagueTeams);
}
```

Export both helpers through `window.PPM.gameplay`.

- [x] **Step 2: Route all engine position consumers through the helper**

Replace the direct point-only sorts in attendance, merchandise, TV rights, matchday news, sponsor/board objectives and progress, PR-director lifecycle, records, awards, promotion/relegation, season settlement, and AI finances. Each division-specific path becomes `leagueStandings(league)`; the caretaker record path selects `leagueStandings(1)[0]` rather than comparing clubs across divisions.

- [x] **Step 3: Route history and UI position consumers through the helper**

In `gameplay.club-ui.js`, call `window.PPM.gameplay.leagueStandings(league)`. In `pages.js`, import `leagueStandings`, remove the local `compareLeagueTeams`, and use the helper for dashboard, league, and club pages. In `shell.js`, use `window.PPM.gameplay.leagueStandings(myL)` for the header position.

- [x] **Step 4: Expose the duel tie-break in the league table**

Add locale keys:

```js
'league.duels':'Duels',
'league.duels':'Pojedynki',
```

Replace the redundant matches-played column with `${t.gf||0}:${t.ga||0}` under that heading. Keep the existing small-points score, difference, and league-points columns unchanged.

- [x] **Step 5: Run the regression and focused suites to verify GREEN**

Run:

```powershell
node --test tests/league-ordering.test.js tests/league.test.js tests/pages-render.test.js tests/sponsors.test.js tests/economy.test.js tests/club-rivalries.test.js
npm run check
```

Expected: all focused tests PASS and the syntax check prints `syntax OK`.

- [x] **Step 6: Audit and commit the implementation**

Run:

```powershell
rg -n -S "filter\(t=>t\.league.*sort\(\(a,b\)=>b\.pts-a\.pts|filter\(t=>t\.league.*sort\(\(a,b\)=>\(b\.pts\|\|0\)-\(a\.pts\|\|0\)" src
git diff --check
```

Expected: no position-dependent point-only league sorts and no whitespace errors. Then commit:

```powershell
git add -- src/core/gameplay.js src/core/gameplay.club-ui.js src/ui/pages.js src/ui/shell.js src/i18n/i18n.js tests/league-ordering.test.js
git commit -m "fix: unify league tie-breaks across the game"
```

### Task 3: Establish the completed Stage 1 baseline

**Files:**
- Verify: complete worktree after Task 2.
- Modify: `docs/superpowers/plans/2026-08-01-league-integrity.md`

**Interfaces:**
- Consumes: all Stage 1 implementation and regression coverage.
- Produces: a passing fast baseline before Stage 2 changes roster and nomination semantics.

- [x] **Step 1: Run the normal suite**

```powershell
npm test
```

Expected: every non-slow test passes with no new warnings, `undefined`, or console errors.

- [x] **Step 2: Record completion evidence**

Check off completed plan steps, record the focused and normal test counts at the bottom of this file, run `git diff --check`, and commit only the updated plan:

```powershell
git add -- docs/superpowers/plans/2026-08-01-league-integrity.md
git commit -m "docs: record league integrity verification"
```

## Completion evidence

- RED: `node --test tests/league-ordering.test.js` failed because
  `compareLeagueTeams` and `leagueStandings` did not exist.
- GREEN: focused league/UI/history/economy suite passed 22/22.
- Syntax: `npm run check` printed `syntax OK`.
- Fast baseline: `npm test` passed 268/268.
- Audit: no position-dependent point-only league sort remains; the only direct
  `pts` sorts are statistical leaderboards and historical “best season” choice.
- Commits: `2aa2836` (RED test) and `5f9d199` (implementation).
