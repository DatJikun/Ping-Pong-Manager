# Ping Pong Manager v17 Balancing Reference

> **Status:** original v17 formulas — PARTIALLY SUPERSEDED / partly **WRONG**.
> - Wages/economy → **`DESIGN-economy.md`** + code (`playerWageForOvr`).
> - Play styles → `PLAYER_STYLE_INFO.engine` in `constants.js` + `DESIGN-staff.md`.
> - **Match flow (§0.4):** live path is point-by-point (`simulateRallyPoint` →
>   `simIndividual`). `duelWinProbability` / `matchupProfileSwing` are unused
>   leftovers — do not rebalance them. **`STYLE_EDGE` is applied** on the live
>   path (modest home-relative lift); equal-stat counters ~57–65%.
> - **Fatigue:** only the two clubs in a fixture settle load/rest.
> - **Equipment:** mods flow through `engineStats` via adjusted stats.
> - **Traits / staff (2026-07-11):** see CHANGELOG + `tests/traits-staff-ai.test.js`.
> On conflict: DESIGN-*/HANDOFF/AUDIT + **code** win. See `DOCS.md`.

## Purpose
This document is a balancing and tuning reference for the current simulation layer.
It complements `GDD-v17.md` by focusing on formulas, thresholds, curves, and practical design intent.

## 0. Match Readiness

### 0.0 Live Tuning Layer
Current runtime settings now include:
- UI theme: `light` or `dark`
- match simulation speed: `slow`, `normal`, `fast`
- AI difficulty: `easy`, `normal`, `hard`, `legend`

Design intent:
- let us tune presentation separately from save data
- allow balance iteration without forking the whole career model
- expose difficulty as a real game layer instead of an implicit assumption

### 0.1 Injured Starter Lock
Functions:
- `runMatchday()`
- `playCupRound()`

Rules:
- if the human club does not have `4` healthy starters, the match cannot be started
- this includes both injured starters and simply incomplete active lineup setup
- the player must manually rebuild the starting four before league or cup play
- this prevents hidden auto-replacement of injured starters for the human club

Design intent:
- lineup management should matter
- injuries should create meaningful rotation pressure instead of being silently bypassed

### 0.4 Current Match Simulation Flow
Main functions:
- `simTeamMatch()`
- `simIndividual()`
- `simulateSetScore()`
- `buildSetTimeline()`
- `renderVME()`

Current structure:
- one team match is `4` singles matchups
- each singles matchup is now played to `3` won sets
- set scores are generated point-by-point only through probability sampling, then visualized in the live VME timeline
- final team score is the number of individual singles won, for example `3:1` or `2:2`

Current player-strength inputs in `simIndividual()`:
- effective rating from `effectiveRating(player, coach)`
- fatigue penalty
- morale modifier
- mentality bonus
- hidden season-form bonus
- style matchup edge from `getStyleEdge()`
- profile swing from `matchupProfileSwing()`
- moderate random noise

Current flow inside a singles matchup:
1. Compute `ho` and `ao` for both players from the modifiers above.
2. Convert the difference into base duel odds with `duelWinProbability()`.
3. Apply extra trait corrections like `AGGR_SERVE`, `TACTICIAN`, and `COMEBACK_KID`.
4. For each set, clamp the set win chance with a floor/ceiling based on elite gap.
5. Simulate raw points until one side wins the set by two points.
6. Repeat until one player wins `3` sets.

Current anti-stomp changes:
- style edge is compressed compared to older versions
- profile swing is compressed
- fatigue penalty is softer than before
- upset floors in duel and set logic are higher, so underdogs steal sets more often
- shorter singles reduce the amount of time favorites get to compound their edge

Important current consequences:
- favorites still matter, but sweeps should happen less often
- strong stylistic counters are visible, but less binary than before
- one weak starter can swing the whole team result because there are only `4` singles
- randomness exists as a deliberate spoiler against perfect dominance

If you want to rebalance one-sidedness later, the biggest levers are:
- reduce the number of stacked bonuses before duel probability is calculated
- compress style-edge impact
- reduce profile-swing impact
- soften fatigue penalty
- make set-level variance larger
- shorten singles from `4` won sets to a shorter structure

### 0.2 Stamina
Functions:
- `derivePlayerStamina()`
- `playerStamina()`

Rules:
- each player now has a hidden simulation stat `stamina` on a `28-99` scale
- stamina is derived from mentality, age, and traits
- `IRON_STAMINA` gives a major boost
- low stamina increases fatigue growth and injury risk

Design intent:
- separate endurance from pure match quality
- allow some players to handle long runs while others need regular rest even if their OVR is strong

### 0.3 Fatigue Curve
Functions:
- `simTeamMatch()`
- `simIndividual()`
- `seasonFormImpact()`

Rules:
- fatigue grows for all official team matches, including cup games
- players who play receive roughly `8-18` fatigue depending on stamina and coaching intensity
- players who rest recover roughly `8-19` fatigue depending on stamina
- fatigue now impacts form and duel strength much more aggressively than before

Design intent:
- a full-season starter should realistically need `1-2` rest games
- low-stamina players may require rotation even after only a few appearances
- recovery planning should become a real squad-management layer rather than cosmetic noise

## 1. Economy

### 1.1 TV Rights
Function: `calcTVRights()`

Rules:
- I Liga base: `30000`
- II Liga base: `9000`
- Position factor: `max(0.4, 1 - (pos - 1) * 0.05)`
- Final payout: `round(base * posFactor)`

Design intent:
- Strong reward for climbing the table.
- Bottom clubs still receive a floor payout rather than collapsing to zero.

### 1.2 Merchandising
Function: `getMerchIncome()`

Rules:
- Reads infrastructure ratio from `INFRA_MERCH[level].income`
- Uses `calcTeamMarketability(myTeamId)`
- PR director adds `pr.bonus`
- Final formula: `round(teamMarketability * 220 * (ratio + prBoost))`

Design intent:
- Merch should scale from both club fame and infrastructure.
- PR is a multiplier helper, not a primary source of prestige.

### 1.3 Maintenance
Function: `calcLeagueMaint()`

Rules:
- I Liga base: `2500`
- II Liga base: `1500`
- Seasonal increase: `season * 500`
- Final formula: `base + season * 500`

Design intent:
- Slow inflation over time.
- Higher-league operating pressure without making survival impossible.

### 1.4 Wage Breakdown
Functions:
- `totalWages()`
- `totalWageBreakdown()`

Tracked categories:
- players
- coach
- physio
- psychologist
- scouts
- PR director
- loan savings

Design intent:
- Budget should reveal where money is actually spent.
- Loaning out players should matter financially.
- PR director wage now comes from the generated market candidate currently employed by the club, not a static tier list.

### 1.5 Unified Transfer Market
Functions:
- `buildMarket()`
- `getAllExternalStaffMarket()`

Rules:
- player entries still come from transfer status and contract logic
- staff entries now include coaches, physios, psychologists, scouts, and PR directors from all Polish clubs plus free agents
- free agents can join immediately
- contracted external people can only be signed for next season

Design intent:
- one coherent browsing flow instead of fragmented hiring screens
- make support-staff spending compete directly with squad spending
- keep the whole domestic ecosystem visible to the player

## 2. Marketability

### 2.1 Team Marketability
Function: `calcTeamMarketability(teamId)`

Inputs:
- average current OVR of squad
- top 4 player marketability average
- prestige proxy

Formula:
- `round(prestigeBoost * 0.48 + avgOvr * 0.24 + starPower * 0.28)`

Design intent:
- Club fame is driven mostly by prestige, but star players and roster strength matter.

### 2.2 Player Marketability
Function: `calcPlayerMarketability(p)`

Current logic summary:
- derived from current OVR
- seasonal and career wins
- trophies
- loyalty
- age profile
- season form

Design intent:
- Star players should drive club economy beyond raw performance.

### 2.3 Free-Agent Supply
Functions:
- `newGame()`
- `endSeason()`
- `aiSignPlayers()`

Current pool targets:
- new save free agents: `32`
- offseason new free agents: `14`
- the top segment of new-save free agents receives a modest quality/form bump so the market includes instant help

Design intent:
- The market should stay alive after early signings.
- There should be both bench depth and a few genuine opportunities every season.
- Expired AI staff and PR directors should recycle back onto the market instead of disappearing from the ecosystem.

Current quality cap:
- immediately available free agents should not spawn as instant world-beaters
- free-agent pool is now capped at roughly `80-85 OVR`
- the market should offer help and upside, but not hand out effortless title favorites on day one

### 2.4 Club Identity UX
Functions:
- `openTeamOverview(tid)`

Current intent:
- best season in history should be surfaced immediately
- the strongest current player acts as a visible face of the project
- rivalry is derived from repeated historical meetings and close scorelines

Design intent:
- club pages should feel informative, not like sterile stat dumps
- the player should quickly understand who a club is and who it clashes with

## 3. Board Objectives And Sponsor Difficulty

### 3.1 Goal Multipliers
Function: `goalDiff(goal)`

Current multipliers:
- `top2: 2.4`
- `top3: 2.0`
- `top4: 1.5`
- `top6: 1.0`
- `top8: 0.7`
- `win4: 0.6`
- `win6: 0.85`
- `win8: 1.0`
- `win10: 1.3`
- `win12: 1.7`
- `win14: 2.1`
- `win16: 2.6`

### 3.2 Board Objective Generation
Function: `generateBoardObjective(teamId)`

Current OVR thresholds:
- `87+ -> top2`
- `81+ -> top3`
- `75+ -> top4`
- `69+ -> top6`
- `62+ -> win10`
- below `62 -> win8`

Reward formula:
- I Liga: `round(12000 * goalDiff(goal))`
- II Liga: `round(7000 * goalDiff(goal))`

Design intent:
- Board goals scale from real roster power, not random flavor.
- II Liga goals stay meaningful but lower-stakes economically.

### 3.3 Sponsor Offer Tuning
Generation notes:
- reward difficulty is linear through `goalDiff`
- sponsor tiers scale around prestige and league context
- harder goals always pay more for the same sponsor context

Design intent:
- Avoid “bad reward inversion” where harder goals accidentally pay less.

## 4. Contracts And Transfer Valuation

### 4.1 Player Market Value
Function: `playerMarketValue(p)`

Formula:
- base: `ovrBase(p) * 240`
- age curve:
  - `<24 -> 1.18`
  - `24-28 -> 1.08`
  - `29-32 -> 1.00`
  - `33+ -> 0.86`
- form curve: `1 + seasonFormImpact / 40`
- trait curve:
  - `WUNDERKIND -> 1.18`
  - `VETERAN -> 0.94`
  - otherwise `1`

Final:
- `round(ovrBase * 240 * ageCurve * formCurve * traitCurve)`

### 4.2 Contract Expectations
Function: `contractExpect(p)`

Salary formula:
- base core: `((ovrBase - 28) * 115 + 700)`
- loyalty mod:
  - `7+ -> 0.88`
  - `4-6 -> 0.95`
  - low loyalty -> `1.05`
- age mod:
  - `<22 -> 1.06`
  - `22-29 -> 1.00`
  - `30-33 -> 0.93`
  - `34+ -> 0.86`
- role mod:
  - `starter -> 1.06`
  - `rotation -> 1.00`
  - lower role -> `0.95`
- form mod: `(1 + form / 70)`

Final salary:
- `max(500, round(base * loyaltyMod * ageMod * formMod * roleMod))`

Expected years:
- `<24 -> 3`
- `<29 -> 2`, plus `+1` when loyalty `>=6`
- `<33 -> 2`
- older -> `1`
- clamped to `1..4`

Signing bonus:
- current-club renewal: `salary * 0.12`
- outside signing: `salary * 0.22`
- multiplied by positive-form factor: `(1 + max(0, form) / 30)`
- bonus is intentionally smaller than before so it supports the offer instead of replacing annual salary

### 4.3 Negotiation Response
Function: `negResponse(p, sal, yrs, bonus)`

Scoring model:
- salary ratio vs expected salary
- bonus ratio vs expected signing bonus
- total guaranteed contract value vs expected full package
- offered years vs expected years
- morale
- loyalty on renewals
- hot form bonus

Outcome:
- `score >= 4 -> accept`
- `score >= 1 -> neutral / continue`
- else reject

Design intent:
- Bonus matters, but cannot buy multiple cheap seasons by itself.
- Renewals are easier for loyal, happy players.
- Active contracts override immediacy: only free agents can join instantly; contracted players convert into next-season agreements.

### 4.4 Signing Bonus Weight
Functions:
- `contractExpect(p)`
- `negResponse(p, sal, yrs, bonus)`

Rules:
- signing bonus is still secondary to annual salary
- bonus matters more once salary is at least near acceptable range
- very strong bonus can now improve a borderline package more noticeably
- very weak bonus can now hurt a proposal more clearly

Design intent:
- bonus should not replace salary
- bonus should still be a meaningful negotiation lever instead of cosmetic noise

## 5. Staff Economy

### 5.1 Staff Salary Curve
Function: `staffSalary(ovr)`

Current piecewise curve:
- `<=30 -> 1000`
- `31-50 -> 1000 .. 2600`
- `51-75 -> 2600 .. 7600`
- `76-95 -> 7600 .. 14500`

Design intent:
- Strong late-game acceleration so top staff are expensive.

### 5.2 Staff OVR
Function:
- `staffOvr(s)`

Added role:
- `pr`

PR director approximation:
- `round(bonus * 900 + cooldownReduce * 8 + ageMod)`

Design intent:
- PR should price and rank like a real specialist rather than a binary upgrade token.

### 5.3 Staff Market Timing
Functions:
- `openStaffNeg(sid)`
- `doHireStaff(sid)`
- `endSeason()`

Rules:
- free staff and free PR can join immediately
- contracted staff and contracted PR can only be signed for the next season
- poach fee proxy remains `salary * (0.8 + years * 0.4)`

Design intent:
- match player-contract logic and stop mid-season instant stealing from feeling gamey
- preserve a meaningful cash sink for advance agreements

### 5.4 PR Director Generation
Functions:
- `genPRDirector(teamId)`
- `finalizePRDirector(pr)`

Current generated ranges:
- bonus: roughly `2.0%` to `7.0%`
- sponsor cooldown reduction: `0..2`
- salary: roughly `1900..8500`
- upfront cost: `salary * (1.5 + level * 0.35)` with floor `4500`

Design intent:
- PR director should sit between utility support staff and premium commercial specialist
- generated variance keeps market scouting meaningful

### 5.5 Staff Generation
Function:
- `genStaff(type)`

Rules:
- coach generation rolls style package, role-specific stats, and optional coach traits
- scout generation rolls specialty, accuracy, and network
- physio generation rolls injury reduction, recovery, and prevention
- psychologist generation rolls morale boost, mental training, and pressure handling
- generated salary is tied to effective role OVR, not only arbitrary tier

Design intent:
- role identity should matter at generation time
- staff market should provide real fit decisions, not just price sorting

## 6. AI Roster And Finance Logic

### 6.1 Budget Reserve
Functions:
- `teamPayroll(teamId)`
- `aiBudgetReserve(team)`
- `aiAffordableCash(team)`

Rules:
- I Liga reserve baseline: `7000`
- II Liga reserve baseline: `3500`
- extra buffer: `22%` of current payroll

Design intent:
- AI should stop zeroing its balance on one splash move
- richer clubs still spend, but from a safer baseline

### 6.2 AI Recruitment Priorities
Function:
- `aiSignPlayers()`

Current logic summary:
- fill immediate roster shortages from free agents first
- target roster size:
  - I Liga: `7`
  - II Liga: `6`
- future-sign a contracted player only if budget remains healthy and the target clearly upgrades the weakest starter or depth chart
- replace missing staff roles before luxury additions
- fill missing PR only when the club has room above its reserve buffer

Design intent:
- make AI look coherent rather than random
- keep weaker clubs functional and stronger clubs opportunistic without becoming reckless

### 6.3 Staff OVR Calculation (addendum)
Function: `staffOvr(s)`

Base averages:
- coach: average of `tactics`, `training`, `motivation`, `synergy`
- scout: average of `accuracy`, `network`
- physio: average of `injReduction`, `recovery`, `prevention`
- psychologist: average of `moraleBoost`, `mentalTraining`, `pressure`

Age modifier:
- before peak: up to `+4`
- after peak+2: down to `-12`
- clamped final range: `10..99`

### 6.4 Scout Pricing
Current notes:
- scouts get salary multiplier vs normal staff
- scout cost scales harder than before
- poaching cost adds contract-based fee when taken from another club

Design intent:
- elite scouts should no longer be cheap exploits.

## 7. Coach Fit, Synergy, And Traits

### 7.1 Effective Rating
Function: `effectiveRating(p, coach)`

Components:
- base player `ovr(p)`
- focus bonus from coach style focus and player stat
- synergy bonus if player style matches coach synergy style
- anti-fit penalty if player style is the opposite of coach synergy
- morale contribution from coach motivation
- elite player bonus for high-end OVR

Key tuning:
- synergy bonus: `round(coach.synergy / 8)`
- anti-fit penalty: `round(coach.synergy / 12)`
- `TACTIC_GURU`: `+2` focus bonus on fit
- `MORALE_MONSTER`: `+1` morale rating contribution
- `DISCIPLINARIAN`: `+2` for `CIERPLIWY`, `-2` for `AGRESYWNY`

Design intent:
- Coach fit should matter enough to create real roster-building dilemmas.
- Wrong-fit lineups should feel playable, but clearly suboptimal.

### 7.2 Youth Growth Interaction
Function: `applyGrowth()`

Youth multiplier:
- veteran coach seasonal academy bonus: `1.1`
- `YOUTH_DEVELOPER`: additional `+0.08`

Design intent:
- Academy-focused coaches should create a clear long-horizon strategy.

## 8. Player Generation And Progression

### 8.1 Base Player Generation
Function: `genPlayer(teamId, forceAge)`

Structure:
- age range normally `16..33`
- peak age `31..37`
- 0 to 2 traits
- stat base from age-vs-peak curve
- one boosted signature stat
- one weaker stat
- style inferred from strongest stat, then traits may override

Salary seed:
- `max(500, floor((avgStats - 30) * 100 + 600))`

Identity layer:
- every player gets a profile tag and note describing strongest and weakest area
- this identity is surfaced in the player modal, not only hidden in raw numbers

Design intent:
- Two players with similar OVR should still feel different in use.
- The user should be able to read strengths and weaknesses quickly.
- age, traits, and stat shape should create both finished seniors and development projects

### 8.2 Youth Generation
Function: `genYouthPlayer()`

Rules:
- academy level changes potential bonus
- generated at age `16`
- lowered current stats, higher upside
- `contractYears = 3`
- `isYouth = true`
- academy ceiling:
  - minimum `58`
  - maximum `95`
  - based on current OVR + random upside + academy bonus + `WUNDERKIND` push

### 8.3 Seasonal Growth
Function: `applyGrowth()`

High-level rules:
- youth grow fastest
- starters grow more than reserves
- decline begins after peak + 1
- `LONGEVITY` softens decline
- `WUNDERKIND` improves growth early
- training hall and coach training improve player growth for player club

Design intent:
- Youth development should be a real strategy, not just flavor.
- Starters improve through usage, but academy paths remain viable.

## 9. Match Simulation

### 9.1 Duel Simulation
Function: `simIndividual(ph, pa, hCoach, aCoach)`

Core inputs:
- `effectiveRating`
- profile-vs-profile stat swing
- fatigue penalties
- morale modifiers
- mentality bonus
- season form
- style counter edge
- controlled randomness

Key pieces:
- fatigue penalty weight: `fatigue * 0.08`, then scaled again in duel score
- morale modifier: `((morale - 50) / 200) * 6`
- MEN bonus: `(men / 100) * 6`
- randomness: `(Math.random() - 0.5) * 6`
- profile swing reads attack vs defense, serve pressure, defensive read, mentality battle, and offensive specialty edge

Set win chance:
- derived from a logistic curve instead of a flat `0.62 / 0.38` split
- then modified by traits and clamped with dynamic upset floors
- elite-gap floor bands:
  - `22+ -> 0.02`
  - `16+ -> 0.03`
  - `12+ -> 0.05`
  - smaller gaps -> `0.08`

Trait hooks:
- `AGGR_SERVE`
- `TACTICIAN`
- `HOTHEADED`
- `COMEBACK_KID`

Design intent:
- a clear legend should almost always beat a clear weakling
- upsets should happen mainly in closer quality bands or because of specific stylistic counters
- player strengths and weaknesses should be felt in head-to-head outcomes

### 9.2 Set Simulation
Function: `simulateSetScore(setChance)`

Rules:
- target `11` with 2-point margin
- hard rally safety stop after 36 iterations
- deuce-like fallback resolves if margin still too small

### 9.3 Team Match
Function: `simTeamMatch(homeId, awayId, isCup)`

Structure:
- 4 singles
- each duel updates player points won/lost
- fatigue and morale effects applied after match

Design intent:
- Points are now the primary readable performance layer, not just sets.

## 10. International And Special Event Tuning

### 10.1 Top 12 Masters
Rules:
- runs before final league round
- separate event for I Liga and II Liga
- one best player per club
- ordered by `seasonW`, tiebreak by current OVR
- payouts are now spread across placements, not only the champion

Current payout intent:
- winner
- finalist
- semifinalists
- quarterfinalists

Design intent:
- A prestige checkpoint that highlights true seasonal standouts, not just raw strongest players.

### 10.2 Event Flow
Rules:
- cup, Top 12, Mundial, and Olympics replace the next action in season flow
- player does not manually decide whether an event or league round should happen first

Design intent:
- Season cadence should feel authored and fair, not player-exploitable.

## 11. Recommended Future Balancing Checks

### 11.1 Coach Fit
- Verify synergy builds do not overpower raw OVR by too much in low and mid tiers.
- Check if anti-fit penalties are visible enough to matter in roster planning.

### 11.2 Economy
- Watch whether merchandising plus TV makes I Liga snowball too hard by season 4+.
- Check whether PR director wage tiers are still worth it at lower prestige.
- Revisit cup and Top 12 payout ladders after a few long saves to ensure they reward deep runs without replacing league economics.
- Watch whether the prestige-tax curve is still strong enough once club prestige and budgets inflate in later saves.
- Check whether `AMBITNY` appears often enough to matter without making the market feel arbitrarily dead.

### 11.3 Youth
- Review whether direct academy loans create too-fast progression for every top prospect.
- Compare youth-developer coaches against pure OVR coaches over 3-5 seasons.

### 11.4 Market
- Check free-agent volume every offseason to ensure enough replacement-level options.
- Revisit scout poaching and elite scout salary scaling if top scouting still feels too efficient.

### 11.5 Match Authenticity
- Run large-sample tests for elite vs weak duels and confirm upset rate stays near the intended `2-5%` band.
- Verify that signature-stat generation creates meaningful archetypes without making one weak stat overly punishing.

### 11.6 Presentation
- Continue verifying that point-based league rankings stay more informative than old set-based views.
- Watch if archived news cap `180` is enough for longer careers.

## 12. Academy Scouting

### 12.1 Mission Cost
Functions:
- `scoutMissionCost()`
- `sendScout()`

Rules:
- each scout mission now consumes budget immediately
- current formula: `max(2500, round(1800 + staffOvr * 45))`
- mission cost is recorded into `seasonFinance.other` as a negative outflow

Design intent:
- scouting should compete with wages and transfer spending
- weak clubs should feel real opportunity cost when sending multiple scouts

### 12.2 Mission Duration
Functions:
- `sendScout()`
- `checkScoutReturns()`

Rules:
- every academy scouting trip lasts exactly `10` matchdays
- there is no short random mission variant anymore

Design intent:
- scouting should be planned ahead
- the player should not spam cheap, fast searches every round

### 12.3 Junior Yield By Scout Quality
Functions:
- `scoutMissionFindCount()`
- `checkScoutReturns()`

Rules:
- every mission returns exactly `1` junior
- scout quality changes peak-OVR odds, not volume
- even weak scouts can hit a gem, but the chance is much lower

Design intent:
- keep scouting readable and less snowbally
- make elite scouts valuable through quality, not raw player count

### 12.4 Report Cleanup
Functions:
- `clearScoutResult()`
- `signAcademyProspect()`
- `doNegotiate()`

Rules:
- when a junior from scouting joins the club, the related report is removed
- report boards should only show still-available prospects

Design intent:
- remove stale market noise
- keep the academy report list actionable and easy to read

## 13. Save Export Naming

### 13.1 File Name Format
Function:
- `buildSaveFilename()`

Current format:
- `ppm-v17-{club}-{season}-{matchday}-{phase}.json`

Example:
- `ppm-v17-polonia-warszawa-s3-k12-pre.json`

Design intent:
- make exported saves readable outside the game
- help players keep multiple long careers without manual renaming

## 14. Career Offers And Seasonal Awards

### 14.1 Club Offer Scope
Function:
- `generateClubOffers()`

Rules:
- post-season offers can now come from different countries
- both league tiers can appear in the offer pool
- manager prestige still controls how strong those projects may be

Design intent:
- career progression should feel international
- the player should not be trapped inside one domestic ladder

### 14.2 League Awards
Function:
- `giveSeasonAwards()`

Rules:
- league awards now use league-only data
- `Złota Paletka` is based on average point differential per league match
- `Żelazna Paletka` is based on average points conceded per league match
- player must appear in at least `75%` of team league matches to qualify
- if no one reaches the threshold, the system falls back to players with any valid league sample

Design intent:
- reward efficiency rather than raw volume from long runs in side competitions
- stop cup, Top 12, and international play from polluting league honors

## 15. Board Pressure And Usage Morale

### 15.1 Interactive Board Risk
Functions:
- `generateBoardObjectiveChoices()`
- `selectBoardObjective()`
- `endSeason()`

Rules:
- preseason offers `Bezpieczny`, `Oczekiwany`, and `Ambitny` board targets
- safe objectives pay less
- ambitious objectives pay the most
- failing an ambitious target results in immediate dismissal

Design intent:
- make preseason risk selection a real strategic choice
- trade security for upside instead of hiding the board behind one automatic target

### 15.2 Starter Usage Morale
Functions:
- `processStarterUsageForTeam()`
- `applySeveranceRelease()`

Rules:
- players expected to be starters track repeated non-usage
- after `3` straight missed matches they lose `25` morale
- morale below `15` triggers a forced exit
- severance equals `50%` of the remaining contract value

Design intent:
- make promised roles costly to ignore
- punish passive stockpiling of top players on the bench
