# Beta Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with review checkpoints.

**Goal:** Make the National Cup, sponsors, loans, and remembered match squad truthful and save-compatible, while cleaning the final equipment-contract copy issue.

**Architecture:** Add read-only presentation helpers for Cup state; replace generated sponsor-name products with curated country pools and semantic tier IDs; enforce loan eligibility inside the mutator; migrate saves to schema 26 with positional 3+2 selection snapshots. Keep gameplay data canonical and render all user-facing labels through EN/PL translation keys.

**Tech Stack:** Electron, browser JavaScript, Node built-in test runner, existing `window.PPM` modules.

## Global Constraints

- Preserve old careers and do not retain whole retired player objects.
- Do not add redundant persisted Cup state.
- Never expose raw Polish sponsor tiers on the English UI.
- All rejected loan operations must leave state unchanged.
- Maintain exactly three starter slots and two reserve slots positionally.
- Do not push or publish during this plan.

---

### Task 1: National Cup clarity and carried-contract copy

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/ui/pages.js`
- Modify: `src/i18n/i18n.js`
- Test: `tests/cup-clarity.test.js`
- Test: `tests/pages-render.test.js`

**Interfaces:**
- Export `CUP_PRIZES` and `getCupClubStatus(teamId)` from gameplay.
- `getCupClubStatus` derives `waiting`, `due`, `alive`, `eliminated`, or `champion` from the bracket and current matchday.

- [ ] Add failing tests for pre-round, due, advanced, eliminated, and champion states, exact shared rewards, and dashboard/Cup-page rendering.
- [ ] Move the current reward amounts into `CUP_PRIZES` and use them during settlement.
- [ ] Implement the pure Cup status helper without adding save fields.
- [ ] Update both screens with format, matchday triggers, reward ladder, next condition, path, and terminal status in EN/PL.
- [ ] Correct `pre.techCarryover` so paid replacement through Club is clear; remove only verified-unreferenced legacy rubber/action/modifier translations while preserving EN/PL key parity.
- [ ] Run `node --test tests/cup-clarity.test.js tests/pages-render.test.js tests/equipment-contracts.test.js` and `npm run check`.
- [ ] Commit as `feat: explain national cup state`.

---

### Task 2: Natural sponsor identities and semantic tiers

**Files:**
- Modify: `src/data/constants.js`
- Modify: `src/core/gameplay.js`
- Modify: `src/ui/pages.js`
- Modify: `src/i18n/i18n.js`
- Test: `tests/sponsors.test.js`
- Test: `tests/fictional-default-data.test.js`
- Test: `tests/pages-render.test.js`

**Interfaces:**
- Keep `COUNTRY_SPONSORS[countryId]` as arrays with at least 48 unique fictional names per supported country.
- Save sponsor `tier` as one of `local`, `regional`, `national`, `premium`, `elite`.
- Add a shared tier-normalization helper which accepts historic Polish and English labels.

- [ ] Add failing tests for pool size/uniqueness, removal of old Cartesian examples, restrained repeated tokens, semantic generated tiers, and localized rendering.
- [ ] Replace root-by-sector generation with explicit fictional PL/DE/SE/JP/CN/KR pools; preserve debranding/custom-database interfaces.
- [ ] Generate and compare only semantic tier IDs; render via `sponsor.tier.<id>` in EN/PL.
- [ ] Keep historic raw labels accepted by the normalization helper for the schema migration in Task 3.
- [ ] Run `node --test tests/sponsors.test.js tests/fictional-default-data.test.js tests/pages-render.test.js` and `npm run check`.
- [ ] Commit as `feat: naturalize sponsor identities`.

---

### Task 3: Safe loans and durable positional nominations

**Files:**
- Modify: `src/core/state.js`
- Modify: `src/core/gameplay.js`
- Modify: `src/ui/pages.js`
- Modify: `src/i18n/i18n.js`
- Test: `tests/save-migration.test.js`
- Test: `tests/scouting-and-loans.test.js`
- Test: `tests/unified-squad.test.js`

**Interfaces:**
- Bump `SAVE_SCHEMA_VERSION` from 25 to 26.
- Persist `lastMatchSelectionSnapshots` aligned with `{base:[3], reserves:[2]}`, each slot `null` or `{id,name}`.
- Positional normalization replaces invalid/duplicate values with `null`; it never compacts later IDs.

- [ ] Add failing migration tests for schema-25 positions, historic sponsor tiers, snapshot creation, and idempotency.
- [ ] Add failing behavior tests for retirement/prune/save/reload display, replacement cleanup, and direct last-contract-year loan mutation.
- [ ] Make `doLoanOut()` re-run `canLoanOut()` immediately before mutation and surface its existing reason without changing state.
- [ ] Implement schema-26 migration: semantic sponsor tiers, positional 3+2 normalization, live-player snapshots, and preservation of unknown finite IDs.
- [ ] Refresh snapshots on confirmation and before pruning any referenced retired player; use missing snapshots for display only, never eligibility.
- [ ] Ensure selecting a replacement updates that slot and snapshot.
- [ ] Run `node --test tests/save-migration.test.js tests/scouting-and-loans.test.js tests/unified-squad.test.js tests/pages-render.test.js` and `npm run check`.
- [ ] Commit as `fix: preserve nomination history safely`.

---

### Task 4: Stage 5 integration review

**Files:**
- Modify only defects demonstrated by review or tests.
- Update: `.superpowers/sdd/2026-08-08-beta-clarity/progress.md` (ignored working ledger).

- [ ] Run focused Stage 5 suites together.
- [ ] Run `npm test` and record the exact result.
- [ ] Run `node tests/soak.js --seasons=5` and inspect Cup, sponsors, loans, selection slots/snapshots, and save reload invariants.
- [ ] Ask a fresh reviewer to compare the implementation with the design and plan; fix Important/Critical findings and re-run affected checks.
- [ ] Confirm `git diff --check` and a clean tracked worktree.
- [ ] Do not produce or upload the friend build yet; Stage 6 branding comes next.
