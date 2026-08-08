# Equipment Partnerships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate technical-partner and club-rubber ladders with one save-compatible 1–3 season equipment contract built around strategic profiles.

**Architecture:** Keep the stable `G.techPartnership` ID for compatibility and add `G.techContract` for contractual terms and the included rubber profile. Constants define all selectable trade-offs; gameplay helpers own pricing, lockout, termination, settlement, and modifiers; state migration upgrades schema-24 saves exactly once.

**Tech Stack:** Electron, browser JavaScript, Node's built-in test runner, HTML template strings, existing `window.PPM` modules.

## Global Constraints

- Preserve existing careers and all six existing technical-partner IDs.
- One contract is the only editable club-wide equipment decision; `rubberTier` becomes migration-only.
- Contract terms are one, two, or three seasons and financial values are snapshotted at signing.
- No free switch while a contract is active; early termination requires an explicit visible fee.
- Sporting modifiers stay small and flow through the same adjusted stats used by displayed OVR and the match engine.
- All new UI copy exists in English and Polish.
- Do not push or publish during this plan.

---

### Task 1: Contract catalog and save migration

**Files:**
- Modify: `src/data/constants.js`
- Modify: `src/core/state.js`
- Modify: `src/core/gameplay.js`
- Test: `tests/equipment-contracts.test.js`
- Test: `tests/save-migration.test.js`

**Interfaces:**
- Produces `EQUIPMENT.rubberProfiles[profileId]` with `{id, mods, fitStyles}`.
- Extends each `TECH_PARTNERSHIPS` entry with `profileId`, `rubberId`, `developmentBonus`, and the existing stable fields.
- Produces persisted `G.techContract` shaped as `{partnerId, rubberId, termYears, yearsLeft, signedSeason, annualCashflow}`.

- [ ] **Step 1: Write failing catalog and migration tests**

Add assertions equivalent to:

```js
test('equipment partner profiles are trade-offs rather than a sporting ladder', () => {
  const partners = g.PPM.constants.TECH_PARTNERSHIPS;
  assert.deepEqual(new Set(partners.map(p => p.profileId)), new Set(['offensive','control','speed','development','commercial']));
  assert.equal(new Set(partners.map(p => p.id)).size, 6);
  assert.ok(partners.every(p => p.rubberId));
});

test('schema 24 equipment choices migrate into one transitional contract', () => {
  const raw = makeSchema24Game({ techPartnership: 'tp_pro', rubberTier: 2 });
  const migrated = g.PPM.stateApi.migrateLoadedGame(raw);
  assert.equal(migrated.schemaVersion, 25);
  assert.equal(migrated.techContract.partnerId, 'tp_pro');
  assert.equal(migrated.techContract.termYears, 1);
  assert.equal(migrated.techContract.yearsLeft, 1);
  assert.equal(migrated.techContract.rubberId, 'legacy_pro');
});
```

- [ ] **Step 2: Run the focused tests and confirm the expected failure**

Run: `node --test tests/equipment-contracts.test.js tests/save-migration.test.js`

Expected: failures for missing profile fields, schema 25, and `techContract` migration.

- [ ] **Step 3: Define the six partner records and rubber profiles**

Use these exact sporting trade-offs:

```js
offensive:  { mods:{fh:1,srv:1}, fitStyles:['FH_LOOPER','TWO_SIDED'] }
control:    { mods:{ret:1,men:1}, fitStyles:['BLOCKER','DEFENDER','FISHER'] }
speed:      { mods:{bh:1,foot:1}, fitStyles:['TWO_SIDED','BLOCKER'] }
development:{ mods:{men:1}, fitStyles:PLAYER_STYLES }
balanced:   { mods:{fh:1,bh:1}, fitStyles:['TWO_SIDED'] }
commercial: { mods:{}, fitStyles:PLAYER_STYLES }
```

Map the existing IDs without renaming: local→development, regional→control, national→speed, pro→offensive, elite→commercial with `balanced`, world→commercial with `commercial`. Use marketability bonuses `0.02, 0.03, 0.04, 0.04, 0.07, 0.15`, development bonus `0.05` only for local, and annual cashflows `-1000, -800, -1200, -1600, 1200, 3500`. Keep `tp_local` available at all prestige values and make unlocks additive, never excluding a high-prestige club from earlier options.

- [ ] **Step 4: Add schema-25 normalization**

Increment `SAVE_SCHEMA_VERSION` to 25. For schema 24 and older, normalize a known selected partner into a one-season transitional contract; map rubber tiers 0/1/2 to `legacy_stock`/`legacy_tournament`/`legacy_pro`. Unknown partner IDs become `tp_regional`. A missing partner yields `techContract:null`. Make a second migration call idempotent.

- [ ] **Step 5: Stamp new careers with the new field and run migration tests**

Add `techContract:null` to `newGame`, then run:

`node --test tests/equipment-contracts.test.js tests/save-migration.test.js tests/cleanup.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit Task 1**

```text
git add src/data/constants.js src/core/state.js src/core/gameplay.js tests/equipment-contracts.test.js tests/save-migration.test.js
git commit -m "feat: add equipment contract model"
```

### Task 2: Signing, lockout, termination, settlement, and gameplay effects

**Files:**
- Modify: `src/core/gameplay.js`
- Test: `tests/equipment-contracts.test.js`
- Modify: `tests/formats.test.js`
- Modify: `tests/engine-honesty.test.js`
- Modify: `tests/lib/career-driver.js`

**Interfaces:**
- Produces `techContractAnnualCashflow(partner, termYears)`.
- Produces `techContractBreakFee(contract)`.
- Produces `getTechContract()`, `terminateTechPartnership()`, and `selectTechPartnership(tpId, years=1)`.
- `equipmentMods(player)` consumes the active contract's `rubberId` plus the player's personal blade and sponge.

- [ ] **Step 1: Add failing behavior tests**

Cover exact term adjustment, repeated-selection lockout, phase lockout, insufficient-budget termination, successful termination charge, season-end settlement/decrement, expiry, carried-contract preseason acceptance, development multiplier, and match-engine/OVR propagation.

```js
assert.equal(gp.techContractAnnualCashflow({annualCashflow:-1000}, 2), -960);
assert.equal(gp.techContractAnnualCashflow({annualCashflow:-1000}, 3), -920);
assert.equal(gp.techContractAnnualCashflow({annualCashflow:1000}, 2), 1030);
assert.equal(gp.techContractAnnualCashflow({annualCashflow:1000}, 3), 1060);
```

- [ ] **Step 2: Run RED tests**

Run: `node --test tests/equipment-contracts.test.js tests/formats.test.js tests/engine-honesty.test.js`

Expected: new contract behavior assertions fail before implementation.

- [ ] **Step 3: Implement contract helpers and selection rules**

Clamp `years` to integer 1–3. Allow signing only in preseason with no active `techContract` and sufficient prestige. Snapshot adjusted annual cashflow. Reject subsequent selection without mutating state. Keep `techPartnership` synchronized with `techContract.partnerId`.

- [ ] **Step 4: Implement early termination**

Calculate the rounded-up-to-500 fee from `max(2500, abs(annualCashflow) * 0.75 + 1000 * yearsLeft)`. Require confirmation and sufficient club budget; charge `seasonFinance.brandCosts`, clear both contract and partner ID, persist, and do not permit a replacement outside preseason.

- [ ] **Step 5: Unify rubber and partner effects**

Remove editable `setRubberTier` behavior from exports and UI consumers. Resolve the contract rubber profile inside `equipmentMods`; retain personal blade/sponge mods. Apply `developmentBonus` once in the player club's yearly growth multiplier. Transitional `legacy_*` profiles reproduce the old tier modifiers.

- [ ] **Step 6: Replace season-end reset and duplicate rubber charge**

Settle `techContract.annualCashflow` once, decrement `yearsLeft`, retain it when positive, and clear it only on expiry. Delete the separate rubber-tier upkeep block. Make `startSeason` accept a carried contract.

- [ ] **Step 7: Update career driver and focused tests**

Make the career driver call `selectTechPartnership(id, 1)` only when no active contract. Run:

`node --test tests/equipment-contracts.test.js tests/formats.test.js tests/engine-honesty.test.js tests/matchday-manual.test.js`

Expected: all tests pass.

- [ ] **Step 8: Commit Task 2**

```text
git add src/core/gameplay.js tests/equipment-contracts.test.js tests/formats.test.js tests/engine-honesty.test.js tests/lib/career-driver.js
git commit -m "feat: enforce equipment contract lifecycle"
```

### Task 3: Preseason and Club contract UI

**Files:**
- Modify: `src/ui/pages.js`
- Modify: `src/i18n/i18n.js`
- Modify: `src/core/gameplay.js`
- Test: `tests/pages-render.test.js`
- Test: `tests/i18n.test.js`

**Interfaces:**
- Consumes `getTechContract()`, `techContractBreakFee(contract)`, `selectTechPartnership(id, years)`, and `terminateTechPartnership()`.
- Produces a single equipment-contract panel on Club and one contract choice step in preseason.

- [ ] **Step 1: Write failing render and localization tests**

Assert that EN and PL render profile, rubber fit, exact modifiers, 1–3 year selector, annual cashflow, remaining years, and termination fee. Assert that the old independent rubber cards and their action are absent and rendered pages contain neither `undefined` nor raw translation keys.

- [ ] **Step 2: Run RED UI tests**

Run: `node --test tests/pages-render.test.js tests/i18n.test.js`

Expected: failures for missing contract controls/copy and still-visible rubber ladder.

- [ ] **Step 3: Replace the Club equipment area**

Render one active-contract summary with profile, included rubber, fit, remaining term, annual value, and fee. Show the termination action only for an active deal. With no active deal, explain that signing occurs in preseason; do not render clickable partner cards midseason.

- [ ] **Step 4: Extend the preseason equipment step**

When a contract carries over, mark the step done and show it without replacement controls. Otherwise render available offers with a term selector and call `selectTechPartnership(id, selectedYears)`. Explain the small term discount/loyalty benefit beside the selector.

- [ ] **Step 5: Add English and Polish copy keyed by stable profile/rubber IDs**

Do not depend on array indexes for new contract text. Include lockout, insufficient budget, break confirmation, successful termination, term, remaining seasons, annual cost/income, and style fit messages.

- [ ] **Step 6: Run UI tests and syntax check**

Run: `node --test tests/pages-render.test.js tests/i18n.test.js tests/equipment-contracts.test.js`

Run: `npm run check`

Expected: all tests and syntax checks pass.

- [ ] **Step 7: Commit Task 3**

```text
git add src/ui/pages.js src/i18n/i18n.js src/core/gameplay.js tests/pages-render.test.js tests/i18n.test.js tests/equipment-contracts.test.js
git commit -m "feat: show unified equipment contracts"
```

### Task 4: Stage 4 compatibility verification

**Files:**
- Verify: `tests/real-saves.test.js`
- Verify: `tests/soak.js`

**Interfaces:**
- Consumes the completed contract model, runtime, UI, and migration.
- Produces Stage 4 evidence suitable for the final beta gate.

- [ ] **Step 1: Run the complete focused Stage 4 suite**

Run:

`node --test tests/equipment-contracts.test.js tests/save-migration.test.js tests/real-saves.test.js tests/formats.test.js tests/engine-honesty.test.js tests/pages-render.test.js tests/i18n.test.js tests/matchday-manual.test.js`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run a multi-season contract soak**

Run: `node tests/soak.js --seasons=5`

Expected: career reaches the target season without a missing preseason decision, double settlement, invalid contract, or invariant failure.

- [ ] **Step 3: Check diff and working tree**

Run: `git diff --check` and inspect `git status --short`.

Expected: no whitespace errors and only intended files changed.

- [ ] **Step 4: Route any failure back to its owning task**

Do not weaken assertions or create an empty commit. Fix a contract/model failure under Task 1, a lifecycle/engine failure under Task 2, or a rendering/localization failure under Task 3, then repeat Steps 1–3. Do not push.
