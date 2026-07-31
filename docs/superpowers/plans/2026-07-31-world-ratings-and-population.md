# World Ratings and Population Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OVR mean the same quality level across staff roles, seed clubs with plausible staff, expose a stable current/peak rating contract for Fable, and replace visibly fixed player/staff market counts with an organic bounded lifecycle.

**Architecture:** Keep the existing browser-global architecture and add small pure policy helpers to `gameplay.js`; do not introduce a framework or UI changes. Staff generation receives an optional quality context, while market population is governed by deterministic season policy plus natural departures and a rarely reached hard safety ceiling. Save migration upgrades legacy physio attributes once and preserves every entity ID/reference.

**Tech Stack:** Vanilla JavaScript, Node test runner, existing headless `tests/harness.js`, Electron/browser runtime.

## Global Constraints

- UI, CSS, presentation, and technical partnership redesign belong to Fable.
- Exactly five visual star slots are expected by the UI contract: current fill is `currentOvr / 20`, potential reach is `peakOvr / 20`.
- Do not delete or renumber a live entity during rating migration.
- Do not use a visible exact target as the normal free-agent population outcome.
- Preserve custom database names and save compatibility.
- New behavior must be introduced test-first and verified on fresh and migrated careers.

---

### Task 1: Rating contract and physiotherapist scale

**Files:**
- Modify: `src/core/gameplay.js`
- Test: `tests/world-foundation.test.js`

**Interfaces:**
- Produces: `ratingProfile(currentOvr, peakOvr) -> { currentOvr, peakOvr, currentStars, peakStars, slots }`
- Produces: `genStaff(type, countryId, options?)`, where `options.quality` is optional `0..1`.
- Existing consumers continue using `staffOvr(staff)` unchanged.

- [ ] **Step 1: Write failing rating-contract tests**

Add literal assertions that `ratingProfile(20,100)` returns one current star, five peak stars, and five slots; `ratingProfile(46,58)` returns 2.3 and 2.9; malformed/out-of-range values clamp safely.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/world-foundation.test.js`

Expected: FAIL because `ratingProfile` is not exported.

- [ ] **Step 3: Implement the minimal pure contract**

Add near `staffOvr`:

```js
function ratingProfile(currentOvr,peakOvr=currentOvr){
  const current=clamp(Number(currentOvr)||0,0,100);
  const peak=clamp(Math.max(current,Number(peakOvr)||current),0,100);
  return {currentOvr:current,peakOvr:peak,currentStars:current/20,peakStars:peak/20,slots:5};
}
```

Export it through `window.PPM.gameplay`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/world-foundation.test.js`

- [ ] **Step 5: Write failing distribution test for physios**

Generate 400 staff of every role with fixed seeds. Assert each role can produce credible professionals: median between 38 and 62, p90 at least 68, maximum at least 75, while minimum remains below 35. This catches the current physio-only 10–58 scale without forcing identical samples.

- [ ] **Step 6: Run and verify RED on physio distribution**

Expected: only physiotherapist assertions fail for the intended reason.

- [ ] **Step 7: Unify physio generation with the shared quality roll**

Derive physio `injReduction`, `recovery`, and `prevention` from `baseVal` using role-specific noise, but keep them on the same 10–96 competence scale as other roles. Allow `options.quality` to replace the random `q` after clamping.

- [ ] **Step 8: Verify focused and existing staff-effect tests**

Run: `node --test tests/world-foundation.test.js tests/traits-staff-ai.test.js tests/staffneg.test.js`

- [ ] **Step 9: Commit**

Commit message: `feat: establish shared staff rating scale`

### Task 2: Plausible staff for club strength

**Files:**
- Modify: `src/core/gameplay.js`
- Test: `tests/world-foundation.test.js`

**Interfaces:**
- Produces: `clubStaffQuality(team, type) -> 0..1`.
- Consumes: `genStaff(..., { quality })` from Task 1.

- [ ] **Step 1: Write failing fresh-world tests**

For every shipped country, create a fresh game and assert:

```js
assert.ok(l1CoachMedian >= 52);
assert.ok(l1CoachP10 >= 35);
assert.ok(l1PhysioMedian >= 42);
assert.ok(l1Average > l2Average);
```

Also assert quality is not uniform: the strongest and weakest club staff are separated by at least 12 OVR.

- [ ] **Step 2: Verify RED**

Expected: current random assignment fails especially L1 coach/physio floors.

- [ ] **Step 3: Implement club-relative quality seeding**

Compute a club strength percentile within its division from player `teamOvr`, budget, and league. Use broad overlapping bands rather than exact tiers:

```js
const base=team.league===1?0.48:0.28;
const quality=clamp(base+percentile*0.38+rnd(-8,8)/100,0.12,0.96);
```

Use that context in `assignAiStaff`; keep occasional underperformers but prevent a first-division club from receiving every key professional at the bottom of the market. Do not alter the player's chosen club staff.

- [ ] **Step 4: Verify GREEN across all countries**

Run: `node --test tests/world-foundation.test.js tests/smoke.test.js tests/custom-database.test.js`

- [ ] **Step 5: Commit**

Commit message: `feat: align club staff with competitive level`

### Task 3: Organic staff-market lifecycle

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/protocol.test.js`
- Test: `tests/world-foundation.test.js`

**Interfaces:**
- Produces: `staffMarketPolicy(type, teamCount, season, countryId) -> { floor, intakeTarget, hardCap }`.
- Produces: `replenishStaffPools()` with yearly aging, departures, and varied intake.

- [ ] **Step 1: Replace the obsolete fixed-floor test with behavior tests**

Tests must prove that every role remains available after total retirement, season targets differ across several seasons/roles, pool sizes do not snap back to 80, and no role exceeds its hard safety cap.

- [ ] **Step 2: Verify RED**

Expected: current constants always rebuild three roles to 80 and fail variation assertions.

- [ ] **Step 3: Implement deterministic seasonal policy**

Use `seedFromString(countryId + ':' + season + ':' + type)` to create repeatable variation. For 24 clubs, use broad intended bands rather than exact output: main staff roles roughly 30–50 candidates, scouts roughly 26–44, and PR roughly 20–38. `floor` prevents an empty role; `hardCap` prevents save growth.

- [ ] **Step 4: Implement market tenure and departure**

Increment `marketSeasons` for unemployed staff. Increase departure likelihood after two seasons, for age over 64, and for weak candidates. Generate only enough entrants to reach the varied `intakeTarget`; trim only above `hardCap`, retaining higher-quality and recently unemployed candidates.

- [ ] **Step 5: Apply policy at new-game and season-change paths**

Replace `STAFF_POOL_FLOOR`, `SCOUT_POOL_FLOOR`, and `PR_POOL_FLOOR` initialization/rebuild behavior without changing employed-scout mirror semantics.

- [ ] **Step 6: Verify market, identity, and migration suites**

Run: `node --test tests/world-foundation.test.js tests/protocol.test.js tests/staff-id-integrity.test.js tests/migration-repairs.test.js tests/scouting-and-loans.test.js`

- [ ] **Step 7: Commit**

Commit message: `feat: make staff markets seasonally organic`

### Task 4: Organic free-agent lifecycle

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/prune.test.js`
- Test: `tests/world-foundation.test.js`

**Interfaces:**
- Produces: `updateFreeAgentLifecycle()` called once per season before final pruning.
- `pruneCareerData()` retains only a high emergency ceiling; it is no longer a normal target setter.

- [ ] **Step 1: Write failing lifecycle tests**

Create controlled free agents with different age, OVR, potential, scouting status, and `marketSeasons`. Assert a newly released/scouted prospect survives; an old weak player leaves after prolonged unemployment under a deterministic seed; all references to a departed player are cleaned; and a multi-season sample produces at least three distinct market sizes instead of repeatedly equalling 120.

- [ ] **Step 2: Verify RED**

Expected: current code keeps everyone until the pool exceeds 120, then snaps to 120.

- [ ] **Step 3: Implement natural exits**

Each season increment `marketSeasons`. Derive exit pressure from unemployment duration, age, current OVR, and remaining upside. Protect the player's scouted candidates and recent releases. Use retirement/summary cleanup paths already owned by `pruneCareerData`.

- [ ] **Step 4: Replace normal cap with emergency ceiling**

The emergency ceiling may scale with world size (for 24 clubs, around 150–180) and should be reached only if lifecycle logic fails. When reached, preserve scouted players and best prospects, then clean every reference exactly as today.

- [ ] **Step 5: Verify focused tests and 10-season diagnostics**

Run: `node --test tests/world-foundation.test.js tests/prune.test.js tests/population-history.test.js tests/scouting-and-loans.test.js`

Run: `node tests/soak.js --seasons=10`

Record season-by-season free-agent counts in the plan results section; reject tuning that is constant, empty, or monotonically exploding.

- [ ] **Step 6: Commit**

Commit message: `feat: give free agents an organic lifecycle`

### Task 5: Save migration for the shared staff scale

**Files:**
- Modify: `src/core/state.js`
- Modify: `tests/save-migration.test.js`
- Test: `tests/world-foundation.test.js`

**Interfaces:**
- Bumps `SAVE_SCHEMA_VERSION` by one.
- Converts only legacy physio competence fields; IDs, tenure, salary, team, history, and references remain unchanged.

- [ ] **Step 1: Write failing migration test**

Load a schema-21 save containing low/mid/high legacy physios. Assert monotonic conversion to the shared scale, unchanged IDs/team assignments, and idempotence when the migrated save is loaded again.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement one-time conversion**

For saves older than the new schema, map legacy physio fields from their old generated range into the shared competence range, clamp malformed values, recompute salary only for unemployed generated candidates, and stamp the new schema.

- [ ] **Step 4: Verify migration and real-save suites**

Run: `node --test tests/save-migration.test.js tests/migration-repairs.test.js tests/real-saves.test.js tests/world-foundation.test.js`

- [ ] **Step 5: Commit**

Commit message: `fix: migrate legacy physiotherapist ratings`

### Task 6: Fable data contract and full verification

**Files:**
- Create: `docs/design/RATING-AND-POPULATION-CONTRACT.md`
- Modify: `CLAUDE-CODEX-CONVO.md`

**Interfaces:**
- Documents `ratingProfile`, staff rating meaning, market lifecycle guarantees, and fields Fable may display without reimplementing simulation math.

- [ ] **Step 1: Document consumer-facing semantics**

Include examples for OVR/peak pairs `20/100`, `46/58`, and `82/86`; explain that counts are snapshots, not quotas; document sparring values as a separate future contract.

- [ ] **Step 2: Add a concise handoff entry**

Append rather than edit prior entries. State exact exports, commit hashes, migration version, and known UI work left to Fable.

- [ ] **Step 3: Run complete verification**

Run: `npm run check`

Run: `npm test`

Run: `npm run test:soak`

- [ ] **Step 4: Review save size and dependencies**

Compare a 10/30-season serialized save to baseline and run `npm audit --omit=dev`. Record findings; do not apply `npm audit fix --force`.

- [ ] **Step 5: Commit**

Commit message: `docs: publish rating and population contract`

## Follow-on plans after this package

1. Match-format nomination safety and sparring/matchup-preparation contract.
2. Auto-season policy, selective stop conditions, rotation, and request cadence.
3. Infrastructure/economy/AI long-career balance.
4. Release durability, dependency audit, and final multi-country soak.

## Results — 2026-07-31

- `npm run check`: PASS.
- `npm test`: 242/242 PASS.
- Real saves S4, S8, and S11: migration, two further seasons, and reload PASS.
- 30-season PL soak: every invariant and save/load identity check PASS.
- Free agents varied from 65 to 124 over the 30-season run; no season snapped to the old 120 or the 168 emergency cap.
- Total players: 385 at S1, 399 at the local S20 peak, 351 at S30; no population growth leak.
- Staff candidates: 180 at S1 and 162 at S30, with seasonal movement rather than fixed per-role quotas.
- Save size: 1.747 MB at S1 to 2.840 MB at S30 (the previous long-career baseline reported about 3.1 MB at S30).
- Production dependency audit (`npm audit --omit=dev`): 0 vulnerabilities. The separately observed 17 high findings are in development/build dependencies and remain a later packaging audit; no forced update was applied.
