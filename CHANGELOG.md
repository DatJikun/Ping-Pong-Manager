# Changelog

## 2026-08-20 — Katalog życia w skrzynce

- Mały katalog: opieka po urazie, wypalenie, sprawa rodzinna, mentorship, szum okołoklubowy, złamana gwarancja pierwszego składu.
- Nadal 0–3 sprawy, ciche kolejki, skutek TAK/NIE przed kliknięciem. Pauza (rodzina/wypalenie) wyłącza zawodnika z najbliższego meczu.

## 2026-08-20 — Żywa kariera: skrzynka, budynki, akademia

- Skrzynka: 0–3 sprawy, ciche kolejki OK. Rezerwa prosi o stół według roli w kontrakcie (projekt / rotacja / pierwszy skład), nie 50% przy formie ≥4. Skutek TAK/NIE widać przed kliknięciem.
- Budynki: miękki sufit mocy na korcie. Po poziomie 5 kupujesz projekty (trybuny, internat, odnowa, merch), nie kolejny plus do OVR. Medycyna skraca i rzadzi uraz u tych, którzy grali. Nazwy bliżej klubu TT.
- Akademia: ten sam zakres peak OVR (56–92) na każdym poziomie. Upgrade podnosi szansę na górę skali, nie sam sufit. Schema zapisów 22 (`infraProjects`).
- Rynek: kolumna Peak — liczba u swoich, `?` u obcych (pełna mgła skauta później).

## 2026-07-28 — Fictional official database

- Replaced shipped real-world club, sponsor and technical-partner identities
  with fictional data: 24 clubs and 60 sponsors for every supported country.
- Added save schema 21 migration. Existing official careers keep their stable
  club IDs, statistics and history while names in live data and historical text
  are updated. Names from community/custom databases are never rewritten.
- Removed the obsolete equipment-brand catalogue and its dead selection API.
- Added a release gate that rejects a maintained list of real-world identities.
- Verified all eight supplied careers (seasons 4–16) read-only through migration.

## 2026-07-28 — Release audit and offline runtime

- Added one evidence-based release-readiness document covering legal data,
  localisation, desktop packaging, persistence and recovery requirements.
- Removed all runtime CDN requests. Barlow and Saira Condensed are bundled with
  their OFL 1.1 licences; page and modal transitions now use the browser-native
  Web Animations API instead of GSAP.
- Added a release gate that fails if a remote runtime script, stylesheet or font
  is reintroduced or a required local font/licence asset is missing.

## 2026-07-28 — Biblioteka karier i bezpieczne zapisy

- Zastąpiono pojedynczy zapis `ppgame` biblioteką dowolnej liczby nazwanych
  karier w IndexedDB. Nie ma sztucznego limitu pięciu karier; ostrzeżenie pojawia
  się dopiero, gdy przeglądarka faktycznie zbliża się do limitu miejsca.
- Autosave jest kolejkowany, więc wolniejszy starszy zapis nie może nadpisać
  nowszego. Powrót do menu oraz przejścia przez kolejkę, turniej i koniec sezonu
  czekają na trwałe zapisanie danych.
- Każda kariera utrzymuje trzy automatycznie rotowane punkty odzyskiwania.
  Migracja starego formatu dostaje osobną kopię bezpieczeństwa na czas operacji.
- Stary zapis z `localStorage` jest automatycznie importowany i usuwany dopiero
  po poprawnym odczycie kopii z nowego magazynu. Awaria IndexedDB pozostawia
  stary zapis nietknięty i oferuje jego awaryjne wznowienie.
- Menu kariery pozwala kontynuować, zmienić nazwę, wyeksportować, przywrócić
  kopię i usunąć karierę. Import JSON zawsze tworzy osobną karierę.
- Wszystkie siedem dostarczonych zapisów (sezony 4–11) przeszło import,
  migrację, ponowny zapis i odczyt; biblioteka zachowała siedem unikalnych karier.

All notable changes to the engineering/codebase. Gameplay-feel changes are noted
separately where relevant. Newest first.

## 2026-07-26 — Design language: proto-final ("Paddock") applied to the whole game

Owner brief: *"`prototypes/proto-final.html` is the design language we need to
incorporate into the whole game."* All 112 tests green; no gameplay change. This
is the **skin/system** half of M1 — the information architecture (season stage
rail, one-flow season, screen-by-screen rebuilds) is still ahead.

**`styles/main.css` rewritten on the prototype's system.** Same class names, new
language, so all 15 screens converted at once instead of one at a time:
- **Tokens are the whole language.** Carbon surfaces (`--carbon/--surf/--surf2/
  --raise`), one ink ramp, signal colours (`--volt/--cyan/--lime/--red`), and the
  club livery (`--club/--club2`). Every legacy token (`--r --g --gold --blue
  --purple --teal --orange --s1..s3 --b1 --b2 --tint-*`) is now an alias onto
  them, which is why 1500 lines of existing markup kept working untouched.
- **Typography:** Saira Condensed (display + every figure, tabular) + Barlow
  (body). Replaces Syne/Helvetica. The 24 inline `font-family:Syne` call sites in
  JS were swapped too — carefully, since `styleSynergy` contains that substring.
- **Flat geometry:** `--radius: 0`. No rounded corners anywhere; the radius
  utilities (`.r3 … .rpill`) are retained as no-ops so markup still parses.
  Accents are 3px tone bars and slanted (`clip-path`) markers instead.
- **Components reskinned:** `.card`/`.ct` became the panel with a full-bleed
  slanted header, `.sb` became the KPI tile with a top livery bar (its accent
  follows the figure's colour class via `:has()`), `table.t` got the FM-style
  colour-coded treatment, `.btn` variants got clipped corners, and every
  chip/badge (`.pill .pc-tag .tb .award .league-badge .mkt-badge`) collapsed onto
  one pill shape.
- **Prototype kit added** for screens as they get rebuilt: `.panel/.kpi/.tbl/
  .attrs/.dots/.stagebar/.stg/.substeps/.ss/.stage/.opt/.dec/.inbox`.
- **Light theme kept** as a daylight variant of the same language (token swap
  only). The prototype is dark by design, so **dark is now the default** —
  `DEFAULT_APP_SETTINGS.theme` flipped to `'dark'`.

**Shell rebuilt (`index.html` + `shell.js`).**
- Masthead is the livery band: crest + club + standing on the left, stat blocks
  right-aligned, 2px club-coloured rule under it. Every `updateHeader()` id kept.
- Rail is grouped (Klub / Operacje / Rozgrywki / Raporty) with a season footer
  line, and its **emoji icons are now monochrome inline SVG** that inherit
  `currentColor`, so the active row takes the club livery.
- **Per-club livery is live:** `applyClubLivery()` derives `--club/--club2` from
  the club's own crest palette (lifted toward white on carbon, deepened on the
  light theme) — the UI is recoloured per team, as the prototype intends.
  It must be written to `<body>`, not `<html>`: the theme classes declare
  `--club` on body, and a declaration there beats one inherited from html.
- Main menu: one accented action (Nowa gra) instead of seven solid slabs.

**Second pass, same day (owner: *"nadal nie wygląda jak prototyp, na początku jest
biały ekran, wszędzie niech będzie czarny"*):**
- **Light theme removed.** A returning player's `localStorage` still held
  `theme:'light'`, so the game opened into the light variant — which is why it
  did not look like the prototype. `normalizeAppSettings()` now coerces any
  stored theme to `'dark'`, the `body.theme-light` token block is gone, and the
  theme switch is out of Ustawienia. One theme: dark carbon.
- **No more white flash on load.** `<html>` gets the carbon background (the first
  paint happens before any script runs, and an unpainted `<html>` is white), an
  inline `<style>` paints it before the CDN stylesheets arrive, the Google Fonts
  link is loaded non-render-blocking via the `media="print"` swap, and GSAP moved
  out of `<head>` to `defer` — in `<head>` it blocked first paint on CDN latency.
- **All 163 decorative emoji removed** from `pages.js`, `gameplay.js`,
  `shell.js` and `index.html` — the prototype contains none. Typographic marks it
  *does* use (▶ ✓ ✕ ← → ↑ ↓ ⌛ ·) were deliberately kept, as were the country
  flags in `constants.js` (data, not chrome). News items already carry meaning
  through their colour-coded left border, so the emoji prefixes were redundant.
- Brand mark is now the prototype's slanted livery square (`PP`) instead of a
  table-tennis emoji.

**Third pass, same day — market overhaul + the first two real flows.**

**Transfer market rebuilt on the owner's reference (Motorsport Manager's staff
market): a filter panel on top, one dense sortable table underneath.**
- **Role tabs** (Zawodnicy / Trenerzy / Fizjo / Psycholodzy / Skauci / PR)
  replace the type dropdown; the market is one role at a time. `ui.marketTypeFilter`
  default moved `'all'` → `'player'`, and `'all'` from an old save is mapped to
  `'player'` so nobody opens an empty market.
- **Filter groups**: Widok (Wszyscy z licznikiem / Obserwowani), Wiek
  (16-22 / 22-28 / 28-34 / 34+), Ocena (próg gwiazdek ze stepperem), plus search.
- **Star ratings** from OVR over a 45–95 band (a 0–100 map squeezed every
  professional into three-and-a-half stars), drawn as a clipped overlay so half
  stars are exact.
- **Table columns**: obserwuj / nazwisko (z portretem) / kraj / wiek / ocena /
  klub / rozgrywki / pensja / odstępne / kontrakt do / status / akcja — every
  header sorts. Players and staff share one row shape.
- Favourites now work for staff too (`marketShortlistStaff`), and are a *view*,
  not a separate card. The S+1 commitments and negotiation history moved behind
  one toggle instead of being permanent cards above the list.

**Pre-season is now a flow, not a stack.** Four steps (sponsorzy → partner
techniczny → cena biletów → cel zarządu) on a step rail, one decision on screen
at a time, each rendered as `.stage` + `.opt` with visible consequences. It opens
on the first *unsettled* step, the footer always names what is still missing, and
the season unlocks only when all four are closed.

**The academy is four sub-steps** (Juniorzy / Nabór / Skauci / Raporty) with one
block on screen at a time, plus a KPI strip — it was five stacked cards on one
scroll.

**Two real CSS collisions fixed** (both found by measuring, not by eye):
`.pill.pos` and `.opt .m.pos` were inheriting `width:24px;height:22px;clip-path`
from `.pos`, the league *position chip* — so every positive pill and every money
figure in a flow step was squashed to 24px and clipped. The pill and figure rules
now reset that geometry; the league chip is untouched.

## 2026-07-24 — Portrait rewrite + UI pass (theme tokens, dark theme, key screens)

Owner brief: *"improve and diversify the avatars (leave ethnicities as they are),
improve the UI wherever possible — messy placement, too much on some sections,
not coherent enough"*. All 112 tests stayed green; no gameplay/balance change.

**Avatars — `gameplay.visuals.js` `getAvatarData()` rebuilt.** The region model is
untouched (same nationality→region families, same skin / hair-colour / iris pools
and per-region feature frequencies). Everything else is new:
- Real head construction: skull→jaw→chin path (widest at the cheekbones, rounded
  chin), neck with a jaw shadow, shoulders — instead of an ellipse with a hat.
- Hair is the head shape *grown* by a per-style thickness and cut at a **hairline
  curve** (straight / widow's peak / receding), so hair has volume and can never
  fall over the brows. 15 styles × 4 textures (straight/wavy/curly/tight-curl,
  curls render as a scalloped hairline), plus age-driven recession (4 stages) and
  a horseshoe for bald.
- Beards are clipped to the face path: stubble, moustache (3 shapes), goatee, full,
  soul patch, chinstrap, boxed — they follow the jaw instead of blobbing.
- New knobs: 5 head shapes, jaw width, build (shoulder width), 6 brow shapes,
  4 eye shapes, 5 noses, 6 mouths/expressions, ear size, glasses (4 frames),
  headband, cap, earring, freckles/mole/scar, 7 kit patterns, 3 collars, and
  4 staff outfits (blazer+tie / polo+lanyard / quarter-zip / knit).
- Age marks: forehead + brow lines, nasolabial folds, crow's feet.
- `tools/avatar-preview.html` rebuilt (150px detail row, ageing row, 44px list-size
  sanity check).

**Theme tokens — the dark theme is now a real theme.** Every card/panel used a
hard-coded `rgba(255,255,255,.48)` sheen, so dark mode was light cards behind a
grey wash (the deferred item in `OPEN-ISSUES.md` §6). Added
`--sheen/--sheen-2/--panel/--panel-2/--panel-3/--line/--line-soft/--shadow/
--shadow-lg/--tint-good|warn|bad|mine|info`, replaced ~55 hard-coded surface
values across `main.css`, `pages.js` and `gameplay.js`, retuned the dark palette,
and themed form controls (they were black-on-white in dark).

**Header** — eight stat blocks that truncated at any real width ("KS Pi…",
"250 0…") → five grouped blocks with a sub-line (club+liga+pozycja, budżet,
sezon, OVR+sztab, prestiż+MGR). Save/load/database/new-game moved into Ustawienia.

**Screens** — Squad: card rebuilt in three tiers (identity+OVR, six ratings with
value-coloured bars, condition/contract facts, actions), status chips share one
row, marketability/loyalty moved to the player modal; filter bar slimmed.
Dashboard: stats before narrative, no box-in-a-box frame, portraits in the
starting four. Budget: 19-row flat P&L → Przychody/Koszty groups with subtotals,
zero rows hidden behind a toggle, duplicate wage panel removed, season picker
folded into the card header. Club: facility cards rebuilt (level pill, price and
CTA on one row that can't collide), club identity moved to the top. Market:
players and staff now render through **one** row component (portrait, badge,
facts, same OVR + action column) instead of two unrelated layouts; filters folded
into the list card. Staff: role slots with a "find a candidate" CTA instead of
five mostly-empty boxes. Preseason: CTA no longer wraps to three lines.

Asset cache `?v=23`.

## 2026-07-11 — Code cleanup (names, schema, dead path)

- **Single `randNameForCountry` / `getCountryNamePools`** in `utils.js` (removed
  divergent copies from `state.js` + `gameplay.js`).
- **`SAVE_SCHEMA_VERSION = 19`** stamped on `newGame` and after
  `migrateLoadedGame` (idempotent field guards kept; version records floor).
- **Deleted unused** `duelWinProbability` / `matchupProfileSwing` (not on live path).
- Tests: `tests/cleanup.test.js`. Asset cache `?v=22`.

## 2026-07-11 — Docs sync (post traits/staff batch)

- Refreshed `DOCS.md`, `HANDOFF.md`, `AUDIT-*.md` progress tables, `DESIGN-staff.md`
  status, `BALANCING-v17.md` / `ARCHITECTURE-v17.md` / `GDD-v17.md` staleness notes
  to match **108 tests** and shipped style/trait/staff/AI work. Backlog ordered
  for owner: playtest feel → scout fog → living world → eng split → UI → Steam.

## 2026-07-11 — Traits, staff impact, style counters, AI parity

Owner-aligned batch (next-year market stays; no mid-season contracted buys):

1. **Style counters on live path** — `STYLE_EDGE.delta` applied once as a modest
   home-relative lift (×0.65 on raw ±3/±5). Equal-stat counters land **~57–65%**
   (band-tested); large OVR favorites still beat weaker counters (~75%+).
2. **Traits wired into match engine** — COMEBACK_KID, HOTHEADED, TACTICIAN, WALL,
   SPIN_WIZARD, FAST_FEET, CLUTCH, IRON_*, SERVE/AGGR, STEEL_NERVES, BIG_MATCH
   affect point sim / clutch / fatigue. **New traits:** FAST_FEET, SPIN_WIZARD,
   WALL, CLUTCH, MENTOR (~+10% sparring dev/mentor; applyGrowth with/without
   tested), BIG_MATCH (cups). Generation rolls more traits so the catalog shows up.
3. **Staff impact** — psychologist: morale after wins/losses + clutch MEN;
   physio: fatigue gain/rest mults + injury prevention (all clubs); coach
   development mult slightly stronger (dynasty lever).
4. **AI parity** — hall training for AI teams; youth auto-promote at 21 for all
   clubs; injuries roll for both clubs after each fixture (not player-only).
5. **AI roster retune softened** — only half-gap raise when >3 OVR under target.

Tests: `tests/traits-staff-ai.test.js`, styles threshold raised, suite green.

## 2026-07-11 — Avatar diversity pass (club colours + regions)

- Portraits no longer share one generic face: independent seed knobs for face
  shape, eyes, brows, nose, mouth, hair (14 styles + bald/receding), facial hair
  (5 types), glasses, freckles, moles, jersey patterns.
- **Region looks:** CN/KR/JP vs PL/DE/SE skin, hair, eye shape, facial-hair rates.
- **Players wear club colours** from `getTeamBranding(teamId)` (primary/secondary).
- Staff: blazer + optional club-tinted jackets, ties.
- Preview: `tools/avatar-preview.html` (PL / DE-SE / Asia / same-club / staff).
- Cache `?v=21`. Males-only (no female faces).

## 2026-07-11 — Avatar redesign (players + staff)

- Rebuilt procedural portraits in `gameplay.visuals.js` (`getAvatarData`):
  correct layer order (torso → neck → face → hair → features), cleaner hair
  set (8 readable styles), soft studio background, no noisy pattern / initials
  badge clutter.
- **Players:** athletic jersey + optional headband.
- **Staff:** blazer + shirt/collar; glasses more common; older staff greyer /
  thinner hair.
- Age greying, nationality-tinted skin/hair/eyes (EU vs CN/KR/JP).
- CSS polish on `.avatar` / `.avatar.xl`. Cache bust `?v=20`.
- Preview page for the tester: `tools/avatar-preview.html`.
- Tests: `tests/avatars.test.js`.

## 2026-07-11 — Doc hygiene (no gameplay change)

- Refreshed `DOCS.md` (92 tests, audit entry, shipped list, OPEN-ISSUES archive).
- `AUDIT-*.md`: progress table; equipment + fatigue marked fixed.
- `DESIGN-academy.md` / `DESIGN-ai-world.md`: headers match shipped reality.
- `HANDOFF.md`, `OPEN-ISSUES.md`, `BALANCING-v17.md`, `ARCHITECTURE-v17.md`
  staleness notes aligned with code.

## 2026-07-11 — Engine honesty (equipment + fatigue scope)

From the design/calc/realism audit (`AUDIT-design-calculations-realism-gameplay.md`):

1. **Equipment & tech partnership now affect the match engine.**
   `engineStats()` reads `getPlayerAdjustedStats` (blade + sponge + club rubber
   tier + tech partnership). Point sim no longer ignores gear while OVR UI
   showed the bonuses. `buildPointSimProfile` coach lift is now
   `effectiveRating − ovr` (coach-only) so equipment is not double-counted as a
   flat all-channel boost.

2. **Fatigue settles only for the two clubs in a fixture.**
   Previously every non-playing player in the world recovered after every
   `simTeamMatch` → a full matchday multi-rested bystanders ~6–11× and gutted
   rotation. Now: players who played gain load; sitting teammates rest once;
   other clubs are untouched until their own match.

Regression: `tests/engine-honesty.test.js` (4 tests). Full suite green.

## 2026-07-03 (batch 5) — Design unification: inline styles → class system

- **838 static inline styles across the codebase converted to classes** (751
  fully, 71 partially — dynamic `${...}` styles stay inline by design):
  a generated utility layer (~166 atomic classes: fs*/ink*/mb*/gp*/flex/grid/
  tile borders/radii…) plus semantic components (`.h-sub`, `.tile`, `.row-bet`,
  `.kicker`), all documented and appended LAST in main.css so they win
  specificity ties exactly like the inline styles they replaced.
- Every page and modal verified rendering in the browser (no console errors,
  pixel-consistent dashboards/club page); duplicate `class=` attributes from
  the migration merged. Asset version bumped to ?v=19.
- From now on new UI work should use the utility/component classes — one
  source of truth for the game's look.

## 2026-07-03 (batch 4) — UI v3 (left nav, full-width), region age curves

### UI v3 (owner feedback)
- Navigation is back on the LEFT — nicer than the original: icon+label rows,
  section headers (Zarządzanie/Operacje/Raporty), red active indicator + tint,
  PREZES/GM header restored, inbox badge on the icon.
- **Content spans the full screen width** (the 1160px cap and the bottom dock
  are gone); the KOLEJKA/SEZON quick button was removed from the nav (the
  dashboard action button is the single entry point).
- Design tokens (--radius/--radius-sm/--card-pad) unify cards across the game.
- **Asset cache-busting** (?v=18 on all local scripts/CSS) — stale-cache ghosts
  (e.g. the "SPRZĘT ×3" duplicate) can't happen after deploys anymore.

### Region age curves (owner research files)
- `peakAgeBand` per country: Asia (CN/JP/KR) peaks **21–26**, Europe (PL/DE/SE)
  **27–32**; player/youth/scout generation all use it, and per-stat maturity/
  decline shift with the regional peak (±0.8×offset, clamped −6..+4).
- Challenge club: the weakest-in-league guarantee is now ENFORCED at world
  generation (equipment mods added ±2 OVR noise that could lift it off the
  bottom). Suite **88 green**.

## 2026-07-03 (batch 3) — Background career generation (owner backlog #1)

- New-game wizard: **"Historia świata przed startem"** — 0 / 3 / 5 / 10 seasons.
- The league plays those seasons WITHOUT a player club (caretaker mode): full
  schedules under the country's real format, season awards, WORLD records
  (best club/player set them), club season history, promotion/relegation,
  player growth/retirements (Hall of Fame), AI finances, poaching, staff churn.
- Handover afterwards: you take the chosen club wherever history left it —
  league tier, squad, budget and AI-built infrastructure included — with fresh
  academy intake, sponsor offers, board objectives and a welcome mail.
- Progress modal with a live bar (~1 s/season); the save persists only at
  handover. Caretaker guards added (updateHeader/records/rollover tolerate a
  world with no player club). Suite **87 green**; verified live in the browser.

## 2026-07-03 (batch 2) — Per-league match formats + equipment

### Per-league formats (`LEAGUE_FORMATS`, owner dossier)
- **PL LOTTO Superliga**: protocol as before + the REAL rule: 5th set of every
  duel to 6 points, no advantage. Table 3/2/1/0.
- **DE TTBL / SE**: same protocol, table points 2/0.
- **CN CTTSL / KR (olympic)**: 3-man squads, G1 A-X, G2 B-Y, G3 DOUBLE, G4 A-Z,
  G5 C-X — nobody plays more than 2 games. Table 2/1.
- **JP T.League**: the DOUBLE opens (best-of-3), singles best-of-5, 2:2 → one-set
  VICTORY MATCH; Golden Point (10:10 → next point) outside deciders; deciding
  sets start at 6:6. Table 4 (clean) / 3 / 1 / 0.
- Nomination modal shows the country's protocol and drops reserve slots for
  3-man formats; table points/progression all route through `tablePointsFor`.

### Equipment (blade / rubber / sponge)
- Every player carries a personal setup fitted to his style (defenders: DEF
  blade + thin sponge; loopers: carbon + 2.1 mm, etc.) with small stat mods.
- **Club rubber tiers** (fresh rubbers wear out): Magazynowe/Turniejowe/PRO —
  recurring per-player seasonal cost (booked under brandCosts; auto-downgrade
  + mail if the budget can't carry it). AI clubs get a tier from their budget.
- Mods flow through `getPlayerAdjustedStats` → OVR displays AND the match
  engine see the same numbers. Player modal shows the setup; Klub page has the
  tier card. `tests/formats.test.js` (7). Suite **87 green**.

## 2026-07-03 — 80 staff per profession, wide staff OVR spread, bottom-dock UI

### Staff market (owner)
- **80 candidates per profession** (coaches, physios, psychologists, scouts, PR
  directors) generated at new game and maintained by the seasonal regen sweep.
- **Wide OVR distribution**: staff quality is a continuous skewed roll (~14–88
  OVR observed; many journeymen, a real elite tail) instead of 3 tight bands.
- **Peak OVR visible** everywhere staff are shown (market cards, staff pages).
- Save size at new game ~525 KB — well within localStorage limits.

### UI rework (owner)
- The left section panel is now a **bottom dock**: horizontal, grouped sections
  (Zarządzanie / Operacje / Raporty), active-tab underline, badge support, and
  the ▶ KOLEJKA/SEZON quick button pinned to the right. Fits 1440px wide.
- **Content column capped at 1160px** and centered — pages no longer sprawl the
  full window width. Market list cap raised to 100 rows (80-deep pools).

## 2026-07-02 (batch 3) — Real match protocol, inbox, nomination, uncancellable events

### Added — real Superliga/TTBL match protocol (owner decision: full protocol)
- **First-to-3 team matches**: G1 A–Y, G2 B–X, G3 C–Z, G4 A-or-reserve vs
  X-or-reserve (reserves enter from game 4), **G5 doubles** (B+C / Y+Z — the
  board-1 nominee may not play the double; virtual pair = averaged stats +
  chemistry bonus for mixed styles). Match ends at 3 — no draws exist anymore.
- **Superliga table points**: 3-0/3-1 → 3 pkt, 3-2 → 2 pkt, a fighting 2-3 loss
  → 1 pkt, 0-3/1-3 → 0. Standings, progression charts and forfeits updated.
  Full-season score distribution: ~29% of matches reach the deciding double.
- **Pre-match squad NOMINATION modal**: pick 3 base (A/B/C = selection order) +
  up to 2 reserves before every match you play; form, fatigue, morale and style
  are shown per player. AI clubs auto-nominate (best 3 + bench); auto-play uses
  auto-nomination. Promised reserves are pre-picked into the reserve slots.

### Added — inbox / mailbox (first slice of the DESIGN-ai-world mailbox)
- New **Skrzynka** page + nav badge. Mail is info or a **yes/no DECISION**;
  unanswered decisions **block the next matchday** (and pause auto-play) — the
  ZAGRAJ button routes to the inbox until you decide.
- Generators: in-form reserves ask for a match (YES = promise → he's pre-picked
  in the nomination, kept promise = morale up, broken promise = morale/loyalty
  hit + a resentful mail; NO = morale hit, bigger when he's on fire), expiring
  contract warnings, pre-round fatigue reports.

### Fixed / hardened — EVERY match type is now uncancellable
- Cup rounds, Top 12 Masters, Mundial and Olympics now (a) hold `ui.running`
  for their whole duration (Escape/nav blocked, close buttons removed) and
  (b) run on a **seed persisted before the event starts** — reloading mid-event
  replays the exact same outcome instead of re-rolling it (the league matchday
  already had the atomic-commit guarantee).

### Added — 10x name pools (owner: "names are stale and repetitive")
- New `src/data/names.js` (~72 KB): 450–800 real first/last names per country
  (PL with proper diacritics, DE with umlauts + hyphenated compounds, CN with
  pinyin + real compound/romanization-variant surnames, JP, SE with double
  names, KR — 252 real surnames, 750+ given names). Merged into COUNTRIES with
  dedupe at load; file is optional (guarded) so older checkouts still boot.

### Added — staff depth & regens (owner: "3x the clubs in a league, at least")
- Market floors: 14 coaches + 10 physios + 10 psychologists + 10 scouts + 6 PR
  directors (≥36 candidates guaranteed, ~50 typical). Pool staff now age each
  season, retire at 70, and fresh regen staff top the pools back up.

### Tests
- `tests/protocol.test.js` (6: nomination order, doubles exclusion rule, inbox
  gating, promise settlement, staff regens, seeded-event replay determinism);
  smoke tests rewritten for first-to-3 + Superliga points. Suite **80 green**;
  20-season stress 2.3s/season; academy probe still hard-but-possible (~S20).

## 2026-07-02 (batch 2) — Owner playtest notes: 11 items (bugs, balance, features)

All 11 previous-build notes checked against the current build and addressed
(details + status per item in OPEN-ISSUES.md):

### Fixed (bugs)
- **Ticket exploit**: revenue now peaks at ~50–70 € and collapses at rip-off
  prices (die-hard floor fades to zero at 160 €; steeper demand). Max price
  earned ~€1M/season; now ~6% of the peak.
- **Duplicate/wrong players in market**: root cause fixed in batch 1 (_pid);
  save migration now also REPAIRS already-corrupted saves (reassigns duplicate
  entity ids, keeps the first holder).
- **Awards "leaking" to pre-signed players**: Paletki are league-wide; the gala
  and log now show the winner's CLUB so it can't read as ours.
- **Staff never left**: the expiry sweep excluded the player's club — now
  applies everywhere; negative contract years clamped in migration.
- **Loans**: final-contract-year loan-outs blocked (the player "never came
  back" because his deal expired mid-loan); borrow-IN implemented (AI clubs
  list bench players; WYPOŻYCZ on the market; wage share; auto-return) with
  sell/release/renew guards for borrowed players.
- **Players never reached peak OVR**: flat per-stat cap 84 made high ceilings
  unreachable, and the growth taper starved big-gap talents + the last few
  points. Caps now follow the ceiling; big gaps grow faster; probabilistic
  rounding. With a decent coach/hall, juniors now peak 0–2 under ceiling.

### Balance (owner-directed)
- **Wonderkids halved** (academy trait & gem chance, scout diamond/gem rolls;
  min-of-two peak-band draw). Youth-club probe still "hard but possible".
- **Wage curve softened above OVR 80** (10%/OVR): 87→90 = +€31k (was +€53k);
  still convex.
- **AI bankruptcy fixed**: AI boards enforce wage discipline (payroll ≤62% of
  income). Was 11/12 L2 clubs at €0 by season 4; now 0–1, medians €35–46k.
- **New: talent flows to money** (`aiPoachOutgrownStars`): clubs sell players
  who clearly outgrew their financial level to richer clubs (real fee to the
  seller) — needed because players now actually reach their ceilings, which
  otherwise compressed L1/L2 to ~1 OVR apart. 20-season probe: L1 85 / L2 77.

### Features / UX
- **Top 12 Masters**: manager picks the club's entrant (modal with season
  stats + recommendation); AI entrants by wins → point balance → OVR.
- **Cup auto-plays**: a due round runs before the next league matchday and
  inside auto-play; no per-round button.
- **News feed rebuilt, data-driven**: leader dropping points, real upsets with
  scores/OVRs, 5+ win streaks, standout duels, career milestones (100/250/500
  wins), periodic table check, star injuries, notable AI signings and
  poaching transfers.

### Tests
- `tests/owner-feedback.test.js` (10 regressions). Suite **74 green**; stress
  20-season probe 2.1s/season flat; academy probe target met (~S20).

## 2026-07-02 — Bug-hunt batch: 15 fixes from a full-codebase review

### Fixed (state/persistence)
- **Save/resume corrupted the global ID counter** → duplicate entity IDs. The
  localStorage autosave (`persistGame`) never refreshed `_pid` (only the file
  export did), and `newGame` snapshotted it mid-generation, so resuming rewound
  the counter and new players/staff/juniors reused IDs of existing mid-career
  entities (all by-id lookups are first-match → wrong player in negotiations,
  swaps, sales; re-persisted = permanent). `persistGame` now syncs `_pid`, and
  `loadGameFromText` floors the counter at max(existing id)+1 so old broken
  saves self-heal.
- **Olympics never persisted** — a reload after the tournament replayed it with
  rerolled results (double awards / lost budget bonus).

### Fixed (season engine)
- **AI-club players were aged/developed TWICE per season** in `applyGrowth`
  (the universal loop had no team filter and the dedicated AI loop re-processed
  them) — with the PLAYER's coach/academy bonuses applied to AI youth, doubled
  history snapshots and doubled retirement rolls. Now: bookkeeping for everyone
  in loop 1, development exactly once per player.
- **Cup prizes skipped AI clubs eliminated in AI-vs-AI ties** (`result.loser`
  was only recorded in my-match branches) — silently distorted AI budgets every
  season.
- **`playCupRound` had no round gate** — the dashboard button (also missing the
  `cupPlayedThisSeason` check) could play the ENTIRE cup in one sitting.
- **Top 12 Masters of the other league wiped `_top12Bonus`** earned in ours
  (unconditional else-reset; the flag is already cleared each season start).
- **`buildBudgetEntry` overwrote `prize` with the league-only param**, dropping
  cup + Top 12 premia from the budget log's net.
- **Mundial gold medals went to every senior at the manager's club** instead of
  the actual national-team roster (best 4 of the country across all clubs).
- **Manager-fired path soft-locked the game**: `runMatchday` returned without
  clearing `ui.running`, and `showStartScreen` refuses to render while it's set.
  `handleManagerFired` now resets the running state (and is exported for tests).

### Fixed (lineup & match screen)
- **Lineup order was a no-op**: `simTeamMatch` re-sorted starters by ascending
  OVR, discarding `boardOrder`. Pairing now follows `getMatchStarters` order
  (player's boardOrder; strongest-first for AI — default pairings unchanged).
- **VME showed the wrong player cards** (re-derived starters at render time
  instead of the committed duelists) — cards now resolve from `matchups` ids.
- **VME set dots spoiled all four duel results from duel 1** — dots now reveal
  only after each duel's replay finishes.

### Fixed (market, infra, UI consistency)
- **Own loaned-out players appeared on the transfer market** (fa/transfer and —
  deterministically at 1 contract year — presign). `buildMarket` now excludes
  `loanedOut`.
- **Player infra never mirrored to the team object**: club-strength scoring
  (board objectives) and the team-overview INFRASTRUKTURA panel rated the
  player's club at day-one levels forever; a same-country club move also
  carried the old club's infra along. Now mirrored on upgrade/downgrade/move +
  in save migration; club moves leave built infra at the old club and inherit
  the new club's.
- **Squad starter tab used the FILTERED list's index** for STÓŁ labels and ▲/▼
  arrows (wrong under search/style filters); injured starters shown as outside
  the rotation. Cup page winner marks now compare by id (object identity broke
  after save/load); dashboard/league standings + club season history now sort
  by **pts only, exactly like the engine** (promotion, prizes, TV), so displayed
  positions can no longer contradict actual outcomes on points ties.

### Tests
- `tests/bugfixes.test.js` (8 regression tests). Suite **64 green**; stress
  probes unchanged (30-season memory-flat; academy challenge still "hard but
  possible", L1-quality ~S23).

## 2026-07-01 — Main menu, new-game wizard, deeper squads, relative board goals

### Added
- **Real main menu**: Nowa gra / Wczytaj grę / Wczytaj z pliku / Edytor bazy danych
  (wkrótce) / Wyzwania (wkrótce) / Opcje / Wyjdź — replaces the old scrolling start.
- **Single-screen new-game wizard**: sequential kraj → liga → drużyna → trudność with
  a stepper and Wstecz/Dalej, no long scroll.
- **Provisional default DB**: `newGame` seeds a per-country PRNG for setup, so every
  new game starts with the identical world (teams & players) per country.

### Changed
- Every club starts with **4 starters + 6 reserves** (was 4+2); deep benches pay off
  via the sparring dev bonus.
- **Board objectives** are a relative **league-position** target from squad OVR +
  budget + infrastructure vs rivals (safe = +2, ambitious = −2 places).

### Fixed
- Player profile "Mocna strona: undefined + undefined" (stat-name map after the
  6-attribute rework).

## 2026-07-01 — Realistic 6-attribute player stats

### Changed
- Players now have **6 realistic table-tennis attributes** instead of the abstract 4:
  **Forhend (FH), Bekhend (BH), Serwis (SRV), Return (RET), Praca nóg (FOOT,
  physical), Głowa (MEN, mental)**. OVR = fh.22+bh.20+srv.16+ret.14+foot.14+men.14.
- The match engine keeps its tuned 4-channel rally math but **derives** the channels
  from the 6 stats via `engineStats(p)` (attack = strong wing + exploitable weak
  wing; def = footwork+backhand+return; serve blunted by opponent's return). Match
  balance preserved (L1 ~81 / L2 ~71). Aging by 3 groups: FOOT fades first & fastest,
  technical (FH/BH/SRV/RET) hold, MEN peaks latest. Save migration splits old
  atk/def/srv/men → the 6. Suite **56 green**.


## 2026-06-30 — Full audit: 2 bugfixes + doc cleanup

### Fixed
- **Missing `playerHistory` save migration**: `migrateLoadedGame()` defaulted
  `staffHistory`/`principalPool`/etc. but never `playerHistory`. Loading a save made
  before that field existed would crash (`TypeError`) the next time a player's
  history was snapshotted. Added the missing default in `state.js`.
- **AI academies missed the veteran-coach/YOUTH_DEVELOPER bonus**: `applyGrowth()`
  computed the +10% (coach 60+) / +8% (YOUTH_DEVELOPER trait) academy bonus only
  for the player's club; AI clubs' youth never got it, a silent edge for the human
  player. Now both loops read a shared `academyMultByTeam` map — every club's
  academy follows the same rule.

### Docs
- Fixed stale test counts in `DOCS.md` (52/23 → 54).
- Fixed a leftover "zł" example in `utils.js` comments (code already outputs €).
- Corrected the HANDOFF backlog #12 ticket-pricing note — price→attendance→revenue
  already works in code; the real gap is UI discoverability, not the mechanic.
- Noted the momentum-bar bug referenced in backlog #11 is already fixed (B3).

`npm test` still 54/54 green; `npm run check` clean.

## 2026-07-01 — Tech partnership rework (no rich-get-richer)

### Changed
- Tech partnership no longer hands the prestigious a free stat lead. Every tier gives
  the same **+1-all equipment floor**; only the top tiers add a marginal **+1 ATK/SRV
  for €3–10k/season**. The real value of a higher tier is **marketability (+6…+35%)**
  → more merch & attendance. Prestige still gates brand access; weak clubs get +1 all
  and a small income. `calcTeamMarketability` applies the marketing bonus (player only).

## 2026-07-01 — Lineup ordering + multi-year sponsors

### Added
- **Lineup ordering**: set the board 1–4 order of your starters (`boardOrder`, ▲▼ on
  starter cards); `getMatchStarters` plays your club in that order.
- **Multi-year sponsor contracts**: sign for 1..maxYears (steadier brands up to 3),
  longer term = +6%/season premium. Deals persist across seasons, pay each season the
  goal is met, and count toward the 3-sponsor requirement until they expire.

## 2026-07-01 — Sponsor variety + ticket/merch trade-off

### Changed
- **Sponsor pools ~2–3× larger** (≈45–50 real brands per country, more TT brands) and
  up to **12 offers** per preseason (was 8). Goals scale to club strength (none/win2
  for the weakest). Reward economics unchanged.
- **Ticket price ↔ attendance ↔ merch trade-off** (owner model): cheap tickets pack
  the arena (more fans + more merch) but earn little per head; pricey tickets earn
  more per head but thin the crowd. **Ultras** (~22–30%) always attend. Merch scales
  with arena FILL and swings with results (volatile success). The best price now
  depends on your merch-shop level — big shop → cheap tickets win; small shop →
  moderate pricing. No single optimum. Ticket screen shows live fill%/gate + a
  cheaper/dearer comparison.

## 2026-07-01 — Country-appropriate sponsors

### Changed
- Sponsor offers now draw from the **club's own country** (`COUNTRY_SPONSORS` for
  PL/DE/CN/JP/SE/KR, including each country's real table-tennis brands — Stiga,
  Butterfly/Nittaku, Li-Ning/DHS). A Chinese club no longer advertises Allegro/InPost.
  Reward economics unchanged. `tests/sponsors.test.js` (2) → suite **56 green**.

## 2026-06-30 — Auto-play season + goal-based finances

### Added
- **AUTO-SEZON** (`autoPlaySeason`): a ▶▶ button by the season/round header plays the
  remaining matchdays back-to-back (no animation) and stops for anything that needs
  the manager — injury / <4 healthy starters, a cup/Top12/Mundial/Olympics round, the
  season-end gala, or toggling off (■ STOP). Reuses `runMatchday`, so economy/news/
  standings stay identical to manual play.
- **Finances now show conditional income**: a "PRZYCHÓD Z CELÓW (SPONSORZY + ZARZĄD)"
  card lists every active sponsor + the board objective with their reward, ✓ secured
  vs ~pending (on-track %), and a "secured now / full potential" total.

## 2026-06-30 — Academy playtest round (bug fixes + agreed balance)

### Fixed (bugs from owner playtest)
- **Challenge club was unplayable**: the player's `store.G.infra*` was hardcoded to
  0, so taking Akademia Orłów gave it NO academy (level 0). Now the player inherits
  the chosen club's infrastructure (academy L2 + hall L1 for the youth-only club).
- **Staff hire blocked by salary**: upfront cash to hire = signing bonus + poaching
  buyout only; the salary is an ongoing wage. A near-broke club can hire an
  affordable scout/coach now. (PR directors keep their cost model.)
- **Youth-only clubs can sign scouted juniors** (isYouth) — only adult external
  transfers stay blocked, so academy scouting is finally useful for them.
- **"NOWY KLUB" club-change card** no longer appears during an active season.
- **Budget "live" view** computes the wage breakdown from the current squad/staff
  instead of showing season-end-only zeros mid-season.
- **Match can't be interrupted** by clicking outside the window while it's running.
- **Match-screen colours**: live point score colours the LEADER green / trailing
  side red; completed-set pills are colour-coded from your view (won green / lost
  red), bigger and high-contrast.

### Changed (agreed balance)
- **Rare gems**: even the weakest academy/scout can occasionally find a talent far
  above its band (~5% L1 → ~12% L5; never busts) — odds grow with academy level.
- **Sponsor variety**: ~1/3 of offers ask for nothing (guaranteed, smaller payout);
  weakest tier gets a low, real target (`win2`). No more impossible-goal death spiral.
- **4 starters + 6 reserves**: AI clubs top up to this depth; a deep, quality bench
  gives a **sparring** development bonus (up to ~+18%) to the whole squad.
- Tests → **54 green**.


## 2026-06-30 — Academy system (vertical slice)

> Economy + levels agreed with the owner before coding (4-fork decision); see
> `DESIGN-academy.md` "IMPLEMENTED" for the full agreed numbers.

### Added
- **Academy levels (6, single source of truth).** `INFRA_ACADEMY` in `constants.js`
  now drives everything: intake OVR band, peak/ceiling band, dev bonus, build cost
  and a NEW yearly **upkeep** (€2k→€30k). `gameplay.js` no longer keeps a divergent
  4-level copy — *that copy crashed the game when the academy was upgraded past L3*
  (`INFRA_ACADEMY[4]=undefined`). Same dedup applied to HALL/MED/MERCH.
- **Age-curve development engine** (`applyGrowth`): the owner's age brackets + three
  stat-aging groups — `atk`=physical (matures ~25, fades first & fastest), `srv`=
  technical (holds to ~31), `men`=mental (peaks ~33, slowest), `def`=mixed; so
  veterans keep mental/technical while physical fades. Growth scales by coach × hall
  × academy devBonus × role (**×1.0 first team / ×0.8 bench-academy**) × gap-to-
  ceiling; **~10% bust** plateau short. Same engine now ages AI clubs too.
- **Level-banded intake** (`genYouthPlayer`): junior quality scales with the
  producing academy's level; **1–2 juniors/season** (level = quality, not throughput);
  junior wage €500–1500 with training baked in. Fixed a bug where AI juniors were
  graded by the *player's* academy level.
- **Economy**: academy upkeep charged each season-end (player + AI); **free
  downgrade** on every infra building (no refund) to cut upkeep in a crisis; **youth
  sales** (`sellPlayer`, fee ≈ wage×1.6–3 with youth/ceiling premium) — both selling
  and the existing loans are valid strategies.
- **Mini-tournament** (€10k, 3 candidates, keep 1, quality +0..+4 over baseline) — an
  economically non-obvious gamble. New academy-tab UI; once/season.
- **Tests** `tests/academy.test.js` (8) → suite **52 green**. **Balance probe**
  `node tests/stress.js youth`: a well-managed youth-only club from €5k reaches
  L1-quality (best-4 OVR ~80) around season ~27, solvent — **hard but possible**.


## 2026-06-29 — Prestige rebalance + result-driven merch / ticket guarantee

### Changed
- **Prestige** no longer craters in League 2: floor raised 5 → **25** (no club is
  ever "nobody wants to join"), L2 tier penalty softened −15 → **−8**. Still based on
  RECENT form only (last 5 seasons) — deliberately NOT lifetime trophies, so clubs
  don't all drift to max prestige over time (owner's point).
- **Tickets are now a steadier GUARANTEE** (gentler price→attendance effect; fans
  turn up regardless) — a reliable, set income. The ticket-price screen now shows a
  **predicted season income RANGE** (depends on final table position).
- **Merch is the result-driven UPSIDE**: now scales with league position — a great
  season sells ~3× more merch than a terrible one.
- Tests: `tests/economy.test.js` (2). Suite **44 green**.

## 2026-06-29 — Team Principals (Layer 2 core)

### Added
- **Team Principals** — every AI club has a GM (`team.principal`): a staff-like
  entity with a **strategy** (Inwestor w młodzież / Wynik teraz / Oszczędny /
  Hazardzista / Budowniczy / Wheeler-dealer), a **competence** level, and a full
  lifecycle — generated, ages, retires, and is **fired by the board** after ~2 poor
  seasons, then sits in a free-agent **pool** and can be re-hired. New principals
  generate to keep the pool stocked. The player is their own principal.
- **Compatibility**: a club hires a principal whose strategy FITS its traits (the
  youth-only challenge club draws a youth/builder/frugal GM), with a small chance of
  a contrarian for variety.
- **Effects (conservative for now)**: a competent principal earns the club ~±10%
  more income; youth/builder strategies push more academy intake. Strength still
  tracks budget, so this adds management variety without breaking the economy.
- **Visible** in the team-overview "ZARZADZANIE" card (principal + strategy +
  competence + club traits). Fixed a leftover `zl` budget label there → `€`.
- Migration default `principalPool`; `tests/principal.test.js` (3). Suite **42 green**.
  Verified over 8 seasons: principals churn, pool restocks, leagues stay healthy.

## 2026-06-29 — Layer 2 start: club traits + youth-only challenge club

### Added
- **Club traits** (`team.traits`) — the stable identity layer of Layer 2. First
  trait: **`youthOnly`** (HARD constraint: may only build through the club's own
  academy; no external signings — enforced for the player in `doNegotiate` and for
  AI in `aiSignPlayers`).
- **Challenge club "Akademia Orłów"** (selectable on the start screen, badged
  🏆 KLUB-WYZWANIE): starts near-broke (€5 000), youth-only, with a starter academy.
  It's the weakest in the league (OVR ~60 vs L2 avg ~70) — a real "win League 1 with
  it" challenge. Defined data-driven in `CLUB_IDENTITIES` (constants).
- Start screen shows its true €5k budget + the challenge description.
- Migration default for `team.traits`; tests in `tests/challenge-club.test.js`.
  Suite **39 green**.

### Follow-up
- More original club names across all leagues (owner note); broader club-trait
  roster + Principal entities/lifecycle (rest of Layer 2 — see `DESIGN-ai-world.md`).

## 2026-06-29 — AI earns real income (no more deterministic pyramid)

### Changed
- Replaced the position-swing income shortcut with a **real per-club income model**
  (`aiClubSeasonIncome`): each AI club earns the SAME streams the player does —
  sponsors (with luck/variance), tickets (hall capacity × marketability × position ×
  price), TV, merch (× merch-shop level), prize — minus wages + upkeep. Income now
  depends on what a club BUILDS (squad → marketability, infrastructure), not a fixed
  position rule, so the hierarchy isn't frozen.

### Result (30-season probe, seed 1234)
- **L1 ~82-83, L2 ~71-76** (healthy, no deflation), **120 league changes**, and
  crucially **23 of 24 distinct clubs reached L1** at some point — the economy is
  genuinely alive, not a rigid pyramid of the same 2 clubs.
- New assertion in `tests/league.test.js`: >13 distinct clubs reach L1 over 8
  seasons (anti-pyramid guard). Suite **37 green** (~18s; the multi-season
  integration test dominates).

## 2026-06-29 — AI club finances (living-world Layer 1) — fixes league drift

### Root cause found
- AI clubs earned almost NO income (all streams went to the player), so their
  budgets bled out → they could only sign weak free agents → league strength
  collapsed over seasons (L1 had fallen BELOW L2 in the long-run probe).

### Added
- **`applyAiClubFinances()`** (each season-end): simulated income covering wages +
  upkeep with a position-based swing (1st +, last −), so well-placed clubs grow and
  afford better signings; poor ones shrink toward relegation.
- **`maintainAiRosters()`**: re-couples each AI squad's strength to its current
  budget every season (Layer-1 abstraction — AI clubs are budget-driven backdrops
  until Layer 3 gives them real per-decision signing). Budgets evolve via results,
  so strength follows the money → emergent, league-agnostic.
- **Stress harness fixed** to fire `doPromotionRelegation()` each season (it was
  silently skipping promotion) and to report L1/L2 OVR.

### Result (30-season probe)
- **L1 sustains ~75–79 vs L2 ~64–71** (healthy ~10 gap, no collapse); **120 league
  changes / 30 seasons** (proper churn); budgets stay sane (some L2 clubs broke =
  realistic poverty, sets up bankruptcy). Was: L1 55 < L2 62.
- Tests: `tests/league.test.js` multi-season health test. Suite **37 green**.

### Next (deferred to Layer 2/3 — discuss numbers)
- Strategy profiles + **Team Principals** (fireable, carry strategy); then granular
  AI decisions (sponsors, ticket price, wage-vs-bonus). Then bankruptcy + comebacks.

## 2026-06-29 — Coach → player development (P2, the dynasty tool)

### Added
- **Coach `training` now drives meaningful, CONCAVE player development.** New
  `coachDevMultiplier(training, isYouth)` = `1 + MAX·(training/95)^0.6`, MAX = +120%
  youth / +60% seniors. A 75-training coach gives most of the benefit, 95 only a
  little more (diminishing returns); a weak coach still helps; no coach = base.
  Applied to ALL clubs (player + AI), so good-coach clubs grow their youth.
- **Visible**: the coach hire modal now shows "Rozwój zawodników: młodzież +X%,
  seniorzy +Y%" — the elite coach's real value surfaced at decision time.
- Verified: a 55-OVR youth over 6 seasons reaches 60 (no coach) / 63 (coach 50) /
  64 (coach 75 ≈ 95). Tests: `tests/development.test.js` (4). Suite **36 green**.

### Follow-up flagged (needs playtest + likely fix)
- 15-season headless stress shows **league strength drifts** (L1 fell below L2).
  Heavily confounded by the probe not running the season-finale income flow (so AI
  can't afford to maintain rosters), but it exposes a real gap: **league strength is
  only set at generation, not maintained season-to-season** (relies on AI signing +
  income). See HANDOFF backlog.

## 2026-06-29 — Emergent league strength (budget ↔ OVR coupling)

### Changed
- **League strength is now purely emergent from budget.** Replaced the per-league
  strength tables with ONE league-agnostic function `leagueStrengthTopForBudget`
  that inverts the convex wage curve (~80% of budget over a 7-deep squad). The same
  money buys the same squad in either league — L1 is stronger ONLY because its
  clubs are richer. Country strength flows through budgets, not an OVR boost.
- Result at a new game: **L1 avg OVR ~81, L2 ~71**; richest club 83 / poorest 67;
  weak-L1 79 vs strong-L2 74 (overlap for promotion/relegation churn). Because wages
  are convex, €100k buys more OVR at the bottom than at the top (honest economics).
- Tests: `tests/league.test.js` (3). Suite now **33 green**.

## 2026-06-29 — Amortized signing bonus + main-menu budget fix

### Fixed
- **Main menu showed old budgets** (~24k €) — the start screen had its OWN copy of
  the budget formula that wasn't rescaled. Now EUR (L1 €250–492k, L2 €60–148k),
  matching new games.

### Changed
- **Signing bonus now amortizes into effective annual pay** (owner's model): a 10k
  bonus on a 2-year deal ≈ +5k/year, so a player wanting 35k accepts 30k + a
  10k/2yr bonus. Verified: 35.4k + 14.5k bonus (≈4.8k/yr) closes a 40.2k demand.
  Top stars (OVR ≥ 85) still specifically want an explicit bonus. Same model
  applied to staff. Suite **30 green**.

## 2026-06-29 — Negotiation feel: bonus matters + staff acceptance indicator

### Changed
- **Signing bonus is now a real lever.** It works across a wider salary range
  (gate 0.86→0.78) and a generous bonus adds much more, so it can rescue a
  slightly-low salary: e.g. an 82%-salary offer flips from reject (−6) to accept
  (+4) with a 2.5× bonus. Package (guarantee) weight also raised.

### Added
- **Staff hire modal now shows a LIVE acceptance indicator** (happy/ok/angry +
  reasons), reusing the player negotiation structure via a new `staffNegResponse`.
  The hire decision uses the same scoring, so the indicator matches the outcome;
  a strong bonus rescues a low staff salary too.
- Tests: bonus-rescue (players) + staff indicator. Suite now **30 green**.

## 2026-06-29 — EUR follow-ups (playtest fixes)

### Fixed
- **74 leftover `zł` labels → `€`** (negotiation, staff salary, tech cost, etc.) —
  the first pass only caught some; UI is now fully EUR.
- **Salary slider was hard-capped at 14 000** → now scales with expectation
  (`max = max(60k, exp×3)`), so you can actually make a competitive offer.
- **Board-objective rewards rescaled** to EUR (base 12k/7k → 90k/45k): choices now
  ~€65k / €135k / €261k instead of 8.6k / 18k / 34k.

### Added / changed
- **Staff now negotiate wage + signing bonus + years** (previously only years).
  Lowball wages (< 85% of expectation) are rejected; the chosen wage is applied and
  the bonus charged. `tests/staffneg.test.js`.
- **Signing bonus matters more**: default bonus raised (own 12%→20%, transfer
  22%→35% of salary), bigger max, and a strong bonus now adds more to acceptance and
  can partly offset a slightly-low salary.

Suite now **28 green**. NOTE for the owner: hard-refresh the browser
(Ctrl+Shift+R) and start a New Game to see EUR — a loaded pre-EUR save keeps its old
budgets.

## 2026-06-29 — EUR wages & economy rescale (fixes renewal shock)

### Changed
- **Player & staff wages on realistic EUR curves** (`playerWageForOvr`,
  `staffWageForOvr`) — convex, so 4 superstars is financially impractical.
- **Renewal "shock" fixed**: initial generation, league-strength tuning and
  contract renewals now all price off the SAME curve; re-pricing added when tuning
  raises a player's OVR. Fresh-squad renewal demand dropped from ~2.5-3× to ~1.4×
  avg (the remaining premium is for stars above their league — intended).
- **Economy rescaled to EUR**: starting budgets (L1 €250–492k, L2 €60–148k),
  sponsor rewards (cap €145k/€48k), TV (€55k/€16k), maintenance (€32k/€13k base).
- **Currency shown as €** everywhere (`formatMoney` + hardcoded labels).

### Tests
- `tests/wages.test.js` (3): convex curve, no renewal shock, club affordability.
  Suite now **26 green**. `tests/signing.test.js` offer updated for EUR scale.

### Follow-ups (noted)
- Multi-season solvency: verify by playtest (income applies in the season-finale
  flow, not the headless probe). Free-agent pool floats ~430 players (stable).

## 2026-06-29 — Documentation reorganization

- Added **`DOCS.md`** — master index: quick facts (what's actually shipped),
  per-doc purpose + freshness, reading order, and maintenance debt.
- Added design docs: **`VISION.md`** (4 pillars + Steam/Tauri decision),
  **`DESIGN-economy.md`** (EUR wage curves), **`DESIGN-staff.md`**,
  **`DESIGN-ai-world.md`**; plus running **`HANDOFF.md`** + this changelog.
- Refreshed stale reference docs: GDD Play Styles updated to the 5 real styles;
  freshness banners added to GDD/ARCHITECTURE/BALANCING pointing to the current
  sources; fixed broken absolute-path links in ARCHITECTURE → relative.

## 2026-06-29 — Match-screen fix pass (playtest feedback)

### Fixed
- **B1** — signing a player now fills an empty starter slot instead of always
  benching them (no more fielding only 3 starters).
- **B2** — live-match style note shows readable names ("Napastnik obustronny ma
  przewagę nad Topspin z forhendu") instead of raw ids.
- **B3** — initiative bar now moves during the duel (blends skill momentum + live
  point difference + sets won), instead of being static.
- **Invisible player names** on the duel cards (dark-theme bug: name had no
  explicit colour on the hard-coded light card) — now visible.
- **"White balls"** = completed-set pills with invisible numbers — now readable,
  labelled `S1 11:9`; live score colours home (red) vs away (green).
- **Trait layout shift** — the trait row has a fixed height, so cards with and
  without traits line up.
- **Duplicate club names** under the initiative bar removed.
- **Micro-stats** now appear only after a duel finishes (were the final numbers
  shown from the start, which looked pre-played).

### Tests
- `tests/vme.test.js` (5) + `tests/signing.test.js` (2). Suite now **18 green**.

## 2026-06-29 — 5 real playing styles + in-game guide

### Added
- **Five real table-tennis playing styles** replacing the 4 generic ones:
  `TWO_SIDED` (Napastnik obustronny), `FH_LOOPER` (Topspin z forhendu),
  `BLOCKER` (Kontra i blok), `FISHER` (Obrona z półdystansu), `DEFENDER`
  (Nowoczesny defensor). Defined data-driven in `PLAYER_STYLE_INFO`
  (`constants.js`) — one table feeds both the UI/guide and the match engine.
- **Counter-pentagon**: each style beats 2 and loses to 2 others; the match
  engine reflects it (`STYLE_EDGE` + per-style `engine` params in the rally sim).
- **Guide section** (Przewodnik → "🏓 STYLE GRY"): every style listed with grip,
  description, strengths, weaknesses and who it beats / loses to. Generated from
  the data table so it can't drift out of sync.
- **`styleLabel()`** helper so the UI shows readable names everywhere (cards,
  squad/market lists, filters, player modal) instead of raw ids.
- `tests/styles.test.js` — 5 tests: table consistency, pentagon antisymmetry,
  valid generation, legacy migration, and that the matchup measurably shifts duel
  outcomes. Total suite now **11 tests**.

### Changed
- Player generation, coach synergy (`COACH_STYLES`), `OPPOSITE_STYLE`,
  `effectiveRating` and `describePlayerIdentity` updated to the new style ids.

### Migration
- Legacy saves auto-convert old styles on load: AGRESYWNY→FH_LOOPER,
  WSZECHSTRONNY→TWO_SIDED, CIERPLIWY→DEFENDER, TECHNICZNY→BLOCKER (players and
  coach `styleSynergy`).

### Docs
- `HANDOFF.md` §8 (style design reference) and §9 (full owner backlog captured).

## 2026-06-29 — Foundation: safety net + first cleanup

### Added
- **Git repository** initialised with a baseline commit of the game as received,
  so every later change is reversible.
- **Headless test harness** (`tests/harness.js`): boots the real game in Node
  without a browser, with optional deterministic seeding (`boot(seed)`) so runs
  are reproducible.
- **Automated test suite** (`tests/smoke.test.js`, run via `npm test`): 6 tests
  covering — new-game world is well-formed; single-match engine always returns a
  valid best-of-5; stronger player wins >70%; team match is valid; a full league
  season keeps the table consistent (points = 3·W + D, everyone plays 22 rounds);
  same seed → identical result.
- **`package.json`** with `npm test` and `npm run check` (syntax-check all files).
- **`HANDOFF.md`** — onboarding/continuity doc for future sessions.

### Changed
- Removed duplicate definitions of `rnd`, `clamp`, `sleep` from `gameplay.js`
  (they were byte-identical to the canonical versions in `utils.js`). No
  behaviour change — confirmed by the test suite.

### Known issues (carried forward)
- `randNameForCountry` is defined twice with *different* behaviour
  (`state.js` vs `gameplay.js`) — needs careful unification, not a blind delete.
- Save migration still has no version number (planned).
