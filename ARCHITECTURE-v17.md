# Ping Pong Manager v17 Architecture Guide

> **Status:** mostly valid file/system map; some section detail lags. As of
> 2026-07-11 late: `tests/` harness + **~108 tests** (`npm test`), stress probes;
> equipment-aware `engineStats`, style-edge on live sim, trait/staff match hooks,
> AI injury/hall/youth parity. Prefer `DOCS.md` / `HANDOFF.md` / code for “what’s
> live.” Save longevity: `pruneCareerData()` (HoF 20, prune retired, strip old
> match detail).

## Purpose
This document complements:
- `GDD-v17.md`
- `BALANCING-v17.md`

Its role is practical and technical:
- explain how the project is split into files
- show where key systems live
- describe how game state flows through the app
- help the next developer understand how to safely extend the game

If someone reads all three documents together, they should understand:
- what the game is
- how the numbers are tuned
- where to implement the next feature

## Project Layout

Main folder:
- `index.html`
- `src/`
- `styles/`
- `GDD-v17.md`
- `BALANCING-v17.md`
- `ARCHITECTURE-v17.md`

### Root Files

#### `index.html`
Entry point for the browser build.

Responsibilities:
- loads the app shell
- loads CSS
- loads JavaScript modules in the expected order
- provides the DOM mount points used by the UI

This project is still a browser-first app without a bundler-heavy framework. That means the loading order matters.

#### `styles/main.css`
Main presentation layer.

Responsibilities:
- global theme
- layout system
- cards, buttons, tabs, tables, modals
- responsive behavior
- visual identity of the current v17 UI

When adding a new screen, it is usually better to reuse existing utility classes and card patterns first before adding new CSS.

## Source Tree

### `src/main.js`
High-level bootstrap and app wiring.

Typical responsibilities:
- initialize the app
- connect globally exposed modules
- start first render
- attach top-level event handlers if needed
- export saves to JSON files with readable generated filenames

Think of this file as the startup coordinator.

### `src/core/state.js`
Central state access layer.

Responsibilities:
- holds the main `store.G` game object
- holds UI state in `ui`
- save/load from local storage
- migration of older save formats into current v17 format
- new game creation handoff

This is the closest thing the project has to a state store.

Important structures:
- `store.G`
  The entire game state.
- `ui`
  Transient UI state like current page, filters, selected tabs, compare slots, etc.

Recent save fields worth knowing:
- `boardObjectiveOptions`
- `boardObjective`
- `seasonFinance`
- `negotiationHistory`
- per-player `starterBenchStreak`
- per-player `lastPlayedMatchday`
- per-player league-only point and appearance counters for awards

Important functions:
- `getGame()`
- `setGame()`
- `persistGame()`
- `loadGameFromText()`
- `loadPersistedGame()`
- `migrateLoadedGame()`
- `createNewGame()`

Important migration mindset:
- new fields should be introduced as if old saves definitely exist
- defaults should be added for every new array/object/scalar that gameplay reads directly
- if a feature changes semantics, migration should normalize legacy shapes instead of assuming UI code can handle both

### `src/core/gameplay.js`
Main gameplay and simulation brain.

This is the biggest and most important file in the project.

Responsibilities:
- economy formulas
- player generation
- staff generation
- PR generation
- scouting
- transfer market
- contract negotiations
- AI club logic
- match simulation
- injuries, growth, morale, fatigue
- season transitions
- historical records
- cups, Top 12, Olympics, Mundial
- helper functions used by UI pages

Important note:
- staff and PR now follow a player-like lifecycle here: generation, contracts, history, market exposure, delayed signings, and modal data all live primarily in this file
- academy scouting also lives here: mission costs, mission duration, junior generation, report cleanup, and club-side signing effects
- board-goal generation, prestige-tax wage pressure, morale bench penalties, severance exits, and season-award formulas also live here

If a feature changes rules, balance, world simulation, negotiation behavior, AI decisions, or season flow, it probably belongs here.

### `src/core/gameplay.visuals.js`
Visual identity helper layer extracted from the old monolith.

Responsibilities:
- avatar generation
- club branding generation
- team logo generation

Use this file when changing:
- avatar variety
- visual identity logic for clubs
- deterministic SVG branding output

### `src/core/gameplay.club-ui.js`
Club overview helper layer extracted from the old monolith.

Responsibilities:
- club season history helper
- club history recording
- team overview modal rendering

Use this file when changing:
- team overview modal content
- how club history is shown
- club-level presentation that is still driven from gameplay data

### `src/data/constants.js`
Static data and content definitions.

Responsibilities:
- countries
- names
- league club name pools
- sponsor pools
- trait definitions
- coach style data
- equipment/tech partnership data
- infrastructure definitions
- world metadata

Put things here when they are:
- static
- configuration-like
- reused in multiple systems
- not save-specific

Do not put active logic here unless it is very small and obviously data-adjacent.

### `src/ui/pages.js`
Screen rendering layer.

Responsibilities:
- builds HTML for each major tab/page
- reads state from gameplay/state layer
- attaches action buttons that call gameplay functions
- renders dashboards, market, squad, staff, budget, history, etc.

Important note:
- `pageMarket()` is the single browsing surface for players and all staff roles
- `pageStaff()` should only render staff already employed by the player club
- `pageSquad()` now owns academy management, academy scouting, and scout reports
- legacy `ui.page === 'scout'` should immediately redirect to `pageSquad()` with `ui.squadTab === 'youth'`

This file is page-oriented rather than component-oriented.

Key design principle:
- `pages.js` should mostly decide how to display state
- `gameplay.js` should mostly decide how the rules work
- preseason is a good example:
  - `gameplay.js` builds board-goal choices and enforces start-season rules
  - `pages.js` renders the safe / expected / ambitious cards and the blocked-start messaging

### `src/ui/shell.js`
Application shell and navigation wrapper.

Responsibilities typically include:
- top-level layout
- navigation chrome
- header updates
- shell mode switching
- app container behavior

If the whole app frame changes, check here first.

### `src/core/utils.js`
Shared helper utilities.

Use this file when a utility is:
- generic
- repeated
- not strongly tied to one gameplay subsystem

## How The App Is Organized Conceptually

The game follows a simple layered model:

1. `constants.js`
   Static data definitions.
2. `state.js`
   Persistent game state and UI state.
3. `gameplay.js`
   Rules, simulation, mutations, world logic.
4. `pages.js`
   Rendering of the current state into HTML.
5. `shell.js` / `main.js`
   App shell and bootstrap.

This is not a strict framework architecture, but it is the mental model that fits the codebase best.

## The Main Game Object

The heart of the app is `store.G`.

It contains, among other things:
- `teams`
- `players`
- `staff`
- `staffPool`
- `scoutPool`
- `prDirector`
- `prDirectorPool`
- `transferMarket`
- `preSignedPlayers`
- `pendingStaffSignings`
- `results`
- `seasonHistory`
- `budgetLog`
- `newsFeed`
- `records`
- `sponsors`
- `boardObjective`
- `seasonFinance`
- `academyProspects`
- `scoutMissions`
- `scoutResults`
- `marketShortlist`
- `boardObjectiveOptions`
- `clubOffers`
- `managerHistory`

Per-player state now also matters more than before:
- persistent fatigue between matches
- league-only stat buckets for awards and records
- starter usage tracking for morale penalties

### Why this matters
Most features are easiest to build if you answer two questions first:

1. What new data must be stored in `store.G`?
2. Which existing season or UI flows must now read or update that data?

## Core Runtime Flow

### New Career
Flow:
1. player selects country and club
2. `newGame()` builds teams, players, staff pools, PR market, and schedules
3. initial sponsors/objectives/market are generated
4. UI goes to preseason

### During Play
Typical loop:
1. UI page reads state
2. player clicks an action
3. a gameplay function mutates `store.G`
4. `render()` refreshes the screen
5. `persistGame()` saves progress

Important practical note:
- most mutations in this project are immediate and synchronous
- there is no central reducer or command bus
- because of that, forgetting one of `render()`, `updateHeader()`, or `persistGame()` is a very common source of bugs

### End Of Season
Major responsibilities:
- apply growth/aging
- reduce contracts
- resolve expiring contracts
- process pre-signed players
- process delayed staff/PR signings
- generate new free agents
- refresh pools
- let AI rebalance squads and organizations
- reset seasonal counters
- move game back into preseason

This is the single most sensitive part of the codebase because many systems converge there.

## Important Systems And Where They Live

### 1. Players
Main file:
- `src/core/gameplay.js`

Important functions:
- `genPlayer()`
- `genYouthPlayer()`
- `contractExpect()`
- `negResponse()`
- `applyGrowth()`
- `openNegotiate()`
- `doNegotiate()`

Use these when:
- adding new player stats
- changing contract behavior
- changing progression/decline
- extending transfer logic

### 2. Staff
Main file:
- `src/core/gameplay.js`

Important functions:
- `genStaff()`
- `staffOvr()`
- `staffSalary()`
- `openStaffNeg()`
- `doHireStaff()`
- `fireStaff()`

UI entry points:
- `pageStaff()`

Important current rule:
- staff management and staff market are intentionally split
- owned staff live in the staff page
- recruitable staff live in the unified market page
- external staff pre-signs should follow player-like logic: only the last contract year is eligible for a next-season agreement

### 3. Academy And Scouting
Main files:
- `src/core/gameplay.js`
- `src/ui/pages.js`

Important functions:
- `genYouthPlayer()`
- `pullYouth()`
- `signAcademyProspect()`
- `genScoutPlayer()`
- `sendScout()`
- `checkScoutReturns()`
- `clearScoutResult()`

UI ownership:
- academy roster and academy actions: `pageSquad()` with `ui.squadTab === 'youth'`
- scout missions and reports should stay inside academy UX rather than a separate dedicated page

Current architectural rule:
- scouting is not a standalone gameplay pillar anymore
- it is part of the academy pipeline
- if you extend scouting, the first question should be whether the change belongs in academy UX rather than a separate page

### 4. Save Export And Import
Main files:
- `src/main.js`
- `src/core/state.js`

Responsibilities:
- `main.js` handles file export naming and browser download behavior
- `state.js` handles loading, migration, and local persistence

Current save naming:
- exports use club name, season, matchday, and phase in the filename
- this improves usability without changing the JSON schema itself

### 5. PR Director
Main file:
- `src/core/gameplay.js`

Important functions:
- `genPRDirector()`
- `getPRDirector()`
- `getPRDirectorMarket()`
- `getRivalPRDirectors()`
- `calcTeamMarketability()`
- `hirePRDirector()`

UI entry points:
- `pageClub()`
- `pageMarket()`

This role now behaves like a true market entity rather than a static upgrade.

### 6. Transfer Market
Main files:
- `src/core/gameplay.js`
- `src/ui/pages.js`

Important functions:
- `buildMarket()`
- `toggleMarketShortlist()`
- `toggleMarketCompare()`
- `openNegotiate()`
- `doNegotiate()`
- `pageMarket()`

Current rule split:
- free agents can join now
- contracted players join next season
- contracted staff/PR also join next season

### 7. AI Clubs
Main file:
- `src/core/gameplay.js`

Important functions:
- `aiSignPlayers()`
- helper functions around payroll and budget reserves
- offseason resolution in `endSeason()`

If AI looks irrational, the fix usually belongs here, not in UI.

### 8. Match Simulation
Main file:
- `src/core/gameplay.js`

Important functions:
- `simIndividual()`
- `simTeamMatch()`
- `simCupMatch()`
- `effectiveRating()`
- `tryInjuries()`
- `tickInjuries()`

When changing gameplay feel, start here and then update balancing docs.

### 9. Competitions And Events
Main file:
- `src/core/gameplay.js`

Examples:
- domestic league scheduling
- cup logic
- Top 12 Masters
- Olympics
- Mundial

These systems are event-driven and mostly hang off season progression.

### 10. Finance
Main file:
- `src/core/gameplay.js`

UI:
- `pageBudget()`

Important functions:
- `totalWages()`
- `totalWageBreakdown()`
- `calcTVRights()`
- `getMerchIncome()`
- `buildBudgetEntry()`
- `ensureSeasonFinance()`

Whenever money changes hands, the ideal implementation updates:
- team budget
- `seasonFinance`
- any relevant news/log feedback

## UI Navigation Structure

Current page rendering is centralized in `renderApp()` in `pages.js`.

The main tabs/pages include:
- dashboard
- preseason
- squad
- staff
- club
- budget
- sponsors
- league
- cup
- market
- scout
- news
- history
- hall of fame
- mundial

To add a new page:
1. create `pageX()` in `pages.js`
2. add it to `renderApp()`
3. expose navigation through shell/nav
4. make sure relevant gameplay functions exist

Before adding a page, sanity-check whether the feature should instead live inside an existing page tab.
This project now deliberately groups:
- market behavior in `pageMarket()`
- academy behavior in `pageSquad()`
- employed staff in `pageStaff()`

That grouping reduces duplication and conflicting controls.

## Save Compatibility And Migration

### Where it happens
- `src/core/state.js`
- `migrateLoadedGame()`

### Why it matters
This project evolves quickly and old saves often miss newly introduced fields.

When adding a feature that stores new fields, always add fallback migration logic for:
- missing arrays
- missing objects
- missing scalar defaults
- legacy formats that changed shape

Example categories already handled:
- staff metadata
- player metadata
- finance tracking
- negotiation logs
- PR structure migration
- stamina and ceiling fields
- academy prospect metadata
- scouting-related arrays and market helpers

Rule of thumb:
- if old saves could break without the field, migrate it

## Recommended Development Pattern

When adding a new feature, use this order:

1. Define the gameplay rule.
2. Decide what state must be stored.
3. Add migration defaults in `state.js`.
4. Implement the logic in `gameplay.js`.
5. Expose it in `pages.js`.
6. Update `GDD-v17.md`.
7. Update `BALANCING-v17.md` if numbers or formulas changed.
8. Update this file if the architecture or ownership of systems changed.

## Safe Extension Areas

These are relatively safe to expand:
- new sponsor/event types
- new player traits
- new staff archetypes
- new country data
- new UI summaries and reports
- more history and analytics
- more competition layers

These require extra care:
- `endSeason()`
- `applyGrowth()`
- `aiSignPlayers()`
- transfer/contract timing
- budget accounting
- save migration
- academy scouting mission resolution
- any feature that moves controls from one page to another without removing old entry points

## Good Places For Future Features

### Short-Term Feature Ideas
- agent personalities for negotiations
- board personalities and club philosophies
- injuries with long-term medical history
- player promises and role complaints
- training plans per player
- PR campaigns and media events
- staff chemistry or internal conflicts

### Mid-Term Structural Improvements
- split `gameplay.js` into subsystems:
  - `economy.js`
  - `market.js`
  - `ai.js`
  - `matches.js`
  - `season.js`
  - `staff.js`
- `academy.js`
- move repeated HTML card builders into smaller UI helpers
- introduce a clearer event log layer instead of direct toasts/news in many places

### Long-Term Evolution
- database-driven leagues and competitions
- mod support / custom content packs
- deeper youth pipeline
- multi-year sponsor negotiation
- club facilities affecting more than one subsystem
- more international ecosystem depth

## Suggested Refactor Direction

The current codebase works, but the biggest long-term technical pressure point is file size.

The most valuable future refactor would be:
- keep `state.js` as the central state/migration layer
- split `gameplay.js` by domain
- keep `pages.js` page-oriented but extract reusable render helpers

Recommended split order:
1. market + negotiations
2. staff + scouting + PR
3. academy + youth development
4. season transition + AI
5. match simulation

That order gives the best maintainability gain without rewriting the whole project at once.

## Practical Guide For The Next Developer

If you want to add a feature safely, use this checklist:

1. Find the player-facing home of the feature first.
   Example:
   - academy feature -> `pageSquad()`
   - market feature -> `pageMarket()`
   - owned-staff feature -> `pageStaff()`

2. Identify the authoritative state field in `store.G`.
   Example:
   - temporary list
   - season counter
   - ownership link
   - historical log

3. Add migration before relying on the new field.

4. Implement gameplay mutation functions.

5. Only then wire buttons and rendering.

6. Update all three docs when needed:
   - `GDD-v17.md` for design intent
   - `BALANCING-v17.md` for formulas and thresholds
   - `ARCHITECTURE-v17.md` for file ownership or flow changes

### Common Mistakes To Avoid
- duplicating the same control on two different pages
- mutating budget without updating `seasonFinance`
- adding new save fields without migration
- mixing UI-only filters into persistent game state
- implementing a rule in `pages.js` instead of `gameplay.js`
- leaving signed or expired entities visible in market/report lists

### Good First Places To Read
If someone new joins the project, the fastest useful reading order is:
1. `DOCS.md` then `HANDOFF.md` (the doc map + current state)
2. [index.html](index.html)
3. [src/main.js](src/main.js)
4. [src/core/state.js](src/core/state.js)
5. [src/ui/pages.js](src/ui/pages.js)
6. [src/core/gameplay.js](src/core/gameplay.js) (and its tests in `tests/`)

That order gives a better mental map than starting in the middle of gameplay code.

## Final Mental Model

If you are extending this game, think about it like this:

- `GDD-v17.md` tells you what the game should feel like
- `BALANCING-v17.md` tells you how the numbers are meant to behave
- `ARCHITECTURE-v17.md` tells you where to build the next thing

And inside the code:
- `state.js` stores the world
- `gameplay.js` changes the world
- `pages.js` shows the world
- `constants.js` defines the static content of the world

That is the simplest correct map of the project.
