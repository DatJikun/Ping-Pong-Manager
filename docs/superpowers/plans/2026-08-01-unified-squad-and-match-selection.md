# Unified Squad and Match Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace permanent starter/reserve teams with one senior roster and make an ordered, persistent 3+2 selection the only match lineup decision.

**Architecture:** Save schema 24 normalizes every non-academy player to `role: 'senior'` and seeds a persistent `lastMatchSelection`. Core roster, availability, selection, and validation helpers drive simulation and UI; legacy role-dependent systems are rewritten around actual registration, appearances, and selected players.

**Tech Stack:** Browser-global JavaScript, Node.js built-in test runner, VM-based UI harness, Electron application.

## Global Constraints

- Preserve player IDs, contracts, loans, history, awards, expectations, and legacy career loadability.
- Every country displays five ordered match slots: A, B, C, R1, R2.
- Five available seniors require 3+2; four require 3+1; three require the base three.
- Country protocols and their actual duel schedules do not change.
- The last manually confirmed order is restored slot-for-slot; unavailable players never trigger a silent OVR rebuild.
- “Best lineup” remains an explicit OVR-based action.
- Work only in `C:\Users\mwojn\Desktop\Ping-Pong-Manager-master\.worktrees\itch-beta` on `beta/itch-candidate`.

---

### Task 1: Migrate legacy roles into one senior roster

**Files:**
- Modify: `src/core/state.js`
- Modify: `src/core/gameplay.js`
- Modify: `tests/save-migration.test.js`
- Create: `tests/unified-squad.test.js`

**Interfaces:**
- Produces: save schema 24, `isSeniorPlayer(player)`, `getClubSeniorPlayers(teamId, includeLoanedOut)`, `matchAvailability(player, teamId)`, and `normalizeMatchSelection(raw)`.
- Produces save field: `lastMatchSelection: { base: [id|null, id|null, id|null], reserves: [id|null, id|null] } | null`.

- [x] **Step 1: Write failing migration tests**

In `tests/save-migration.test.js`, construct a schema-23 save with four starters
in explicit `boardOrder`, two reserves, contracts, history, and one outbound loan.
After `migrateLoadedGame(raw)`, assert the exact literal outcomes:

```js
assert.equal(api.SAVE_SCHEMA_VERSION, 24);
assert.ok(migrated.players.filter((p) => p.role !== 'youth')
  .every((p) => p.role === 'senior'));
assert.deepEqual(migrated.lastMatchSelection, {
  base: [starterA.id, starterB.id, starterC.id],
  reserves: [starterD.id, reserveA.id],
});
assert.equal(migrated.players.find((p) => p.id === loaned.id).loanedOut, true);
assert.deepEqual(migrated.players.find((p) => p.id === starterA.id).clubHistory,
  starterA.clubHistory);
```

Run migration twice and assert the serialized players and selection are
unchanged on the second run.

- [x] **Step 2: Write failing roster and availability tests**

Create `tests/unified-squad.test.js`. Boot a career and assert the public API
exists. Verify the club roster contains all its seniors, includes an outbound
loan only when `includeLoanedOut` is true, and labels real states:

```js
assert.deepEqual({ ...gp.matchAvailability(healthy, myId) },
  { available: true, code: 'available', reasonKey: null, reasonParams: {} });
injured.injuredFor = 3;
assert.deepEqual({ ...gp.matchAvailability(injured, myId) }, {
  available: false, code: 'injured', reasonKey: 'match.nom.unavailableInjured',
  reasonParams: { rounds: 3 },
});
assert.equal(gp.matchAvailability(loaned, myId).code, 'loanedOut');
```

- [x] **Step 3: Verify RED**

Run:

```powershell
node --test tests/save-migration.test.js tests/unified-squad.test.js
```

Expected: FAIL because schema 24 and the unified roster API do not exist.

- [x] **Step 4: Implement schema 24 and core roster helpers**

In `state.js`, capture legacy role and board order before normalization. For
`fromVersion < 24`, derive `lastMatchSelection` from current nomination or the
ordered legacy roster, then set every non-youth role to `senior`. Add a default
for already-current saves and stamp schema 24.

In `gameplay.js`, implement the public helpers with real loan records as the
ownership source. `matchAvailability()` checks retired, academy, outbound loan,
registration, and injury in that order and returns stable semantic reason data.

- [x] **Step 5: Remove legacy roles from creation and transfer entry points**

Change generated, signed, graduated, returned, and borrowed senior players to
`role: 'senior'`. Keep `role: 'youth'` only for academy players. Derive missing
`preferredRole` before changing a legacy role so contract expectations survive.

- [x] **Step 6: Verify GREEN and commit**

Run:

```powershell
node --test tests/save-migration.test.js tests/unified-squad.test.js tests/signing.test.js tests/academy-graduation.test.js tests/scouting-and-loans.test.js
```

Expected: all focused tests PASS. Commit:

```powershell
git add -- src/core/state.js src/core/gameplay.js tests/save-migration.test.js tests/unified-squad.test.js tests/signing.test.js tests/academy-graduation.test.js
git commit -m "feat: migrate clubs to one senior roster"
```

### Task 2: Persist and validate the ordered 3+2 selection

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/i18n/i18n.js`
- Modify: `tests/unified-squad.test.js`
- Modify: `tests/match-readiness.test.js`
- Modify: `tests/auto-season-config.test.js`
- Modify: `tests/protocol.test.js`

**Interfaces:**
- Consumes: Task 1 roster and availability helpers.
- Produces: `getLastMatchSelection(teamId)`, `bestMatchSelection(teamId)`, `matchSelectionView(teamId, raw)`, `validateMatchSelection(teamId, raw)`, `nomBest()`, and `nomClear()`.

- [x] **Step 1: Write failing persistence and vacancy tests**

In `tests/unified-squad.test.js`, manually confirm five deliberately weak
players in a non-OVR order, advance the matchday, reopen the selection, and
assert `matchSelectionView()` returns the same five IDs. Injure slot B and assert:

```js
assert.deepEqual(view.selectedIds, [a.id, null, c.id, r1.id, r2.id]);
assert.equal(view.slots[1].previousPlayer.id, b.id);
assert.equal(view.slots[1].status.code, 'injured');
assert.equal(view.slots[2].player.id, c.id, 'later slots do not compact');
```

Call `nomBest()` and independently sort eligible players by OVR to prove that
only the explicit action rebuilds all five.

- [x] **Step 2: Write failing 3+2 validation tests**

For eligible roster sizes 6, 5, 4, 3, and 2, assert literal required totals
5, 5, 4, 3, and an unplayable result. Prove a four-player selection is refused
when five are available and accepted when only four are available.

Update the country table in `tests/match-readiness.test.js` so every country
returns `requiredBase: 3`, `maxReserves: 2`, and `recommendedTotal: 5`, while
`reservesUsedInMatch` remains protocol-dependent.

- [x] **Step 3: Verify RED**

```powershell
node --test tests/unified-squad.test.js tests/match-readiness.test.js tests/auto-season-config.test.js tests/protocol.test.js
```

Expected: failures for missing persistence/view/validation helpers and old
three-slot Olympic/T.League rules.

- [x] **Step 4: Implement slot-preserving selection state**

Represent the UI state as exactly five slots. `openMatchNomination()` restores
the persistent selection; if it is null, call `bestMatchSelection()`. Resolve
each previous ID independently and write `null` only into the unavailable slot.

`nomToggle(id)` removes a selected player from the same index or fills the first
vacant slot. `nomClear()` writes five nulls. `nomBest()` writes the independent
OVR suggestion. `nomConfirm()` calls `validateMatchSelection()` and, only on
success, writes the exact base/reserve order to both `matchNomination` and
`lastMatchSelection`.

- [x] **Step 5: Make every protocol carry a five-player squad**

Change `matchNominationRules()` to return `maxReserves: 2` and
`recommendedTotal: 5` everywhere. Keep `reservesUsedInMatch` true only when the
underlying protocol can substitute them. Auto-season selection fills all
available slots up to five and reports unavailable configured IDs.

- [x] **Step 6: Block invalid normal matches without silent fallback**

Before a player-controlled league or Cup match starts, validate the current
one-shot selection. When invalid, reopen nomination with slot reasons. After a
Cup consumes `matchNomination`, automatic player fallback uses
`lastMatchSelection` rather than OVR, preserving the same five for the league
match. AI retains OVR selection and three-player forfeit safety.

- [x] **Step 7: Render the five-slot modal and translated reasons**

Render five visible slot cards, all roster rows including unavailable previous
players, `Clear`, and `Best lineup`. Disable unavailable rows. Show whether
R1/R2 can enter under the active protocol. The confirm button reports the exact
selected/required count and stays disabled until validation succeeds.

- [x] **Step 8: Verify GREEN and commit**

```powershell
node --test tests/unified-squad.test.js tests/match-readiness.test.js tests/auto-season-config.test.js tests/protocol.test.js tests/i18n.test.js
npm run check
```

Commit:

```powershell
git add -- src/core/gameplay.js src/i18n/i18n.js tests/unified-squad.test.js tests/match-readiness.test.js tests/auto-season-config.test.js tests/protocol.test.js
git commit -m "feat: preserve ordered five-player match squads"
```

### Task 3: Replace the split squad screen with one roster

**Files:**
- Modify: `src/ui/pages.js`
- Modify: `src/i18n/i18n.js`
- Modify: `styles/main.css`
- Modify: `tests/pages-render.test.js`
- Modify: `tests/i18n.test.js`
- Modify: `tests/unified-squad.test.js`

**Interfaces:**
- Consumes: roster, selection, and availability view helpers from Tasks 1–2.
- Produces: one senior Squad tab, Academy tab, Loans tab, and dashboard match-squad list.

- [x] **Step 1: Read the frontend-design skill and inspect the current rendered squad page**

Use the existing visual language and card primitives. Do not introduce a new
framework, global palette, or unrelated page redesign.

- [x] **Step 2: Write failing UI behavior tests**

Load `pages.js` in the VM harness and assert the squad markup:

- contains every senior name once in the main roster;
- has no First Team/Reserves tabs or promote/demote controls;
- labels A/B/C/R1/R2 from `lastMatchSelection`;
- shows an outbound loan and an injured player's reason;
- renders the same structure without raw keys in English and Polish.

Assert the dashboard lists the last selected five in their stored order, even
when OVR order differs.

- [x] **Step 3: Verify RED**

```powershell
node --test tests/unified-squad.test.js tests/pages-render.test.js tests/i18n.test.js
```

Expected: old split tabs/actions remain and dashboard uses permanent starters.

- [x] **Step 4: Build the one-roster squad page**

Replace `starter` and `reserve` tabs with one `squad` tab. Sort cards by saved
selection slot, then availability, then OVR/name. Replace board arrows and
promotion/demotion buttons with a status line containing selection slot,
contract expectation, injury/loan reason, and outside-squad state. Preserve
contract, loan, sale, release, profile, filter, Academy, and Loans actions.

- [x] **Step 5: Update the dashboard**

Rename the permanent “main squad” block to the match squad. Resolve the saved
five slot-for-slot and display vacant/unavailable entries explicitly. Only a
never-confirmed career receives the best-five suggestion.

- [x] **Step 6: Verify GREEN and commit**

```powershell
node --test tests/unified-squad.test.js tests/pages-render.test.js tests/i18n.test.js
npm run check
```

Commit the UI, styles, translations, and tests with:

```powershell
git commit -m "feat: show one senior squad with match status"
```

### Task 4: Remove hidden role dependencies from gameplay and AI

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/unified-squad.test.js`
- Modify: `tests/match-readiness.test.js`
- Modify: `tests/player-request-cadence.test.js`
- Modify: `tests/ai-roster-survival.test.js`
- Modify: `tests/academy-graduation.test.js`
- Modify: `tests/scouting-and-loans.test.js`
- Modify: `tests/owner-feedback.test.js`
- Modify: `tests/lib/career-driver.js`
- Modify: `tests/lib/invariants.js`

**Interfaces:**
- Consumes: `isSeniorPlayer`, match selection, and real match result participants.
- Produces: role-free training, sparring, requests, injuries, awards, transfers, loans, and AI depth.

- [x] **Step 1: Write failing behavioral tests for former role consumers**

Add tests proving:

- changing a senior's old role-like metadata cannot change team OVR;
- unselected healthy seniors contribute to sparring and train at the normal
  senior multiplier;
- a neglected senior can request playing time regardless of former role;
- only IDs present in real matchups are eligible for post-match injury rolls;
- every active senior at a champion/cup winner receives the squad award;
- AI maintains at least five seniors without assigning starter/reserve roles;
- loan and transfer choices use depth/OVR, not a reserve flag.

- [x] **Step 2: Verify RED**

```powershell
node --test tests/unified-squad.test.js tests/match-readiness.test.js tests/player-request-cadence.test.js tests/ai-roster-survival.test.js tests/academy-graduation.test.js tests/scouting-and-loans.test.js tests/owner-feedback.test.js
```

Expected: old role filters fail the new behavior.

- [x] **Step 3: Refactor selection, training, sparring, and requests**

Make team OVR and legacy `getMatchStarters()` rank available seniors. Define
sparring as healthy academy players plus healthy seniors outside the base three.
Give all seniors the normal training multiplier; academy retains its academy
path. Replace reserve-request eligibility with real absence, form, cooldown,
availability, and contract expectation.

- [x] **Step 4: Target post-match injuries and awards correctly**

Extract participant IDs from `result.matchups`, including doubles pairs, and
pass them to `tryInjuriesForTeam`. Direct diagnostic calls fall back to the
current base selection. League and Cup squad awards iterate active seniors at
the winning club, while individual seasonal awards still require appearances.

- [x] **Step 5: Refactor loans, transfers, graduation, and AI depth**

Use senior counts and OVR ranking for minimum roster checks, surplus loan
candidates, weakest-player replacement, and AI signing. Graduation changes
`youth` to `senior`; releases become unregistered seniors. Remove
`promoteToStarter`, `demoteToReserve`, and swap actions from exports after all
callers are gone.

- [x] **Step 6: Update invariant and career-driver assumptions**

Replace test-driver starter lists with ordered match selections and make world
invariants require at least three registered seniors, preferring five where the
club can afford them. Do not weaken identity, loan, or roster-survival checks.

- [x] **Step 7: Audit role usage and verify GREEN**

Run:

```powershell
rg -n -S "role==='starter'|role==='reserve'|role:'starter'|role:'reserve'|promoteToStarter|demoteToReserve" src tests
node --test tests/unified-squad.test.js tests/match-readiness.test.js tests/player-request-cadence.test.js tests/ai-roster-survival.test.js tests/academy-graduation.test.js tests/scouting-and-loans.test.js tests/owner-feedback.test.js
```

Expected: no production dependency on starter/reserve roles and all focused
tests PASS. Commit:

```powershell
git commit -m "refactor: remove permanent lineup roles from gameplay"
```

### Task 5: Verify Stage 2 careers and update the readiness contract

**Files:**
- Modify: `docs/design/MATCH-READINESS-CONTRACT.md`
- Modify: `docs/superpowers/plans/2026-08-01-unified-squad-and-match-selection.md`
- Verify: complete worktree.

**Interfaces:**
- Consumes: completed unified squad model.
- Produces: documented Stage 2 baseline safe for the shared rating UI work.

- [x] **Step 1: Update the contract**

Document one senior roster, mandatory available slots up to five, persistent
manual order, visible availability reasons, and protocol-specific reserve use.
Remove the superseded optional-reserve language.

- [x] **Step 2: Run focused slow/manual and migration tests**

```powershell
node --test tests/matchday-manual.test.js tests/save-migration.test.js tests/real-saves.test.js tests/migration-repairs.test.js tests/persistence.test.js
```

Expected: manual 3+2 flow, migrated saves, supplied real saves when present, and
save round-trips all PASS.

- [x] **Step 3: Run the stage baseline**

```powershell
npm run check
npm test
```

Expected: syntax OK and every non-slow test PASS with no new `undefined`, raw
translation keys, or console errors.

- [x] **Step 4: Record evidence and commit**

Check off completed steps, append exact test counts and commit IDs to this plan,
run `git diff --check`, and commit:

```powershell
git commit -m "docs: record unified squad verification"
```

## Verification evidence — 2026-08-01

- Schema and roster helpers: `6f6cebe`.
- Ordered five-player selection: `d94a269`.
- Unified squad and dashboard UI: `895f383`.
- Role-free gameplay, AI, invariants, and long-career driver: `d814ca5`.
- Manual-season grievance correction and 3+2 slow-path coverage: `a8d3fd7`.
- Production audit: no `p.role` assignment or condition for `starter` or
  `reserve`; obsolete promote/demote/swap APIs are absent.
- `node tests/soak.js --seasons=2`: two seasons completed, all invariants green.
- Focused manual/migration/real-save package: 24/24 PASS. Each of the three
  supplied real saves migrated, completed two more seasons, and reloaded.
- `npm run check`: `syntax OK`.
- `npm test`: 279/279 PASS, 0 failures, 0 skipped.
