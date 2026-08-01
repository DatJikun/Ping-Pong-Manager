# Shared Current and Peak Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every player/staff summary rating with one layered five-star component that shows current OVR numerically and potential only as an outline, while revealing exact Peak OVR only in an opened profile.

**Architecture:** A pure `src/ui/rating-stars.js` module renders a normalized `gameplay.ratingProfile` into five fixed inline-SVG slots without reading DOM or game state. Pages decide whether an explicit ceiling is known and pass a separate disclosure mode; focused surface tests prevent numeric peak leakage and the transfer market uses the same current-star scale for filtering.

**Tech Stack:** Browser-global JavaScript IIFEs, inline SVG and CSS, Node.js built-in test runner, VM-based UI harness, Electron application.

## Global Constraints

- List and card summaries expose only one numeric rating: current OVR.
- Gold fill is current ability, gold outline extends to known potential, and dim outline completes the fixed five-star scale.
- The scale is exactly `current OVR / 20` and `peak OVR / 20`; no screen may define another mapping.
- Exact potential Peak OVR may appear only in an opened player/staff profile, once, and only when a real ceiling value is known.
- Summary `aria-label`, `title`, hidden text, and `data-*` attributes must not disclose exact peak OVR.
- `peakKnown` is explicit; it is never inferred from `peakOvr === currentOvr`.
- Peak age and achieved historical/career-high OVR are distinct facts, never potential-outline inputs.
- Transfer sorting, valuation, negotiations, and eligibility remain current-OVR behavior; only the star threshold adopts `ratingProfile().currentStars`.
- No save schema, simulation balance, scouting roll, development, or valuation formula changes.
- No new runtime dependency or network asset.
- Work only in `C:\Users\mwojn\Desktop\Ping-Pong-Manager-master\.worktrees\itch-beta` on `beta/itch-candidate`.

---

### Task 1: Build the pure layered rating renderer

**Files:**
- Create: `src/ui/rating-stars.js`
- Create: `tests/rating-stars.test.js`
- Modify: `src/i18n/i18n.js`
- Modify: `styles/main.css`
- Modify: `index.html`
- Modify: `tests/harness.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `window.PPM.gameplay.ratingProfile(currentOvr, peakOvr)` and `window.PPM.i18n.t(key, params)`.
- Produces: `window.PPM.ratingStars.renderRating(profile, options) -> string`.
- `options`: `{ size: 'compact'|'standard'|'profile', peakKnown: boolean, disclosure: 'summary'|'profile', showCurrentOvr: boolean }`.

- [ ] **Step 1: Write renderer contract tests**

Create `tests/rating-stars.test.js`, boot the normal harness, and exercise the
public API with a normalized profile:

```js
const profile = gp.ratingProfile(62, 84);
const html = ratings.renderRating(profile, {
  size: 'standard', peakKnown: true, disclosure: 'summary', showCurrentOvr: true,
});
assert.equal((html.match(/rating-stars__slot/g) || []).length, 5);
assert.deepEqual(layerWidths(html, 'current'), [100, 100, 100, 10, 0]);
assert.deepEqual(layerWidths(html, 'peak'), [100, 100, 100, 100, 20]);
assert.match(html, />62</);
assert.doesNotMatch(rootAriaLabel(html), /84/);
```

Also assert 0/100 endpoints, fractional widths, peak below current, malformed
input normalized through `ratingProfile`, all three whitelisted sizes, and five
slots in every size. With `peakKnown: false`, assert peak widths equal current
widths even when the supplied profile contains a higher peak. In profile mode,
assert the accessible label contains peak only when `peakKnown` is true.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test tests/rating-stars.test.js
```

Expected: FAIL because `PPM.ratingStars.renderRating` is absent.

- [ ] **Step 3: Register the dependency-free renderer in both load orders**

Create `src/ui/rating-stars.js` as an IIFE and export:

```js
window.PPM.ratingStars = Object.freeze({ renderRating });
```

Load it immediately after `src/core/gameplay.js` in `index.html` and
`tests/harness.js`. Add it to the explicit file list in `npm run check`. The
module returns strings only and performs no entity lookup or DOM mutation.

- [ ] **Step 4: Implement five fixed SVG slots and disclosure-safe labels**

For slot index `i`, calculate only from the already normalized profile:

```js
const currentWidth = Math.max(0, Math.min(1, profile.currentStars - i)) * 100;
const effectivePeak = options.peakKnown ? profile.peakStars : profile.currentStars;
const peakWidth = Math.max(0, Math.min(1, effectivePeak - i)) * 100;
```

Render each slot as a full dim-outline SVG, a clipped gold-outline SVG, and a
clipped solid-gold SVG. Use one constant `viewBox="0 0 24 24"` path and clipped
wrappers rather than SVG IDs. Whitelist sizes and disclosure values before
building class names. SVGs are `aria-hidden="true"`; the root is `role="img"`.

Add these exact bilingual key families:

```js
'rating.currentOvrLabel'
'rating.peakOvrLabel'
'rating.a11y.listKnown'
'rating.a11y.listUnknown'
'rating.a11y.profileKnown'
'rating.a11y.profileUnknown'
```

List-known text names current OVR and explains the outline but has no `{peak}`
parameter. Profile-known text may include `{peak}`. Unknown text says potential
is unknown. `showCurrentOvr` adds visible current OVR only.

- [ ] **Step 5: Replace the font-glyph CSS with deterministic layers**

Remove `.stars` and `.stars i`. Add `.rating-stars`, `.rating-stars__scale`,
`.rating-stars__slot`, `.rating-stars__glyph`, `.rating-stars__clip`, and the
`--dim`, `--peak`, and `--current` variants. Define sizes exactly as 12px/2px,
16px/3px, and 22px/4px for star size/gap. Keep `inline-flex`, `flex-wrap: nowrap`,
and `flex: none` so narrow layouts preserve all five slots. Use `var(--volt)`
for gold and `var(--ink3)` for the dim contour.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```powershell
node --test tests/rating-stars.test.js tests/world-foundation.test.js tests/i18n.test.js
npm run check
```

Expected: renderer tests PASS, the authoritative rating contract remains
unchanged, both dictionaries contain every new key, and syntax is OK. Commit:

```powershell
git add -- src/ui/rating-stars.js tests/rating-stars.test.js src/i18n/i18n.js styles/main.css index.html tests/harness.js package.json
git commit -m "feat: add shared current and peak rating stars"
```

### Task 2: Replace the transfer market's private rating scale

**Files:**
- Create: `tests/rating-surfaces.test.js`
- Modify: `src/ui/pages.js`
- Modify: `tests/pages-render.test.js`

**Interfaces:**
- Consumes: `ratingProfile(currentOvr, peakOvr)` and `PPM.ratingStars.renderRating(profile, options)` from Task 1.
- Produces: transfer rows shaped with `ratingProfile`, plus current-only `stars` thresholds derived from `ratingProfile(currentOvr).currentStars`.

- [ ] **Step 1: Write failing transfer disclosure and filter tests**

Load `pages.js` in the VM as `pages-render.test.js` does. Insert controlled
player and staff rows with distinct current/peak values, render `pageMarket()`,
and isolate their table rows. Assert each contains `.rating-stars--compact`, one
visible current OVR, and no visible `Peak`, `peak OVR`, or exact ceiling. Assert
its rating root has no `title` and its summary `aria-label` omits the peak.

For behavior, set one player's six base stats so current OVR is 59 and peak is
95. With `ui.mktStars = 3`, assert he is absent. Raise only current OVR to 60
and assert he appears. Restore 59, change peak alone, and assert he remains
absent. This locks filtering to current OVR rather than potential.

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/rating-surfaces.test.js tests/pages-render.test.js
```

Expected: market rows still use `.stars`, leak the private scale, and do not
render peak outlines.

- [ ] **Step 3: Replace market row/filter rendering**

In `pageMarket()`, create normalized row values with:

```js
const profile = ratingProfile(currentOvr, knownPeakOvr);
const currentStars = ratingProfile(currentOvr, currentOvr).currentStars;
```

Players use `playerCeiling(player)` and staff use `staffCeiling(staff)` as known
peak inputs. Delete local `ovrStars()` and `starsHtml()`. Render entity rows and
player compare cards with `renderRating(..., { size: 'compact', peakKnown: true,
disclosure: 'summary', showCurrentOvr: true })`. Render the threshold control
with `peakKnown: false`, `showCurrentOvr: false`, and a synthetic normalized
profile whose current equals `minStars * 20`.

- [ ] **Step 4: Keep ordering and filtering current-only**

Store `row.currentStars` separately from `row.profile`. Filter only with:

```js
if (minStars && row.currentStars < minStars) return false;
```

Keep the existing `ovr` sort key, price, salary, negotiation, and availability
logic. Potential never enters sorting or commercial calculations.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
node --test tests/rating-stars.test.js tests/rating-surfaces.test.js tests/pages-render.test.js
npm run check
```

Commit:

```powershell
git add -- src/ui/pages.js tests/rating-surfaces.test.js tests/pages-render.test.js
git commit -m "feat: unify transfer market rating stars"
```

### Task 3: Apply the component to player and academy surfaces

**Files:**
- Modify: `src/ui/pages.js`
- Modify: `src/core/gameplay.js`
- Modify: `src/i18n/i18n.js`
- Modify: `tests/rating-surfaces.test.js`
- Modify: `tests/pages-render.test.js`
- Modify: `tests/i18n.test.js`

**Interfaces:**
- Consumes: Task 1 renderer and explicit `peakKnown` policy.
- Produces: shared player summaries and one exact Peak OVR row in the opened player profile.

- [ ] **Step 1: Write failing coverage tests for every player summary**

Add controlled tests for dashboard match squad, senior/youth squad cards,
loaned-out/in cards, academy intake, academy report, league player table,
nomination modal, loan modal, negotiation modal, live match player HUD, and
Top-12 picker/participant cards. Each summary must contain the shared component,
retain current OVR, and omit exact potential from visible/accessibility text.

For a scout report, set `reported.ceilingHint = 83` and the real internal
ceiling to 91. Assert the list root uses the estimated outline but neither
number appears as potential text. This test distinguishes visible scouting
knowledge from the internal ceiling.

- [ ] **Step 2: Write failing player-profile disclosure tests**

Open a controlled player with current 62 and explicit ceiling 84 in English and
Polish. Within the profile rating block, assert:

```js
assert.equal(visiblePeakRows(profileHtml).length, 1);
assert.match(visiblePeakRows(profileHtml)[0], /Peak OVR.*84/i);
assert.match(profileHtml, /rating-stars--profile/);
```

The Polish assertion uses the translated label. Remove the explicit `ceiling`
from another controlled player before opening and assert the component uses
`peakKnown: false` and no numeric peak row exists. Peak age remains visible as
age information.

- [ ] **Step 3: Verify RED**

```powershell
node --test tests/rating-surfaces.test.js tests/pages-render.test.js tests/i18n.test.js
```

Expected: local numeric cards and duplicate player-profile Peak OVR rows fail.

- [ ] **Step 4: Convert `pages.js` player surfaces**

Use the exact current value already owned by each screen (`ovr(p)` for active
competition/squad views and `ovrBase(p)` for academy/base views). Pass explicit
academy or scouted peak values to `ratingProfile`. Remove numeric `squad.peak`,
prospect/report `Peak`, and aggregate `academyBestPeak`. Replace the aggregate
with best current academy OVR and translated current-rating copy.

Keep age, peak age, attributes, morale, fatigue, records, salary, and historical
snapshots unchanged. Historical achieved highs never feed the potential layer.

- [ ] **Step 5: Convert runtime player modals and cards**

Because `rating-stars.js` loads after `gameplay.js`, resolve the renderer inside
each function through `window.PPM.ratingStars.renderRating`. Convert nomination,
loan, negotiation, live HUD, legacy youth intake, and Top-12 summaries to
summary disclosure.

In `openPlayerModal`, capture whether an explicit numeric `ceiling` or academy
ceiling exists, normalize it with current OVR, render profile disclosure, and
show exactly one translated `rating.peakOvrLabel` row when known. Remove header,
biography, and academy-report duplicates. A missing explicit ceiling does not
call an estimator merely to create a visible Peak number.

- [ ] **Step 6: Verify GREEN and commit**

```powershell
node --test tests/rating-stars.test.js tests/rating-surfaces.test.js tests/pages-render.test.js tests/i18n.test.js tests/matchday-manual.test.js
npm run check
```

Commit:

```powershell
git add -- src/ui/pages.js src/core/gameplay.js src/i18n/i18n.js tests/rating-surfaces.test.js tests/pages-render.test.js tests/i18n.test.js
git commit -m "feat: show shared ratings across player surfaces"
```

### Task 4: Apply the component to staff and club-overview surfaces

**Files:**
- Modify: `src/ui/pages.js`
- Modify: `src/core/gameplay.js`
- Modify: `src/core/gameplay.club-ui.js`
- Modify: `src/i18n/i18n.js`
- Modify: `tests/rating-surfaces.test.js`
- Modify: `tests/i18n.test.js`

**Interfaces:**
- Consumes: `staffOvr(staff)`, explicit staff `ceiling`, `staffCeiling(staff)`, and Task 1 renderer.
- Produces: current-only staff summaries and one exact Peak OVR row in the opened staff profile.

- [ ] **Step 1: Write failing staff coverage and disclosure tests**

Test owned staff cards, academy scout cards, market/history staff cards, staff
negotiation, club-overview player/staff rows, and the opened staff profile.
Summary roots must render five slots, one current OVR, no exact ceiling in
visible text/aria/title, and no raw translation key in EN or PL.

Set a staff member to an explicit known ceiling and assert the opened profile
contains one `.rating-stars--profile` plus one translated numeric Peak OVR row.
Delete explicit ceiling on another staff object before rendering and assert the
profile omits that row. Keep peak age visible and separate.

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/rating-surfaces.test.js tests/i18n.test.js
```

Expected: staff lists and negotiations still leak numeric ceiling and overview
rows have no shared stars.

- [ ] **Step 3: Convert staff summaries and remove list disclosures**

Replace `staff.agePeak` list usage with translated age/peak-age copy that has no
ceiling parameter. Convert staff cards, academy scout cards, staff history's
current-person summary, staff negotiation, and club-overview staff rows to
summary disclosure. Preserve seasonal history numbers as achieved snapshots;
rename a generic visible `Peak` history label to translated `Recorded high OVR`
so it cannot be mistaken for potential.

Convert club-overview player rows through the same player summary helper. Keep
team OVR and historical team peak outside this component because they are team
statistics, not player/staff potential.

- [ ] **Step 4: Convert the staff profile**

Capture whether staff has an explicit numeric ceiling before any metadata helper
can synthesize one. Render profile-sized stars and visible current OVR. Add one
translated numeric Peak OVR row only when explicit ceiling is known. Remove the
numeric ceiling from `openStaffNeg`, which is a negotiation surface rather than
a profile.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
node --test tests/rating-stars.test.js tests/rating-surfaces.test.js tests/i18n.test.js tests/pages-render.test.js
npm run check
```

Commit:

```powershell
git add -- src/ui/pages.js src/core/gameplay.js src/core/gameplay.club-ui.js src/i18n/i18n.js tests/rating-surfaces.test.js tests/i18n.test.js
git commit -m "feat: show shared ratings across staff and club views"
```

### Task 5: Audit disclosure, verify responsive output, and close Stage 3

**Files:**
- Modify: `docs/design/RATING-AND-POPULATION-CONTRACT.md`
- Modify: `docs/superpowers/plans/2026-08-01-shared-current-peak-rating.md`
- Verify: complete worktree.

**Interfaces:**
- Consumes: all Stage 3 rating consumers.
- Produces: a documented, regression-tested baseline for Stage 4.

- [ ] **Step 1: Run the production-source disclosure audit**

Run:

```powershell
rg -n -S "ovrStars|starsHtml|class=\"stars|Peak OVR|peak OVR|>Peak:|squad\.peak|staff\.neg\.ceiling" src
```

Expected: the private market renderer is absent. Numeric potential output occurs
only in translated player/staff profile blocks. Remaining `peakOvr` occurrences
are simulation data or explicitly labeled achieved career/team records.

- [ ] **Step 2: Run focused renderer and surface verification**

```powershell
node --test tests/rating-stars.test.js tests/rating-surfaces.test.js tests/pages-render.test.js tests/i18n.test.js tests/world-foundation.test.js
npm run check
```

Expected: exact fractional layers, information disclosure, every named surface,
bilingual output, and syntax all PASS.

- [ ] **Step 3: Verify desktop and narrow layouts**

Render the transfer market, squad, academy, nomination modal, player profile,
staff page, staff profile, and club overview at desktop and a <=520px viewport.
Confirm all five slots remain visible, stay on one line, and preserve dim/gold
outline/solid-fill distinctions. Record screenshots or automated DOM evidence
when browser control is unavailable.

- [ ] **Step 4: Run the complete regression suite**

```powershell
npm test
npm run test:full
```

Expected: all normal and slow tests PASS with no regression in saves, match
simulation, careers, or rendering.

- [ ] **Step 5: Update the rating contract and record evidence**

Document the renderer namespace/signature, explicit `peakKnown`, disclosure
modes, CSS semantics, transfer filter scale, profile-only numeric peak, and the
historical-achieved-peak distinction in
`docs/design/RATING-AND-POPULATION-CONTRACT.md`. Check off completed plan steps
and append exact commands, counts, screenshots/DOM evidence, and commit IDs.

- [ ] **Step 6: Commit the Stage 3 verification record**

Run `git diff --check`, confirm `git status --short` contains only the planned
documentation edits, and commit:

```powershell
git add -- docs/design/RATING-AND-POPULATION-CONTRACT.md docs/superpowers/plans/2026-08-01-shared-current-peak-rating.md
git commit -m "docs: record shared rating verification"
```
