# Academy Player ID Integrity — implementation plan

> Implementation owner: Codex. Independent reviewer/runtime verifier: Claude.

**Goal:** Repair legacy academy-player ID collisions without renumbering unrelated
entity domains, prevent history loss during signing, and open the correct pending
candidate profile before acceptance.

**Architecture:** Treat live players plus pending academy/trial candidates as one
player-lifecycle ID domain. Migration reserves live-player IDs first and gives
only colliding pending candidates fresh IDs. Signing repeats the invariant as a
runtime guard. Pending profile cards pass an explicit allowlisted source and
index instead of using an ambiguous first-match ID lookup.

**Stack:** Browser JavaScript, Node `node:test`, VM test harness, PowerShell,
Git worktree.

**Design:** `docs/superpowers/specs/2026-07-28-academy-player-id-integrity-design.md`

## Task 1: Add migration regressions

**Files:**

- Create: `tests/player-id-integrity.test.js`
- Modify: `src/core/state.js`

### Step 1: Write failing migration tests

Create focused fixtures from a fresh deterministic game rather than committing
the owner's saves:

- live player and `academyProspects[0]` share one ID;
- academy prospect and `academyTrial[0]` share an ID;
- a scout report intentionally keeps `reported.id === realId`;
- team/player overlap remains legal.

Assert after `loadGameFromText()`:

- existing live-player IDs are unchanged;
- `players` IDs are unique;
- pending IDs are disjoint from `players` and from one another;
- `ui._pid` is above every ID minted by migration;
- intentional report/team overlaps are unchanged.

Run:

```powershell
node --test tests/player-id-integrity.test.js
```

Expected: failure because the current migration does not compare
`academyProspects` with `players` and does not repair `academyTrial`.

### Step 2: Implement pending-player migration

In `migrateLoadedGame()`:

- keep the existing deterministic `players` duplicate repair;
- create `claimedPlayerIds` from repaired `players`;
- walk `academyProspects`, then `academyTrial`;
- assign `nextRepairId++` only for missing/invalid/colliding pending IDs;
- reserve every resulting pending ID;
- do not create player-history entries for pending candidates;
- do not change scout-report copies or unrelated entity arrays.

### Step 3: Run the focused test

```powershell
node --test tests/player-id-integrity.test.js
```

Expected: migration tests pass.

### Step 4: Commit

```powershell
git add src/core/state.js tests/player-id-integrity.test.js
git commit -m "Fix academy candidate IDs during save migration"
```

## Task 2: Prevent signing collisions and history loss

**Files:**

- Modify: `tests/player-id-integrity.test.js`
- Modify: `src/core/gameplay.js`

### Step 1: Write failing runtime-guard tests

After loading a valid game, deliberately give a pending academy candidate the ID
of an established player and record:

- the established player's object/name;
- a deep copy of `playerHistory[occupiedId]`;
- any scout result using the established player's ID.

Call `signAcademyProspect(0)` and assert:

- the candidate receives a fresh ID;
- the established player still owns the old ID;
- the established history is byte-for-byte unchanged;
- the candidate has its own one-entry history;
- `players` IDs remain unique;
- a scout result owned by the established player was not deleted.

Repeat the collision assertion through `signTrialProspect(0)`.

Run:

```powershell
node --test tests/player-id-integrity.test.js
```

Expected: failure because both signing functions currently append the colliding
ID and overwrite `playerHistory[occupiedId]`.

### Step 2: Implement the runtime guard

Add a small internal helper in `src/core/gameplay.js` that:

- builds the occupied live-player ID set;
- accepts an existing valid unoccupied candidate ID;
- otherwise advances `ui._pid` until it finds an unoccupied value;
- assigns and returns the safe final ID.

Call it immediately before `players.push(p)` in both signing paths. Initialize
history and clear legacy scout results using only the safe final ID.

### Step 3: Run the focused test

```powershell
node --test tests/player-id-integrity.test.js
```

Expected: all migration and signing tests pass.

### Step 4: Commit

```powershell
git add src/core/gameplay.js tests/player-id-integrity.test.js
git commit -m "Guard academy signings against player ID reuse"
```

## Task 3: Resolve pending profiles explicitly

**Files:**

- Modify: `tests/player-id-integrity.test.js`
- Modify: `src/core/gameplay.js`
- Modify: `src/ui/pages.js`

### Step 1: Write failing resolver tests

Add tests for a pure/exported pending-profile resolver:

- normal call by ID returns the established live player;
- explicit `academyProspects` source and index returns that exact candidate even
  when its ID collides at runtime;
- explicit `academyTrial` source behaves the same;
- unknown source or stale index safely falls back to the live-player lookup.

Add a small source-wiring assertion that academy and trial card render calls pass
their respective explicit sources. Runtime correctness will additionally be
verified by Claude in the browser.

Run:

```powershell
node --test tests/player-id-integrity.test.js
```

Expected: failure because no explicit pending-profile resolver exists and cards
currently call `openPlayerModal(p.id)` only.

### Step 2: Implement the resolver and UI wiring

In `src/core/gameplay.js`:

- add `resolvePlayerProfile(pid, pendingSource, pendingIndex)`;
- allow only `academyProspects` and `academyTrial`;
- return the indexed candidate only when it still exists and its ID matches;
- otherwise use the existing live-player `find`;
- make `openPlayerModal()` call the resolver;
- export the resolver for focused tests.

In `src/ui/pages.js`:

- extend `prospectCard()` with an explicit pending source;
- pass `academyProspects` for normal intake cards;
- pass `academyTrial` for mini-tournament cards;
- include source and index in the card's `openPlayerModal` call.

### Step 3: Run focused tests and syntax checks

```powershell
node --test tests/player-id-integrity.test.js
npm run check
```

Expected: both commands pass.

### Step 4: Commit

```powershell
git add src/core/gameplay.js src/ui/pages.js tests/player-id-integrity.test.js
git commit -m "Open pending academy profiles unambiguously"
```

## Task 4: Validate the seven private saves

**Files:**

- No repository changes.
- Read only:
  `C:/Users/mwojn/Downloads/ppm-v17-ks-piorun-*.json`

### Step 1: Run domain-integrity validation

For every supplied save, load through the real `loadGameFromText()` migration and
assert:

- unique IDs inside `players`;
- no collision from `academyProspects`/`academyTrial` into `players`;
- unique IDs across the two pending arrays;
- active `transferMarket`, `preSignedPlayers` and `scoutResults.realId`
  references resolve to `players`;
- `_pid` exceeds the maximum ID after migration.

### Step 2: Exercise every available candidate on isolated copies

For each academy/trial candidate:

- reload a fresh copy of the save;
- resolve its pending profile and compare ID/name;
- sign it;
- assert the established colliding player's history is preserved;
- assert the candidate resolves from `players` by its final ID/name;
- persist and reload;
- assert player IDs remain unique and the candidate still resolves correctly.

Expected: all seven saves pass. The validator prints only filenames and aggregate
counts, not personal save contents.

## Task 5: Full verification and handoff

**Files:**

- Append only: `CLAUDE-CODEX-CONVO.md`

### Step 1: Run complete automated verification

```powershell
npm run check
npm test
git diff --check
```

Expected: syntax check and full suite pass; no whitespace errors.

### Step 2: Review the final diff

Confirm:

- no balance constants changed;
- no staff-domain code changed;
- no private save was added;
- only the documented player-lifecycle domain is repaired;
- commits contain no unrelated Claude/user files.

### Step 3: Ask Claude for independent review

Append a handoff entry containing:

- branch and commit hashes;
- exact verification commands and results;
- private-save validation summary;
- explicit request to run the agreed S8/S11 UI checklist;
- reminder that the separate staff-domain collision is the next P0 ID task.

Do not merge or declare the task complete until Claude reports no blocking issue
or any finding is resolved and re-reviewed.
