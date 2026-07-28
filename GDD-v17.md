# Ping Pong Manager v17 GDD

> **Status:** comprehensive design intent, partially superseded. See `DOCS.md` for
> the doc map. On any conflict, `HANDOFF.md` + `DESIGN-*.md` + `AUDIT-*.md` + **code**
> win. Sections updated to shipped reality are tagged "(UPDATED …)". Play Styles = 5.
> Lags many 2026-07 systems: protocols, 6-stats, inbox, equipment-in-engine, fatigue
> scope, live style counters, expanded traits/staff impact, AI parity, avatars.
> Prefer HANDOFF / CHANGELOG / DOCS / code for “what is live.”

## High Concept
Single-player browser management game about leading a table-tennis club across league play, preseason planning, staff building, youth development, transfers, national-team prestige, and long-term club identity.

## Player Fantasy
The player fantasy is long-horizon club building rather than point-by-point control:
- choose any club in any supported country at career start
- survive the first preseason through sponsor and technical-partnership decisions
- build a squad with styles that counter each other
- create stars, academy graduates, and club legends
- grow from local manager into a coach who receives national-team and club-switch offers

## Core Loop
1. Start a new career, resume a save, or load a custom database.
2. Choose country and club.
3. Complete mandatory preseason:
   - sign 3 sponsors
   - choose a technical partner
   - review board objective
   - set ticket pricing
   - make first squad and staff calls
4. Play league matchdays and side competitions.
5. Between rounds:
   - negotiate contracts
   - scout talent
   - sign, loan, release, or pre-sign targets
   - monitor one unified national transfer market containing players, coaches, physios, psychologists, scouts, and PR directors
   - filter that market by role and search across all Polish clubs plus free agents
   - upgrade club infrastructure
6. Reach season end:
   - resolve board objective and sponsor outcomes
   - collect awards, TV money, and financial recap
   - watch the post-season gala
   - evaluate club-switch offers
7. Begin the next preseason and continue building club history.

## Runtime Settings
The live client now includes a lightweight settings layer outside the career save:
- light and dark UI theme
- adjustable match simulation speed
- AI difficulty presets: `easy`, `normal`, `hard`, `legend`

Design intent:
- keep accessibility and presentation choices outside the club save
- make difficulty a visible player decision
- allow balancing passes without rewriting the full meta layer every time

## World Structure

### Countries
Current world setup supports multiple national ecosystems with their own leagues, name pools, and budget scaling.

### Domestic Pyramid
- I Liga
- II Liga
- 12 clubs in each division
- 22 league matchdays
- promotion and relegation between divisions

### Competitions (verified against the code, 2026-07-28)
- Domestic league — 22 matchdays, two divisions, promotion and relegation
- Domestic cup with real clubs and amateur entries; a due round plays itself
  before the next league matchday
- Top 12 Masters, offered before the last league round, separately for I Liga
  and II Liga

That is the complete list. Mundial and the Olympics were designed but never
became reachable — their flags were set as a season ended and cleared again
before the phase returned to "in season", so no button ever appeared. The code
was removed on 2026-07-28. Do not reintroduce them without designing the
calendar slot they would actually occupy.

There is no national-team path. Manager prestige feeds club offers and the
board's patience, nothing else.

## Club Identity Layer
Each club now has a richer identity package:
- generated club logo with a unique SVG symbol (flame, wings, crown, paw, lightning, rocket, phoenix, or paddle) chosen deterministically per club
- 6 distinct background shape styles (concentric rings, shield, hexagon, diamond, cross, crosshair circle)
- deterministic color palette (6 palettes)
- nickname matching the symbol theme (Smoki, Orły, Lwy, Wilki, Sztorm, Rakiety, Feniksy, Tygrysy)
- motto
- club history log
- visible staff, squad, infrastructure, and finances in club overviews

This identity appears in:
- start screen club selection
- club page
- team overview modal
- history page
- post-season gala

## Team Building Systems

### Player Model
Each player has:
- `ATK`
- `DEF`
- `SRV`
- `MEN`
- age
- peak age
- role
- salary
- contract length
- loyalty
- fatigue
- morale
- hidden seasonal form
- marketability

### Staff Model
Each staff member is now treated like a proper market entity instead of a hidden modifier.

Every coach, physio, psychologist, scout, and PR director has:
- generated profile and avatar
- biography
- club tenure history
- season history snapshots
- contract state, salary, and club ownership
- market status: free now or available from next season when contracted elsewhere

Design intent:
- support staff should feel alive, not abstract
- all clubs should build real organizations, not only player rosters
- transfer decisions should include both roster quality and backroom quality
- play style
- traits
- club history
- awards
- season and career statistics

### Play Styles  (UPDATED 2026-06-29 — now 5 real table-tennis styles)
Five real styles, data-driven from `PLAYER_STYLE_INFO` in `constants.js` (single
source of truth for both the engine and the in-game guide):
- `TWO_SIDED` — Napastnik obustronny (balanced modern attacker, the meta)
- `FH_LOOPER` — Topspin z forhendu (forehand power, risky)
- `BLOCKER` — Kontra i blok (close-table counter, low error)
- `FISHER` — Obrona z półdystansu (mid-distance lob defence)
- `DEFENDER` — Nowoczesny defensor (chop + counterattack)

Counter relationship is a **pentagon**: each style beats 2 others and loses to 2
(see `STYLE_EDGE` in `gameplay.js`, `beats`/`losesTo` in the data table). Styles
affect duel outcomes (rally aggression, serve, opponent-error pressure) and are
explained to the player in the guide (Przewodnik → STYLE GRY). Legacy saves migrate
old ids → new (AGRESYWNY→FH_LOOPER, WSZECHSTRONNY→TWO_SIDED, CIERPLIWY→DEFENDER,
TECHNICZNY→BLOCKER). Full design in `DESIGN-staff.md`; tests in `tests/styles.test.js`.

### Traits
Traits create asymmetry in ceilings, decline curves, psychology, volatility, and specialist strengths.

Current live addition:
- `AMBITNY`
  - some strong players reject low-level projects outright
  - acts as a realism brake against easy superstar stacking in weak leagues

### Seasonal Form
Seasonal form is a hidden stat layer that influences:
- match output
- contract expectations
- scouting attractiveness
- marketability

It is communicated indirectly through reports and performance, not exposed as a raw permanent stat.

### Marketability
Every player has their own marketability score, driven by:
- OVR
- wins
- trophies
- loyalty
- age profile
- season form

Marketability contributes to:
- club commercial strength
- tickets
- merchandising
- club prestige when true stars emerge

## Staff Systems

### Staff Types
- coach
- scout
- physio
- psychologist
- PR director

### Staff Rules
- normal staff use contracts and annual wages
- rival staff can be poached from other clubs
- scout contracts are annual, not one-time purchases
- PR director affects commercial output and sponsor convenience, not direct prestige gain
- coaches, physios, psychologists, scouts, and PR directors all exist on a living market with club affiliation and contract length
- free staff can join immediately
- staff who still have an active contract can only be signed for the next season on the final year of that contract
- PR director is no longer a static fixed list only for the player; she is generated as a market role and can also work for AI clubs

### Staff Impact Areas
- tactics
- player growth
- morale
- fatigue handling
- injury reduction and recovery
- scouting quality and accuracy
- minor commercial multipliers
- style synergy between coach and player profile
- coach-trait bonuses and penalties that make fit matter beyond raw OVR

## Generation Principles

### Players
New players are generated from a profile-first model rather than a flat rating template.

Core inputs:
- age
- projected peak age
- trait roll
- one stronger signature stat
- one weaker stat
- resulting play style inferred from profile and then optionally overridden by traits

Design intent:
- similar OVR players should still feel different
- age should shape both readiness and upside
- signings should be readable as archetypes, not only numbers

### Youth Players
Youth players reuse the same identity logic, but with:
- lower current readiness
- stronger ceiling variance
- academy-specific context such as region and readiness note

### Staff
Staff are generated per role archetype:
- coaches roll tactical/training/motivation/synergy values plus style package and coach traits
- scouts roll accuracy, network, and specialty
- physios roll injury reduction, recovery, and prevention
- psychologists roll morale boost, mental training, and pressure handling
- PR directors roll commercial bonus and sponsor convenience values

Design intent:
- staff quality should be role-specific
- elite staff should be expensive and recognizably different from average hires
- support staff should behave like part of roster construction, not background modifiers

## Preseason
Preseason happens immediately after club selection and after each completed season.

### Hard Requirements Before Season Start
- 3 active sponsors
- 1 technical partnership

### Preseason Decisions
- sponsor signing
- technical partnership selection
- board objective preview
- ticket price setup
- squad trimming and contract talks
- staff and scout planning
- academy preparation
- pre-contracting players and staff for the next season when they are still under contract elsewhere

## Transfer And Contract Rules

### Player Market
- free agents can be signed immediately
- players under contract can be negotiated only for the next season
- if a contracted target is bought from another club, the fee is committed now but the player joins after season rollover
- expiring contracts remain dangerous because AI clubs can approach those players for next year

### Staff And PR Market
- the transfer market page now also surfaces staff and PR opportunities
- free specialists join instantly
- contracted specialists and PR directors can only be agreed for the next season
- club and market views clearly communicate whether a signing is immediate or delayed

## AI Club Logic

### Squad Planning
- AI now fills real roster gaps before making luxury moves
- AI evaluates starter count, total roster size, and weakest positions before acting
- AI prefers affordable free agents for short-term fixes and future signings only when they materially improve the project

### Financial Discipline
- AI keeps a league-dependent cash reserve before signing
- payroll pressure matters for both player and staff recruitment
- AI can replace expired staff with free hires and selectively queue future poaches only when the budget supports it

### Staff And PR Decisions
- AI clubs start with more credible organizational structures
- AI can hire missing coaches, medical staff, psychologists, scouts, and PR directors
- AI can lose staff to contract expiry, sending them back onto the market and keeping the world more dynamic

## Board Objectives And Reputation

### Board Objective Logic
Board objectives are generated from:
- team OVR
- league level
- competitive context

Examples:
- Top 2
- Top 4
- Top 6
- minimum wins

### Consequences
- success gives money and reputation
- failure hurts manager prestige

### Manager Reputation
Manager prestige now drives:
- quality of club-switch offers after the season
- prestige framing in history
- access to stronger projects and national-team recognition
- offers can now point to clubs from different countries and from both league tiers, not only local same-save options

## Sponsor System

### Sponsor Goal Generation
Goals are assigned based on the team's OVR rank within the league at the time of offer generation:
- Top 25% of league by OVR: hard goals (top2, top3, win14+)
- Top 50%: medium goals (top3, top4, win8–12)
- Top 75%: accessible goals (top4, top6, win6–8)
- Bottom 25%: easy goals (top6, top8, win4–6)

This prevents weak teams from receiving unachievable sponsor targets.

### Reward Linearity
Sponsor rewards are proportional to goal difficulty (`goalDiff` multiplier). Rewards are rounded to the nearest 500 PLN. A harder goal always pays more than an easier goal for the same sponsor — no inversions.

Difficulty multipliers:
- `win4`: 0.6 · `win6`: 0.85 · `win8/top6`: 1.0 · `win10`: 1.3 · `top4`: 1.5 · `win12`: 1.7 · `win14/top3`: 2.0–2.1 · `top2/win16`: 2.4–2.6

## Economy

### Revenue Streams
- tickets
- merchandising
- sponsor payouts
- league prizes
- TV rights
- board rewards
- technical partnership effects
- selected special events

### Costs
- player wages
- staff wages
- PR wage
- transfer fees
- signing bonuses
- staff poaching costs
- infrastructure upgrades
- brand and partnership commitments
- maintenance

### Financial Tracking
Budget view supports:
- current season live summary
- archived season-by-season breakdown
- selection of previous financial years
- separate wage categories for players, coach, physio, psychologist, scout, and PR director
- a simplified projected end-of-season budget based on fixed costs only
- a separate balancing reference document for formulas and tuning values: `BALANCING-v17.md`

### Planned Finance Expansion
The current finance layer is still intentionally simpler than the sporting layer and should become deeper in later versions.

Recommended next finance steps:
- clearer split between fixed and variable cash flow
- stronger payroll pressure for elite squads
- more demanding contract curves for stars and top staff
- better long-horizon planning tools around next-season commitments
- more meaningful sponsor and board interactions beyond single payout checks
- tradeoffs that make building a super-team materially harder

Design intent:
- the player should not reach a top roster too cheaply or too early
- finances should regularly force choices between stars, depth, staff, and infrastructure
- economic management should become a core challenge, not only a support layer

## Status Update After v17 Baseline
Parts of the planned `v18` management depth are already live in the current codebase.

Implemented or significantly expanded:
- technical partnerships fully replaced the old standalone equipment-purchase layer and now offer more tiers plus stat-specific bonuses
- infrastructure depth now reaches higher caps across hall, medical, academy, and merchandising
- academy UI is richer and scouting is fully embedded into the youth workflow
- academy now presents a direct candidate list instead of a separate recruitment modal step
- academy intake is capped at `1` club-generated junior per season, under age `20`, with ceiling quality tied to academy infrastructure
- scouts now return exactly `1` junior-only prospect under age `20` every `10` rounds, with ceiling quality tied probabilistically to scout OVR and specialty
- player profiles now expose a fuller modifier breakdown, including technical partner, coach, morale, form, stamina, fatigue, and other effective-rating inputs
- AI clubs are better at balancing roster size, future signings, infrastructure pressure, and value/upside targeting
- player negotiations now include role guarantees, clearer contract-profile framing, and live negotiation feedback
- budget and market UI now surface next-season commitments and recent negotiation outcomes
- coach history, staff history, and hall-of-records deduplication are now tracked more reliably
- staff and PR pre-sign rules are now aligned with player logic: only the final contract year is eligible for a next-season agreement

Still open:
- full agent-personality depth with broader promise systems and renewal drama
- deeper board personalities and club-philosophy consequences
- full staff-personality and chemistry model
- the season-story systems planned for Phase 2 and beyond

## Roadmap

This roadmap is ordered by implementation value, dependency, and risk.

The intention is:
- first improve depth in systems already present
- then add medium-complexity management layers
- only later expand into larger structural features

### Priority Rules
- `P1`: high impact, low-to-medium implementation risk, should come first
- `P2`: strong value, but depends on P1 stability
- `P3`: larger or more experimental systems, best after the core loop is mature

## Phase 1: Core Management Depth

### `P1.1` Contract And Negotiation Expansion
Goal:
- make negotiations feel more human and less binary

Status:
- partially implemented

Scope:
- agent personalities
- club promises
- role guarantees
- loyalty-based discounts and stubbornness
- better renewal pressure before expiry

Why first:
- directly improves one of the most visible management loops
- builds on systems that already exist

Dependency:
- current market and contract rules already in place

### `P1.2` Staff Depth Upgrade
Goal:
- make staff feel like a long-term management layer rather than simple stat boosts

Status:
- partially implemented

Scope:
- staff personalities
- staff development or decline paths
- chemistry with club identity and player archetypes
- clearer differences between average and elite staff

Why first:
- the staff market already exists and only needs deeper gameplay consequence

### `P1.3` Finance Depth Upgrade
Goal:
- make budget management as important as roster management

Status:
- partially implemented

Scope:
- stronger payroll pressure
- more meaningful fixed-vs-variable cost structure
- harder elite squad assembly
- better forecasting and next-season planning
- stronger links between board expectations, wage load, and commercial growth

Why first:
- the current economy is readable, but still too forgiving for rapid top-team construction
- this touches transfers, staff, academy, and infrastructure at the same time

### `P1.4` Board And Club Identity Layer
Goal:
- make clubs feel structurally different

Status:
- partially implemented

Scope:
- board personalities
- club philosophies
- expectations based on club identity, not only OVR
- more meaningful manager reputation consequences

Why first:
- complements current board objective system without requiring a rewrite of the app structure

### `P1.5` AI Stability Pass
Goal:
- make AI clubs more believable and more stable over multiple seasons

Status:
- partially implemented

Scope:
- smarter squad planning
- stronger salary discipline
- better long-term renewals
- less random roster drift
- smarter staff retention

Why first:
- every deeper management system becomes better if the rest of the league behaves credibly

## Phase 2: Season Texture And Emergent Stories

### `P2.1` Player Happiness And Complaints
Goal:
- create consequences for squad management choices

Scope:
- unhappiness from bench role
- morale drops from broken promises
- transfer requests
- public dissatisfaction events

Why now:
- works best once contract and board logic are deeper

### `P2.2` Training And Development Plans
Goal:
- give the player more control over long-term growth

Scope:
- player-specific training focus
- risk/reward intensity
- temporary form boosts
- injury risk trade-offs

Why now:
- follows naturally after staff depth and player identity improvements

### `P2.3` PR Campaigns And Media Layer
Goal:
- turn PR into an active seasonal tool, not only a passive modifier

Scope:
- sponsor/media events
- seasonal PR campaigns
- fan sentiment shifts
- hype generation around stars and tournaments

Why now:
- PR director system is already present and ready for a richer interaction layer

### `P2.4` Injury History And Medical Depth
Goal:
- make the medical layer matter over multiple seasons

Scope:
- recurring injuries
- player fragility profiles
- rehab quality
- long-term decline after major injuries

Why now:
- gives more strategic meaning to physio hiring and squad depth

## Phase 3: Structural Expansion

### `P3.1` Youth Pipeline Expansion
Goal:
- make academy development a pillar equal to transfers

Status:
- partially implemented

Scope:
- yearly academy classes with stronger identity
- regional scouting links to academy intake
- prospect tracking over multiple years
- youth tournaments or youth reports

Why later:
- high value, but benefits most after contract, training, and morale systems are richer

### `P3.2` Database And Modding Expansion
Goal:
- make the game easier to extend with external content

Scope:
- richer custom database support
- more robust import schema
- better fallback validation
- modular competition and club definitions

Why later:
- stronger once the gameplay model is more stable

### `P3.3` Competition Expansion
Goal:
- increase long-term career variety

Scope:
- more international events
- multi-stage club tournaments
- richer cup seeding logic
- more seasonal calendar variety

Why later:
- event complexity grows fast and should come after core club management is mature

### `P3.4` Multi-Season Sponsor And Commercial Layer
Goal:
- evolve the economy from short-cycle seasonal deals into a larger commercial game

Scope:
- multi-year sponsor contracts
- sponsor negotiation rounds
- sponsor categories
- fanbase growth affecting deal quality

Why later:
- needs a stable PR/media/fan framework first

## Recommended Implementation Order

If development continues sequentially, the recommended order is:

1. `P1.1` Contract And Negotiation Expansion
2. `P1.5` AI Stability Pass
3. `P1.2` Staff Depth Upgrade
4. `P1.3` Finance Depth Upgrade
5. `P2.1` Player Happiness And Complaints
6. `P2.2` Training And Development Plans
7. `P2.3` PR Campaigns And Media Layer
8. `P2.4` Injury History And Medical Depth
9. `P3.1` Youth Pipeline Expansion
10. `P3.2` Database And Modding Expansion
11. `P3.3` Competition Expansion
12. `P3.4` Multi-Season Sponsor And Commercial Layer

## Release Framing Suggestion

Suggested version framing:
- `v18`: negotiations, AI, staff depth
- `v19`: player happiness, training, PR/media
- `v20`: youth expansion, competition expansion, stronger external database support

This keeps each release coherent:
- one release focused on smarter management logic
- one release focused on season storytelling
- one release focused on scale and replayability

## Infrastructure

### Hall
- affects capacity and matchday income

### Medical Center
- reduces injury downtime
- current top cap is `-50%` recovery time

### Academy
- improves youth quality
- generates 1 club prospect per season
- allows accepting at most 1 club prospect per season
- academy intake is available from squad management
- academy players can be loaned out directly for development
- youth growth can be amplified by the right coach profile

### Academy Scouting
- academy scouts are managed inside `Skład > Akademia`
- each mission lasts `10` rounds
- each mission returns exactly `1` junior under age `20`
- scout OVR does not set ceiling directly, but heavily changes the odds of finding a higher-peak prospect

## Matchday And Event Flow

### Event Scheduling
- the player does not manually choose whether to play a special event or a league round
- when Top 12 is scheduled it replaces the normal next-step button in the season flow
- domestic cup is part of the season cadence rather than a side button

### Live Match Presentation
- match center shows point-by-point progression instead of revealing full set results in advance
- momentum is presented as a soft initiative hint, not as a spoiler of the final set outcome
- set history appears only after a set is actually completed

## League Presentation

### Table And Rankings
- league table displays points won and points lost instead of set totals
- player rankings focus on points won and points lost
- team rankings focus on total points won and total points lost
- clickable names should always lead to a unified player profile

## Records And History

### Historical Views
- player OVR history stores current effective OVR and is displayed with bounded charts
- staff and coach OVR history is tracked season by season
- club history, manager history, coach history, and trophy leaders are accessible from history and Hall of Fame pages
- Hall of Fame records include individual peaks plus most-titled clubs and players
- a dedicated News page archives headlines and supports filtering by season and news type

## Transfer And Staff Markets

### Staff Market
- scouts use the same core hiring logic as other staff
- hired scouts are visible in the owned-staff flow immediately after signing
- staff and scout poaching can use candidates from Polish clubs in the active save

### Player Movement
- more free agents are generated over time to keep the market alive
- club-switch offers are evaluated after the season and can be accepted into the next project

## Visual Generation

### Avatars
- avatar generation includes a wider hairstyle set and more variation than earlier versions
- visuals follow nationality pools so European leagues skew white and Asian leagues skew Asian by default
- avatars now include more facial-detail and equipment variation such as headbands, freckles, nose/jaw variants, and broader color palettes

### Club Logos
- club logos use a wider set of badge shapes, symbols, palette families, and pattern overlays
- logos include stronger club initials and more distinctive silhouettes so clubs are easier to tell apart at a glance

## Zmiany w tej wersji
- Top 12 Masters moved to the pre-final-round window and now runs separately for I Liga and II Liga.
- Qualification for Top 12 uses one best player per club based on individual season wins, with OVR as tiebreak.
- League UI now centers on points won and points lost instead of set totals.
- Budget tracking is broken into detailed wage categories instead of one combined salary line.
- Scouts can be hired correctly, appear in owned-scout lists, and use a broader Polish-club market.
- Academy intake supports a seasonal prospect class, one in-season academy signing, and direct youth loans.
- Player OVR history charts and staff OVR history have been expanded and stabilized.
- Special events replace the next season action instead of appearing as optional side buttons.
- Hall of Fame and records now expose stronger historical comparisons for clubs, players, and coaches.
- Added a separate News tab with season/type filtering and deeper archive retention.
- Expanded avatar and logo generation for stronger visual identity and readability.
- Match simulation now uses a much wider favorite-vs-underdog curve, so true legends almost never lose to clear weaklings.
- Free-agent supply is deeper at game start and between seasons, with a larger mix of ready-made signings and long-term projects.
- Player profiles now expose stronger identity text and trophy cabinets, the transfer market has shortlist/compare tools, and the dashboard includes a project pulse card for form, sponsor pressure, and board mood.
- Club overview now includes a lightweight biography layer with best-season framing, project leader callout, and rivalry detection from historical results.
- Technical partnerships were expanded and now fully replace the old equipment-brand purchase flow.
- Infrastructure caps were extended, academy UI was upgraded, and youth scouting now produces exactly 1 under-20 prospect per mission with scout-dependent peak OVR odds.
- Contract talks now expose role guarantees, clearer agent expectations, next-season commitment tracking, and richer transfer/staff market planning UI.

## Co zostało do zrobienia / pomysły
- Unify every remaining player-name reference so every occurrence opens exactly the same full profile modal.
- Expand historical trophy attribution for clubs even further, especially for legacy saves with incomplete award data.
- Add richer coach-trait UI explanation so the user can clearly see fit bonuses and anti-fit penalties before hiring.
- Deepen staff market filtering and sorting the same way the player market already works.
- Add dedicated history/ranking views for physios, psychologists, and scouts, not only coaches.
- Continue broadening regional name pools and avatar micro-variation beyond hair and skin.
- Add club-level biography pages with explicit rivalries, iconic seasons, and supporter culture callouts.
- Add filters/sorting parity to staff and scout markets similar to the player market UX.

### Fan Zone / Merchandising
- scales by percentage from current club and player marketability

## Transfer And Contract Systems

### Player Contracts
- one formal offer per round per target
- not globally locked across all negotiations
- salary, years, and signing bonus are negotiated
- signing bonus has meaningful impact: offering 2.5× expected bonus gives a strong positive signal; offering below 50% expected creates a negative one; the slider range extends to 3× expected to allow real persuasion
- expiring players can be pre-signed with one year remaining
- contract expectations now include a smooth prestige tax based on league quality instead of hard OVR transfer walls
- league quality is measured from the average OVR of the top 4 players on each club in that division
- elite players remain signable, but can become economically absurd for weak clubs
- players who project as club top-3 talent push for a `starter` role
- morale pressure now matters after signing:
  - missing 3 straight matches as a starter causes a heavy morale drop
  - extremely low morale can force contract termination with severance paid by the club

### Staff Contracts
- use the same target-based round logic
- support poaching from other clubs

### Loans
- negotiated with other clubs
- receiving club can reject
- interest is contextual
- wage share matters
- anti-exploit rules block obvious infinite-profit loops

## Scouting

### Scouts
- use contracts and annual wages
- have specialties
- can be hired like other staff via staff negotiation modal
- after hiring, scouts become part of the academy workflow rather than a separate management pillar
- all active scouting is now managed from `Skład > Akademia`

### Reports
Scouting reports can include:
- style
- form hint
- ceiling hint
- confidence
- regional context
- only unsigned juniors remain in scout reports; once a junior joins the club, that report disappears

### Academy Scouting Flow
- each scout mission costs club money up front
- a mission lasts `10` league rounds
- the scout searches one selected Polish region
- mission outcome depends on scout OVR quality odds rather than raw volume
- every mission returns exactly `1` junior
- low-OVR scouts can still find a gem, but the probability is much lower
- top scouts still do not increase raw volume, but they heavily improve peak-OVR quality odds
- scouted targets are junior-only academy prospects, not a mixed senior market
- the design goal is to make scouting an investment and planning layer, not a free click loop

## Youth Academy
- academy level changes prospect quality
- youth classes include region and upside flavor
- one selected academy pull can be promoted in-season
- youth exist as a distinct roster layer before senior transition
- academy management should exist only in the squad section, not as duplicated preseason or side-page content
- hired scouts feed the academy directly
- academy plus scouting should form one shared pipeline:
  - club pull from infrastructure
  - regional search from staff quality
  - signing into youth roster
  - promotion to reserves or loan development

## Match Presentation

### Current Match-Center Goals
- slower pacing
- clearer duel presentation
- better set readability

### Current Match-Center Outputs
- set-by-set results
- microstats per duel
- points
- aces
- winners
- errors
- longest rally
- clutch moments

### Persistent Match Wear
- fatigue is now written back after official matches instead of disappearing between rounds
- active players gain fatigue based on match load and stamina
- benched players recover fatigue between matches
- the squad screen therefore reflects real accumulated workload across the season

### Removed Element
The old flying-ball animation was removed because it reduced readability and did not communicate useful information.

## History, Legacy, And Meta Progression

### Player History
- awards
- club history
- season and career stats
- hall-of-fame relevance

### Club History
- season placements
- points
- budget snapshot
- team OVR snapshot
- visible identity layer with logos and flavor

### Manager History
- season-by-season timeline
- board target context
- prestige tracking
- future-club offer context

### Coach History
- records club, age, role style, and coach strength over time

### Hall Of Fame
- all-time ranking layer
- records and legacy framing for standout careers

## UX And Presentation Goals
- clear start flow
- obvious preseason gatekeeping
- stronger club identity at first glance
- faster filtering in squad and market
- readable season history and career context
- generated round avatars for players and staff with broader facial-detail variation, expanded hairstyle pool, headbands/glasses/freckles, and nationality-appropriate skin tones
- cleaner post-season celebration and transition
- a dedicated news archive with filtering by season and message type

## Technical Shape
- static browser app
- no build step
- split architecture:
  - `index.html`
  - `styles/main.css`
  - `src/data/constants.js`
  - `src/core/state.js`
  - `src/core/gameplay.js`
  - `src/ui/shell.js`
  - `src/ui/pages.js`
  - `src/main.js`

## Current Content Summary
The current playable game already includes:
- multi-country league ecosystem with nationality-aware avatar skin tones
- preseason sponsorship loop with OVR-relative goal assignment and linear rewards
- technical partnerships with expanded tiers that replace the old equipment-buying layer
- transfer market and loans
- staff market with functional scout hiring and academy mission dispatch
- youth academy
- deeper next-season commitment planning in budget and market views
- budget history
- detailed wage breakdown
- point-based league tables and rankings
- hall of fame
- dedicated news archive with filtering
- post-season gala
- manager reputation and club offers
- generated round avatars with expanded facial/accessory variation
- generated club logos with expanded symbol and badge variety
- expanded club and manager history views
- meaningful signing bonus slider in player negotiations
- role-guarantee negotiations with next-season commitment visibility
- league-relative prestige tax for stars instead of hard quality walls
- `AMBITNY` players who can reject weak projects outright
- fatigue, stamina, and injured-starter lock before official matches
- persistent post-match fatigue gain and bench recovery
- unified staff and player market for Poland with future-season poaching for contracted people
- academy-integrated scouting missions with paid 10-round searches
- junior scouting results capped at exactly 1 player per mission, with quality driven more directly by scout level
- academy UI refresh and wider infrastructure caps
- player-card modifier breakdown for staff, morale, form, stamina, fatigue, and partnership effects
- interactive preseason board-goal selection with `Bezpieczny`, `Oczekiwany`, and `Ambitny` risk levels
- ambitious board failure can immediately end the manager run
- global post-season club offers across countries and league tiers
- separate seasonal awards driven by league-only average point differential and league-only defensive efficiency, with a 75% appearance threshold
- broader tournament payout structure beyond champion-only rewards
- AI academy growth path with junior intake and infrastructure improvement pressure
- save export with readable filenames based on club and season context
- a separate balancing reference should live in `BALANCING-v17.md`

## Next Recommended Milestones
1. Deeper post-season awards layer with more categories and gala presentation polish.
2. Club biography expansion: real rivalry surfacing, iconic seasons, and long-term fan culture details.
3. Full staff-market UX parity phase 2: richer comparisons, stronger filters/sorting, and deeper staffing recommendations.
4. Optional authored database packs with validation and import feedback UI.
5. Season-to-season analytics pages for trend lines in finances, player development, stamina load, and club identity.

## Milestone Status Update

### P1.3 Economy And Difficulty
- implemented in current playable form:
  - smooth prestige tax tied to league strength
  - higher wage pressure for elite players
  - stronger realism friction for weak-club superstar builds

### P2.1 Morale And Usage Pressure
- implemented in current playable form:
  - starter expectations for top club talent
  - morale punishment for repeated benching
  - forced exits with severance when morale collapses

### Board Layer
- implemented in current playable form:
  - preseason board target choice instead of one automatic goal
  - explicit safe / expected / ambitious risk-reward structure
  - ambitious failure can lead to dismissal
