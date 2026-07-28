# HANDOFF — PingPong Manager engineering work

## Update 2026-07-28 — long-career stability

**Read this before touching the season loop or the save migration.**

### What competitions actually exist
League (22 matchdays, two divisions, promotion/relegation), the domestic cup
(a due round auto-plays before the next matchday), and the **Top 12 Masters**
(offered before the last league round, separately per division). That is all.

**Mundial and the Olympics never worked and have been removed.** Their flags
were set at the very end of a season — inside the block that moves the career
into the `transfer` phase — and `endSeason()` cleared them again before the
phase could return to `pre`. Both dashboard entry points sat behind
`else if(store.G.olympicYear)` / `else if(store.G.mundialYear)`, only reachable
while the phase IS `pre`, so no button ever rendered. The Mundial page had no
play button at all. Do not restore them; if the owner ever wants international
competition, design the calendar slot first. Old saves keep their
`olympic_gold` / `mundial_gold` trophies in the Hall of Fame.

### The long-career safety net
```
npm run test:soak            # 30 seasons, PL, seed 1234 (~5 min)
npm run test:soak:formats    # 8 seasons each on JP (T.League) and CN (CTTSL)
node tests/soak.js --seasons=10 --seed=7 --country=DE --club=3
```
`tests/lib/career-driver.js` plays the REAL game headlessly — preseason gates,
every `runMatchday()` (cup auto-plays inside), the Top 12 Masters, the
post-season gala, `endSeason()` — with a deliberately boring auto-manager. Only
`sleep()` and the gala's close button are stubbed; no result changes.

`tests/lib/invariants.js` is the reusable integrity check. Call `checkWorld(G)`
on any save object and `checkLiveLookups(sandbox)` on a booted game. It covers
id domains (players, pending academy pools, staff), club/market/loan references,
squad legality, schedules, the league table against stored results, career-history
ownership, the club register, finances, a deep NaN/Infinity sweep, and whether the
game's own resolvers open the person a card names. **Add new checks here, not as
another one-off test.**

`tests/real-saves.test.js` runs the owner's exported S4/S8/S11 careers through
migrate → invariants → two more seasons → save → load → invariants. It reads
`C:/Users/mwojn/Downloads` **read-only** (override with `PPM_REAL_SAVES_DIR`) and
skips itself when the files are absent. Never write to those paths.

### Fixed here (all confirmed in the owner's real saves or by the soak)
1. A `youthOnly` club is barred from the transfer market by design but nothing
   renewed its own contracts, so it dissolved — Akademia Orłów had ONE senior in
   the S11 save. Such clubs now renew their own people
   (`clubMustRetainOwnPlayers` in `gameplay.js`).
2. `playerHistory` buckets merged two players while ids were duplicated, so a
   career chart plotted a stranger. Migration now keeps only the rows on the
   owner's own timeline.
3. Migration kept stale market rows offering the manager his own squad members.
4. `findStaffById()` searched the market pools before the employed record, so a
   scout renewal wrote to the throwaway scoutPool mirror and the real contract
   expired anyway.
5. The signing-bonus slider could not be set to zero: `window._negBonus||exp.signingBonus`
   treated 0 as "unset" and charged the club the agent's full expected bonus while
   the modal displayed 0 €.
6. A club in the red could not sign even a FREE agent on a zero-cost package, so a
   severance payout (a starter benched three rounds walks out) could leave a career
   permanently unable to field three players.

### Known limits (measured, not fixed)
- `results` grows ~264 rows/season forever; per-duel detail is stripped after two
  seasons, so 30 seasons is ~3.9 MB of save. Fine for now, worth a cap eventually.
- ~75% of every AI academy's intake lapses before the age-21 graduation gate
  (juniors get a flat 3-year deal at 16–19). Ordinary clubs paper over it with
  free-agent signings; changing it would move the AI talent balance, so it was
  left alone deliberately.

---

## Update 2026-07-28 — reliable career saves

The single `localStorage` slot has been replaced by an IndexedDB career library.
It supports an unlimited practical number of named careers, queued autosaves,
three rotating recovery checkpoints per career, safe schema migration, import,
export, rename, delete and restore. The old `ppgame` save is imported only with
read-back verification and remains available if IndexedDB cannot start.

Durability boundaries now cover matchdays, cups and season transitions. Returning
to the main menu flushes pending writes. The save manager lives in
`src/core/save-manager.js`; the IndexedDB/memory adapters live in
`src/core/save-storage.js`. Design and implementation notes are in
`docs/superpowers/specs/2026-07-28-career-save-system-design.md` and
`docs/superpowers/plans/2026-07-28-career-save-system.md`.

Seven owner-provided real saves from seasons 4–11 were imported, migrated,
serialized and read back successfully. Keep JSON export as the portable/manual
backup route even though normal play now uses IndexedDB.

> **Purpose of this file:** if the AI assistant loses context (new session), READ THIS
> FIRST. It explains where the project is, what has been done, what comes next, and
> how to verify nothing is broken. It is the single source of truth for the
> ongoing engineering cleanup + realism upgrade.

---

## 0. Who does what (read this)

- **Mikołaj (owner)** — *does not program.* He is the **tester**: plays the game,
  says what feels good and what is broken. Decisions about gameplay/feel are his.
- **AI assistant** — does all coding, keeps tests green, keeps these docs updated.

**Working rule:** never claim something works without running the tests
(`npm test`). The owner cannot read code to catch a regression — the tests are the
safety net that protects him.

---

## 1. What the project is

A browser-based **table tennis club manager** (Polish UI). Pure front-end: open
`index.html`, no build step, no server. Source is plain JavaScript loaded as
`<script>` tags in a fixed order (see `index.html`).

**Read `VISION.md` first** — the project's north-star (4 pillars: clean backend →
UI redesign → make it feel alive → Steam release; plus the Steam/tech decision:
ship the HTML app via a Tauri wrapper, port is easy, stay framework-free).

Design references live in the repo and in the owner's research docs:
- `GDD-v17.md` — what the game should feel like
- `BALANCING-v17.md` — numbers/formulas
- `ARCHITECTURE-v17.md` — where each system lives
- Owner's research (table tennis rules, player styles, equipment, economy) — the
  realism roadmap we are working toward (see §6).

---

## 2. Current state (updated each session)

**Last updated:** 2026-07-26 (proto-final design language applied game-wide)

### 2026-07-26 — the design language is now the game's skin
`prototypes/proto-final.html` has been applied to the whole app: `styles/main.css`
was rewritten on its token system (carbon surfaces, club livery, Saira Condensed
figures, flat square panels, colour-coded numbers), and `index.html` + `shell.js`
were rebuilt into its masthead + rail. Because every legacy token name
(`--r --g --gold --s1 …`) is now an *alias* onto the new palette, all 15 screens
converted at once without touching page markup. The club's crest colours drive
`--club`, so the UI is recoloured per team. 112 tests green.

**There is exactly one theme: dark carbon.** The light theme was removed — a
stored `theme:'light'` was making the game open into a variant that no longer
matched the direction, which read as "it still doesn't look like the prototype".
Stored settings are coerced to dark. **All decorative emoji are gone** (163 of
them); the prototype has none. Keep it that way: use a pill, a tone bar or a
colour-coded figure to carry meaning, not a pictogram.

**Also done:** the **transfer market** is rebuilt on the owner's reference (filter
panel + one dense sortable table with star ratings, role tabs, age/ability
filters, favourites as a view). **Pre-season** and the **academy** are now step
flows — one decision on screen at a time with a step rail — instead of scroll
stacks. `pagePreseason()` and the academy branch of `pageSquad()` are the pattern
to copy for the remaining flows.

**Watch out for `.pos`.** It is the league *position chip* (fixed 24×22, slanted)
AND the "positive" modifier on `.pill` / `.opt .m`. Anything that takes a `pos`
modifier must reset `width/height/clip-path`, or it gets squashed to 24px and
clipped. Two components were already broken this way. When adding a component,
measure (`scrollWidth > clientWidth`) rather than eyeballing it — that sweep is
how both were found.

**What is NOT done (this was the skin plus two flows, not the architecture):**
the season stage rail and "the season is one flow" (pre/season/post as phases of
one hub, post-season owning the club change), the season-end flow, the inbox
rewrite, and i18n. Those are the rest of M1 (see `ROADMAP.md` §M1); the
components they need (`.stagebar/.stg/.inbox/.fold/.mrow/.quote/.out`) are
already in the stylesheet.

### 2026-07-24 (later) — direction locked + content realism
- **UI direction chosen:** `prototypes/proto-final.html` (D skin + E attribute grid).
  Season = one flow with a stage rail; pre-season is not a tab; post-season owns
  "change club". This is the reference for the M1 rebuild.
- **Club crests rewritten** (`getTeamLogoData`): five real compositions
  (roundel/shield/banner/diamond/hex) × four table-tennis devices × club colours,
  readable down to 24px. Preview: `tools/crest-preview.html`.
- **Name realism:** the PL first-name pool was an alphabetical dictionary of every
  Polish male name ever, drawn uniformly — so archaic names (Mściwoj, Strzeżymir,
  Boguchwał) were as common as Piotr. Now a curated common core (75%+) with the
  archaic tail weighted by age (veterans keep the old names), and surnames biased
  toward the real frequency order.
  **Important:** names draw from a PRIVATE PRNG. When they used `Math.random` the
  extra draws re-aligned the seeded world stream and pushed 8.3% of L1 clubs above
  110% of their budget (measured, was 0%). Naming must never touch the sim stream.
- **PL club names** now follow "<club word> <city>" (Rakieta Wrocław, Topspin
  Gdańsk…). Club words are invented on purpose — real word+city combos are almost
  all taken by existing clubs (trademark risk).
- Tests: **112 green** after all of the above.

### Shipped 2026-07-24 — avatars + UI (no gameplay change, 112 tests green)
| Area | What you get |
|------|----------------|
| Avatars | Rebuilt portraits: real head/neck/shoulders, hairline curves, 15 hair styles × 4 textures, jaw-clipped beards, age marks, glasses/cap/headband, 4 staff outfits. **Ethnicity model untouched** |
| Dark theme | Actually dark now — surfaces are theme tokens, not hard-coded white sheens (closes the deferred `OPEN-ISSUES` item) |
| Header | 8 truncating stats → 5 grouped blocks; file actions moved into Ustawienia |
| Squad | Card in three tiers, value-coloured stat bars, status chips in one row, actions pinned to the bottom |
| Budget | Grouped P&L with subtotals, zero rows hidden, no duplicated wage panel |
| Club | Facility cards rebuilt (level pill, price+CTA on one row) |
| Market | One row component for players **and** staff, with portraits |
| Staff / Preseason / Dashboard | Empty-state CTAs, shorter CTA, stats before narrative, portraits in the starting four |

> Verify visually with `tools/avatar-preview.html` and by switching Opcje → Motyw.


### Shipped this week (2026-07-11) — summary for owner/tester
| Area | What you get |
|------|----------------|
| Style counters | Equal-stat counters ~57–65%; skill still beats weak counters |
| Traits | Old traits work in matches; +6 new (Fast Feet, Spin Wizard, Wall, Clutch, Mentor, Big Match); Mentor boosts squad development |
| Staff | Psych softens losses + clutch; physio fatigue/injury; coach grows players harder |
| AI fairness | Hall + youth promote + injuries like you; softer magic OVR retune |
| Engine honesty | Equipment in matches; fatigue only for the two clubs playing |
| Avatars | More diverse male faces, region looks, club jersey colours |
| Market rule | Still **next-year pre-sign first** — no mid-season “buy contracted player and field him now” |

- Tests: **`npm test` = 108 green**; evidence suite includes `tests/traits-staff-ai.test.js`,
  `tests/engine-honesty.test.js`, styles band tests. See `CHANGELOG.md`.
- Docs: `DOCS.md` + this file + `AUDIT-*.md` refreshed to match.

### 2026-07-11 earlier — engine honesty + doc hygiene
- Equipment/tech → match engine; fatigue only for two clubs in a fixture.
- OPEN-ISSUES archive (all fixed).

> **Owner playtest list:** `OPEN-ISSUES.md` is fully checked off (archive). New
> feedback → new section here or a fresh OPEN-ISSUES block.

- Git initialised. **`node tests/stress.js`** long-career probe;
  **`node tests/stress.js youth`** academy probe. Full shipped list: `DOCS.md`.
- **Full audit pass (2026-06-30):** read every `.md` doc + `src/` against each
  other looking for bugs/math errors/doc drift. Found and fixed 2 real bugs:
  (1) `migrateLoadedGame()` never defaulted `playerHistory` — loading a save from
  before that field existed would crash on the next player snapshot; added the
  missing default next to `staffHistory` in `state.js`. (2) AI clubs' youth
  development never got the veteran-coach (+10%)/YOUTH_DEVELOPER (+8%) academy
  bonus the player's club got — `applyGrowth()` computed it inline for the player
  only; now a shared `academyMultByTeam` map (built from `getCoach(t.id)`) is used
  for both the player and AI loops, so every club's academy follows the same rule.
  Also corrected stale doc claims (test counts, a "zł" comment left over from the
  EUR rescale, the "ticket pricing has no effect" backlog line — it already does,
  the gap is UI discoverability not the mechanic). Everything else audited (style
  pentagon antisymmetry, RNG seeding, wage curves, bust/age-curve math, pruning,
  forfeit guard, VME blend) checked out correct. (Test count has grown since; see
  current `npm test` / DOCS.md.)
- **Shipped since baseline (summary):** headless test harness; 5 real playing
  styles; EUR economy (convex wage curves, no renewal shock, amortized bonus);
  emergent budget→OVR leagues; **AI clubs earn real income** (living, non-pyramid
  hierarchy); **Team Principals** (Layer 2) + club traits + youth-only challenge
  club "Akademia Orłów"; coach→player development; bounded long careers (HoF cap,
  pruning); prestige rebalance + result-driven merch / ticket-guarantee; misc bug
  fixes (B1–B3, forfeit guard).
- **Academy — SHIPPED (2026-06-30)** as a vertical slice: 6-level academy (intake
  band + ceiling band + dev bonus + upkeep), age-curve development (3 stat-aging
  groups + role ×1.0/×0.8 + ~10% bust), 1–2 juniors/season, mini-tournament, youth
  sales, free infra downgrade. Balance verified by `node tests/stress.js youth`
  (€5k youth-only → L1-quality ~season 27, solvent). See `DESIGN-academy.md`
  "IMPLEMENTED" + CHANGELOG. **Numbers were agreed with the owner before coding.**
- **Duplicate helpers removed**: `rnd`, `clamp`, `sleep` were defined twice
  (in `utils.js` *and* `gameplay.js`). The copies in `gameplay.js` were removed;
  the canonical versions in `utils.js` are used everywhere. No behaviour change
  (verified by tests).

Gameplay *has* changed a lot since baseline. Next owner value is **playtest feel**
(are staff/traits/styles obvious?) then living-world depth / UI / Steam.

### Backlog (ordered for next work — owner can reorder)
1. **Playtest pass** — does elite coach/psych/physio *feel* strong? style counters readable?
2. **Scout fog** (stat bands) — designed, not built (`DESIGN-staff.md`).
3. **Living world** — denser inbox, poaching drama, life-events (`DESIGN-ai-world.md`).
4. **Engineering** — split `gameplay.js` by domain; sim vs mutate; event delegation (§4).
5. **UI**: main pass shipped 2026-07-24 (see §2). Remaining: market grid view,
   match micro-animations, mobile/narrow-width polish. Then **Steam/Tauri**.
6. Optional: next-year **pre-sign fee** tuning (not buy-now transfer meta).

Cleanup already done (2026-07-11): unified names, schemaVersion, dead duel-odds removed.

---

## 3. How to verify the game still works

### Automated (the assistant must run this after every change)
```
npm test          # ~108 tests; boots the game headlessly
npm run check     # syntax-checks every source file
```
All tests must be green before claiming done.

### Manual (the owner / tester)
1. Open `index.html` in a browser — hard refresh (`Ctrl+F5`) after updates.
2. Start a new game, play a few matchdays and a full season.
3. Watch for: `NaN`/`undefined`, broken tables, dead buttons, console errors (F12).
4. Feel-check: hire strong staff, counter styles, rotate tired players — report if weak.
5. Avatar preview (optional): `tools/avatar-preview.html`.

---

## 4. The plan (engineering foundation), in order

This is the agreed roadmap. Status: `[x]` done, `[~]` in progress, `[ ]` todo.

1. `[x]` **Tests around the match engine.** Safety net so balance/feature changes
   can't silently break the game. → `tests/harness.js` (unit-level) plus
   `tests/lib/career-driver.js` + `tests/lib/invariants.js` (whole careers).
2. `[ ]` **Split `gameplay.js`** (~5.5k lines) by domain: `matches`, `economy`,
   `market`, `ai`, `season`, `staff`, `academy`. Do market+negotiations first.
3. `[ ]` **Separate simulation from state mutation.** `simTeamMatch` should
   *return* stat changes; a separate step applies them. Enables match previews /
   what-if simulation.
4. `[x]` **Remove duplicate helpers** (`rnd`/`clamp`/`sleep`).
   `[x]` **Unify `randNameForCountry`** → single impl in `utils.js` (2026-07-11).
5. `[x]` **`schemaVersion` on saves** (`SAVE_SCHEMA_VERSION=19` in `state.js`;
   stamped on newGame + migrateLoadedGame). Idempotent field guards remain; bump
   version when adding non-idempotent migrations.
6. `[ ]` **Reduce global coupling.** Move inline `onclick="..."` handlers toward
   delegated event listeners.
7. `[x]` **Remove dead duel-odds path** (`duelWinProbability` / `matchupProfileSwing`
   unused after point-sim rewrite).

### First realism slice DONE
- `[x]` **5 real playing styles** + in-game guide (see §8).

### Recommended sequence going forward
Next: `[~]` deepen styles into the match engine where helpful, then tackle the
owner backlog (§9) roughly top-to-bottom, then engineering #3/#2/#5/#6 as needed
to unblock features (e.g. #3 before doubles). Each item ships as a vertical slice
with tests + a guide/UX note.

---

## 5. Known issues / careful areas (do NOT forget)

- **`randNameForCountry`** — single impl in `utils.js` (uses country pools +
  `store.G.countryId` fallback). Do not reintroduce a second copy.
- `endSeason()`, `applyGrowth()`, `aiSignPlayers()` are the most sensitive
  functions. Any new save field → default in `migrateLoadedGame()` + bump
  `SAVE_SCHEMA_VERSION` if the migration is not purely additive.
- `runMatchday`/`playCupRound`/`runTop12Masters` are async + DOM-bound. Unit tests
  use `simTeamMatch` + `applyResult`; the soak runner drives the real thing (see
  `tests/lib/career-driver.js`).

---

## 6. Realism roadmap (from owner's research — future content)

Separate from the engineering plan. Build these *after* the foundation, each as a
vertical slice with tests:
- `[x]` **5 real playing styles** + grip + in-game guide. **DONE** (see §8).
- `[x]` **Doubles** as the deciding 5th match; per-league match formats (TTBL
  best-of-5, Polish 5th set to 6 no-advantage, Japanese Golden Point + Victory
  Match, CTTSL olympic protocol). **DONE 2026-07-03** — `LEAGUE_FORMATS`,
  `tests/formats.test.js`.
- `[x]` **Equipment** (blade / rubber / sponge) affecting stats. **DONE
  2026-07-03** (+ 2026-07-11 engine path via `engineStats`).
- `[x]` **Region-based age curves** (Asia vs Europe peak bands) — shipped earlier.
- `[x]` **Style counters + traits + staff impact** — 2026-07-11 batch.
- `[ ]` **Dual registration** (club + national team).
- `[ ]` **ITTF cards/penalties**.

---

## 7. Conventions

- After ANY code change: `npm run check` then `npm test`, then commit with a clear
  message. One logical change per commit.
- Keep this file and `CHANGELOG.md` updated at the end of every session.
- Match the existing code style of the file you are editing.
- New gameplay rule → `gameplay.js` (or its future split). New way to *display*
  something → `pages.js`. Static data → `constants.js`.

---

## 7b. ORDERED ROADMAP (agreed 2026-06-29)

Phases are ordered; items inside roughly so. Balance items = **discuss numbers with
owner first**. `[x]` done.

**P1 — Backend bulletproof + core balance (NOW)**
- `[x]` Bound data growth (HoF cap, prune retired, strip old match detail).
- `[x]` Wages/contracts fix (EUR curves, no renewal shock, amortized bonus).
- `[x]` League strength gap — **emergent, budget-coupled, league-agnostic**.
  ONE function `leagueStrengthTopForBudget(budget)` (inverts the convex wage curve:
  ~80% of budget on a 7-deep squad) sets every club's top-starter target, same in
  both leagues. Result @ new game: **L1 avg OVR ~81, L2 ~71**; richest 83 / poorest
  67; weak-L1 79 vs strong-L2 74 overlap for churn. No multiplier — L1 is stronger
  ONLY because it's richer. `tests/league.test.js`. (Multi-season emergence relies
  on income→budget, verify by playtest.)
- `[ ]` Broaden tests on action flows (staff hire, sponsors, scouting, season edges).

**P2 — Staff depth** (`DESIGN-staff.md`)
- `[x]` Coach → development (concave; strengthened 2026-07-11).
- `[x]` Physio + psychologist **meaningful** (fatigue/injury + morale/clutch) 2026-07-11.
- `[x]` Sparring via bench depth + MENTOR trait (not style-prep missions yet).
- `[ ]` Scout missions + **stats-as-bands fog**.
- `[ ]` Fitness coach, video analyst.
- Stress-probe income loop still a follow-up if league drift appears in long runs.

**P3 — Living world** (`DESIGN-ai-world.md`, pillar 3)
- `[x]` Inbox/mailbox (partial — decision mail can block matchday).
- `[x]` Team Principals + some club traits (partial).
- `[ ]` Round gazette depth. `[ ]` Full AI strategy variety.
- `[ ]` Poaching drama (tiers / gazette). `[ ]` Life-events. `[ ]` Voting.
- `[ ]` Deeper preseason + between-round activities.

**P4 — Systems & economy polish**
- `[x]` Tech partnership rework (Option A: equal +1-all floor for everyone, top tiers
  add a marginal +1 ATK/SRV for €3-10k, real value = marketability +6..35%; no more
  free +4 for the rich). `[ ]` Buildings rework.
- `[x]` Ticket pricing meaningful (price↔attendance↔merch trade-off, ultras floor,
  optimum shifts with merch-shop level). `[x]` Country-appropriate sponsors.
- `[x]` Sponsor multi-year contracts (1..maxYears, +6%/yr premium, carry across
  seasons). `[x]` AI difficulty transparency (new-game screen).
- `[x]` Player stat rework (realistic): 6 attributes FH/BH/SRV/RET/FOOT/MEN; OVR
  weighted; engine derives its 4 channels via `engineStats(p)`; aging by 3 groups;
  save migration splits old 4→6. `[x]` Lineup ordering (board 1-4 order via
  `boardOrder` + ▲▼ on starter cards; `getMatchStarters` respects it for the player).
- `[x]` Sponsor variety (some no-requirement offers, ~2-3× bigger pools, 12 offers).

**P5 — UI redesign** (pillar 2)
- `[x]` Denser layout / font / spacing (2026-07-24 pass: theme tokens, regrouped
  header, decluttered Squad/Dash/Budget/Club/Market/Staff/Preseason, dark theme fixed).
- `[~]` Market: unified row component with portraits shipped; a sortable
  Excel-like grid view is still open.
- `[x]` Better avatars (2026-07-24 portrait rewrite; ethnicity model untouched).
- `[ ]` Match micro-animations (GSAP, on/off).

**P6 — Steam-ready** (pillar 4, LAST)
- `[ ]` Real main menu. `[ ]` File saves / Steam Cloud. `[ ]` DB editor + default DBs.
- `[ ]` Challenge/scenario mode. `[ ]` Tauri wrap (+Steamworks). `[ ]` Music/SFX (licensed).
- `[ ]` "On feel" mode (someday).

## 8b. League strength — EMERGENT, not capped (design 2026-06-29)
Owner wants L2 to feel like "poverty" (~70 OVR) AND wants league strength to be
EMERGENT (clubs rise/fall between tiers through results & misfortune). Reconciled:
- **Believable INITIAL gap** at world generation (L1 clearly stronger than L2).
- **League-tiered ECONOMY maintains the gap by money, not by a cap:** L1 earns more
  (prize/sponsors/TV/attendance) → affords better players/staff/development → stays
  strong; relegated clubs lose that income → weaken; promoted clubs gain it → can
  invest. So strength follows league via budget.
- **Misfortune moves clubs** (a star leaves, injuries, aging, bad AI calls) → an L1
  club can slip; a well-run L2 club can rise. The ~70 in L2 EMERGES because L2 can't
  afford 80+ squads — it is not a hard rule.

## 8. Playing styles — design reference (SHIPPED)

The 5 styles are defined in ONE place: `PLAYER_STYLE_INFO` in
`src/data/constants.js`. Each entry holds both the guide text *and* an `engine`
block the match simulation reads — so to tune a style you edit only that table.

| id | label (UI) | role |
|----|------------|------|
| `TWO_SIDED` | Napastnik obustronny | balanced modern attacker (meta) |
| `FH_LOOPER` | Topspin z forhendu | forehand power, risky |
| `BLOCKER` | Kontra i blok | close-table counter, low error |
| `FISHER` | Obrona z półdystansu | mid-distance lob defence |
| `DEFENDER` | Nowoczesny defensor | chop + counterattack |

**Counter-pentagon** (each beats 2, loses to 2; defined by `beats`/`losesTo` in
the table and mirrored numerically by `STYLE_EDGE` in `gameplay.js`):
TWO_SIDED → FH_LOOPER → BLOCKER → FISHER → DEFENDER → (back to TWO_SIDED); each
style beats the next two in this cycle. `tests/styles.test.js` enforces that the
table, the pentagon antisymmetry, generation, migration and the engine effect all
stay consistent.

Touch-points if you extend styles: `constants.js` (the table + `COACH_STYLES`
synergy), `gameplay.js` (`STYLE_EDGE`, `OPPOSITE_STYLE`, rally engine reads
`engine.*`, `genPlayer` assignment, `styleLabel`), `state.js`
(`migrateLoadedGame` old→new map), `shell.js` (`openGuide`), `pages.js`
(`styleLabel` display). Legacy save map: AGRESYWNY→FH_LOOPER,
WSZECHSTRONNY→TWO_SIDED, CIERPLIWY→DEFENDER, TECHNICZNY→BLOCKER.

---

## 8c. Auto-play to end of season — SHIPPED (2026-06-30)
`autoPlaySeason()` + a ▶▶ AUTO-SEZON button by the season/round header. Plays
matchdays back-to-back with no animation (`matchPause` is instant under `ui.autoPlay`
and the per-point VME loop is skipped), reusing `runMatchday` so economy/news/
standings match manual play. STOPS on: injury / <4 healthy starters, a cup/Top 12
round due, the season-end gala, or toggling off (■ STOP). The match
modal stays open across matchdays; the overlay backdrop ignores clicks while
auto-playing. Smoke-tested headlessly.

## 9. Owner backlog (full wishlist — captured 2026-06-29)

Not yet started unless marked. Rough priority follows the order given by the owner.
Each becomes its own vertical slice (logic + tests + UX/guide note).

1. `[x]` **Background career generation** — DONE (2026-07-03). New-game wizard
   option (0/3/5/10 sezonów): the world plays full seasons in caretaker mode
   (no player club) — schedules, awards, world records, club history,
   promotion/relegation, aging/retirements, AI finances/poaching — then the
   chosen club is handed over wherever history took it (league, budget, squad,
   infra). Progress modal; ~1 s/season. `simulateBackgroundSeasons`.
2. **Default database + database editor** — ship a real default DB per country and
   an in-menu editor. *Owner note: do this LAST, once leagues/cups/all systems
   work, because DBs are built per-country.*
3. **Better avatars** — current ones are weak (`gameplay.visuals.js`).
4. **UI polish** — font feels slightly uneven in places; tighten spacing.
5. **Staff negotiation parity** — staff use a separate system (only years offered).
   Give them player-like negotiation: wage + signing bonus + years.
6. **Re-evaluate the buildings/infrastructure system** — currently weak; e.g.
   upgrading the injury-reduction building isn't worth it.
7. `[x]` **Country-appropriate sponsors** — DONE (2026-07-01). `COUNTRY_SPONSORS` per
   country (PL/DE/CN/JP/SE/KR, incl. real TT brands: Stiga, Butterfly, Li-Ning…);
   `genSponsorOffers` draws from the club's country. `tests/sponsors.test.js` (2).
8. **Deeper preseason** + rework **tech partnership** — right now it gives the best
   teams a free stat boost and the worst teams penalties (rich-get-richer).
9. `[x]` **Real main menu** — DONE (2026-07-01): Nowa gra / Wczytaj grę / Wczytaj z
   pliku / Edytor bazy (wkrótce) / Wyzwania (wkrótce) / Opcje / Wyjdź, plus a
   single-screen sequential new-game wizard (kraj→liga→drużyna→trudność). DB editor
   + Challenges still TBD.
10. **Music** — owner can supply tracks if needed.
11. **More SFX (especially in matches) + animations.** *(The initiative/momentum
    bar issue this item used to flag is FIXED — see B3 in §10/§11.)*
12. **Ticket pricing** — price→attendance→revenue already exists in code
    (`gameplay.js` ticket pricing screen + season income); remaining ask is making
    the trade-off more **discoverable** in the UI (a visible optimum), not adding
    the effect from scratch.
13. `[x]` **Explain AI difficulty levels** — DONE (2026-07-01). `difficultyEffectsSummary(key)`
    (data-driven from `AI_DIFFICULTY_CONFIG`) shows, live under the new-game difficulty
    picker, what each level changes: AI budget/infra pace, free-agent OVR cap, your
    academy/scout talent ceilings, negotiation/prestige difficulty.
14. **Sponsor contracts** — let the player negotiate the rate AND the number of
    years with a sponsor (like player contracts).
15. **Animated / better-looking matches** (long-term, settings on/off). Feasible:
    GSAP is already loaded and the sim emits per-point data (rally length, aces,
    who won each point), so a ball/score/momentum animation can be driven from real
    results. Start with CSS/GSAP micro-animations (toggleable), optional canvas
    rally view later. Not a rewrite.
16. **"On feel" mode** — SHELVED for now (owner: not yet). Someday: hide OVR/stats.

## 13. Living-world & balance backlog (owner 2026-06-29 — DISCUSS before coding)

All of these are gameplay/feel → **must be designed and agreed with the owner
before coding** (see memory `discuss-balance-before-coding`).

- **L1/L2 OVR gap (HUGE / high priority).** Right now OVRs are too constant and too
  similar across League 1 and League 2. L2 should feel like "poverty": clearly lower
  OVR, roughly capped around ~70. Differentiate the tiers properly
  (`getLeagueStrengthTargets` / `tuneGeneratedLeagueRoster`).
- **Player contract wages (fix).** Starting wages are far too low, so renewing costs
  2–3× the initial wage (jarring). Make initial wages realistic / renewal not a
  shock. Part bug, part balance → discuss numbers.
- **AI strategy personalities.** Each club needs distinct short- & long-term
  strategies so the table genuinely shifts over seasons (some chase youth+cheap long
  deals and rise; some win-now). Plus **club TRAITS**: e.g. only-domestic staff, no
  players over 32, "traditionalists", etc. → a living, varied league.
- **Voting system (F1/FIA style).** Clubs vote on league rules: number of rounds,
  number of teams, budget cap, match format, prize structure. The world changes over
  time → alive and replayable.
- **Round gazette / newspaper.** Each round: results, transfer rumours, infra
  upgrades, shock sackings. Builds the "living world" feel (extend the existing
  `newsFeed`). Pillar 3.
- **More to do BETWEEN rounds.** Currently too little happens between matchdays —
  add meaningful decisions/activities (ties to academy depth, sparring prep,
  analyst, events).
- **Deepen the ACADEMY system** (owner wants it improved and expanded).
- **Stats-as-bands + real OVR** scouting model (see `DESIGN-staff.md`).

## 14. Backend health — measured (100-season stress probe, 2026-06-29)

Tool: `node tests/stress.js [seasons]` runs a full headless career (both leagues +
real `endSeason()`), reporting time, array sizes and memory. **This is our "fast bug
detection" instrument** — run it after risky changes.

**Results of a 100-season run (seed 1234):**
- ✅ **No crashes** after the forfeit fix (a 0-roster club now forfeits instead of
  throwing — was crashing at season 4). Guard test in `tests/robustness.test.js`.
- ✅ **No logic explosions** — game state stays internally consistent.
- ⚠️ **UNBOUNDED STATE GROWTH = the #1 backend priority for long careers:**
  - `players` array: 176 → **1900** by season 101, of which **1597 are retired**
    (never removed). 84% dead weight.
  - `results` array: 0 → **26,400** (264/season, never pruned; each holds full
    `matchups` detail = heavy).
  - heap: 6 MB → **~280 MB**.
- ⚠️ **Performance degrades ~2× over a long career**: ~2.4 s/season early →
  ~5.2 s/season by season 90. Root cause: hot loops iterate the WHOLE `players`
  array every match (e.g. the fatigue/rest pass in `simTeamMatch` loops all
  players, retired included), so as the array bloats, every match slows down.

**FIX SHIPPED (2026-06-29) — `pruneCareerData()` runs each season-end:**
1. ✅ **Hall of Fame capped at 20** best careers (by `goatScore`); displaced ones
   permanently deleted (owner rule). Each kept entry is a full inspectable profile
   (career history, trophies/records, peak, stats) → powers the HoF + the player
   comparator (current players + legends).
2. ✅ **Retired players removed** from the active `players` array (they live on only
   as HoF summaries); their dangling `playerHistory` cleaned up.
3. ✅ **Old results stripped** of heavy per-duel detail (`matchups`/`tiebreak`);
   current + previous season kept full.

**Measured before → after (stress probe):**
| | before | after |
|---|---|---|
| players @ ~50 seasons | ~860 & climbing | **~310, stable** |
| retired kept | all (1597 @ s100) | **0** |
| time / season | 2.4s → **5.2s** (climbing) | **flat ~0.4s** |
| heap | ~280 MB | **~70 MB** |

Tests: `tests/prune.test.js` (3). Remaining minor: the `results` array still grows
linearly in COUNT (now lightweight objects) — fine for 100+ seasons; cap to last N
seasons later if ever needed. Re-run `node tests/stress.js 100` to re-verify.

**Academy-slice backend check (2026-06-30 — done, NOT a regression):**
- Verified against the pre-academy commit (`971815f`). At season 11, current vs
  baseline: **390 vs 398 active players** (identical — no count regression) and
  **3.5 vs 3.0 s/season** (~15% slower, from the richer per-player growth math:
  `applyAgingTo` calls `playerCeiling`/gap factor for ~390 players × 2 blocks).
  Acceptable. League strength healthy (L1 ~78–83, L2 ~67–74, proper gap).
- The earlier "~310 stable / ~0.4 s/season" figure in this doc was **optimistic** —
  the baseline itself is ~398 players / ~3 s/season by season 11. Player count keeps
  climbing slowly (≈551 by s31) toward a plateau; same shape as baseline. If long-run
  speed ever matters, the lever is the hot loops iterating the WHOLE players array per
  match (skip non-squad players), not the academy.
- **Harness gap (known, pre-existing):** the headless probe canNOT charge the
  player-club season finance (wages/maint/prize/**academy upkeep**) because that path
  lives in the DOM-bound `runMatchday` season-finale, not `endSeason`. The youth
  balance probe (`stress.js youth`) therefore models the player economy EXPLICITLY.
  Wiring the real finance flow into the harness would let stress test solvency for
  the human club directly (still on the P2 to-do).

---

## 10. Confirmed bugs (from owner playtest 2026-06-29)

- **B1 `[x]` FIXED — Signing dumps a starter into reserves.** `doNegotiate()` now
  fills an empty starter slot (starter when the club has <4 starters, else bench).
  Regression test: `tests/signing.test.js`.
- **B2 `[x]` FIXED — Raw style ids in the live-match style note.** `getStyleEdge()`
  label now uses `styleLabel()` → "Napastnik obustronny ma przewagę nad Topspin z
  forhendu".
- **B3 `[x]` FIXED — Initiative/momentum bar was static.** `renderVME()` now blends
  skill momentum + live point diff + sets won so far, so the bar moves during the
  duel. Test in `tests/vme.test.js`.

## 11. Match screen (VME) UX notes — owner playtest 2026-06-29 — ALL ADDRESSED

All fixed in `renderVME()`; locked by `tests/vme.test.js`.
- `[x]` Removed the duplicate tiny club-name labels under the initiative bar.
- `[x]` Player NAMES were invisible (dark theme: name had no explicit colour on
  the hard-coded light card). Now an explicit dark colour. *Root cause note: any
  text on these light cards needs an explicit colour.*
- `[x]` Trait badge row given a fixed `min-height` so cards line up with/without
  traits.
- `[x]` "White balls" = completed-set pills whose numbers were invisible (same
  dark-theme cause). Now readable, labelled `S1 11:9`, etc.; live point score now
  colours home (red) vs away (green).
- `[x]` Micro-stats now appear only AFTER the duel ends (they were the final
  numbers shown from the start, which looked pre-played).

## 12. Other feature notes (owner 2026-06-29)
- **Lineup ordering**: let the player set the ORDER of players in the squad
  (matters for who plays which board — and will matter more once per-league match
  formats / doubles land).
- **Staff matters too little**: increase staff (coach/physio/etc.) impact so
  hiring good staff is clearly worth it. (Ties to backlog #6 buildings and #5
  staff negotiation.)

---

## 15. NEXT-SESSION PROMPT — Academy (give this to the next Claude)

> Polish, per owner. The academy DESIGN is agreed (`DESIGN-academy.md`) EXCEPT its
> ECONOMY and its LEVELS — those MUST be discussed with the owner before coding.

```
Pracujesz nad grą menedżerską PingPong Manager. ZACZNIJ od przeczytania (w tej
kolejności): DOCS.md → HANDOFF.md → DESIGN-academy.md. Potem `npm test` (musi być
44 zielone) żeby potwierdzić stan.

ZASADY PRACY (twarde):
- Każdą zmianę BALANSU/odczucia gry UZGADNIASZ z właścicielem (Mikołaj, nie koduje,
  jest testerem) ZANIM ją zakodujesz. Czyste bugi/refaktory/testy możesz robić sam.
- Po każdej zmianie: `npm run check` i `npm test`, potem commit (jeden logiczny
  commit na zmianę). Wszystko ma być cofalne.
- Pliki w UTF-8, waluta w € (nie zł). Testy w tests/ (harness boota grę headless).

ZADANIE: zbuduj SYSTEM AKADEMII jako vertical slice z testami + sprawdzeniem
stress (tests/stress.js). Projekt jest uzgodniony w DESIGN-academy.md:
- intake juniorów co sezon zależny od POZIOMU akademii (sloty + widełki OVR/ceiling
  + bonus rozwoju) oraz misje skautowe; opcja mini-turnieju ekonomicznie nieoczywista,
- krzywa wieku z researchu właściciela: tempa rozwoju/spadku per przedział wieku
  + 3 grupy statów starzejące się różnie (fizyczne→atk spada pierwsze; techniczne→
  srv trzyma długo; mentalne→men peak 28-32, najwolniej). Zastosuj w applyGrowth.
- rozwój ×1.0 w pierwszym składzie, ×0.8 na ławce/w akademii, × trener
  (coachDevMultiplier już istnieje) × infra; ~10% juniorów nie dochodzi do peak,
- ekonomia młodych: małe pensje (z kosztem treningu), wypożyczenia.

NAJPIERW MUSISZ OMÓWIĆ Z WŁAŚCICIELEM (zanim zakodujesz liczby):
1. EKONOMIA AKADEMII — koszt utrzymania per poziom, koszt misji/mini-turnieju,
   pensje/koszt treningu juniorów, przychód ze sprzedaży/wypożyczeń wychowanków.
2. POZIOMY AKADEMII — ile poziomów, co dokładnie daje każdy (sloty, widełki OVR,
   bonus rozwoju), ile kosztuje ulepszenie.
Przedstaw konkretną propozycję liczb (widełki, bez jednego oczywistego optimum),
poczekaj na akceptację, dopiero potem koduj.

CEL BALANSU: klub youth-only "Akademia Orłów" (€5k, OVR ~60) ma być TRUDNY ale
MOŻLIWY do wyprowadzenia do I ligi przez wiele sezonów — sprawdź to stress-testem
(czy klon youth-only AI potrafi awansować). Zaktualizuj DOCS.md/HANDOFF.md/CHANGELOG
i DESIGN-academy.md po wdrożeniu.
```
