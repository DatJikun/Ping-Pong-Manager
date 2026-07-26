# DESIGN — Living AI & world

> **Status:** Layer 1–2 **partially shipped**; Layers 3–4 still design-forward.
> Owner-driven. **Balance/feel = agree before coding.** Part of VISION pillar 3.
>
> **Shipped (do not re-read as “missing”):** AI clubs earn real season income
> (`aiClubSeasonIncome` — tickets/TV/merch/sponsors/prize); wage discipline
> (payroll scaled to ≤~62% of income); Team Principals with strategy/competence/
> lifecycle; some club traits (e.g. youth-only); coarse AI signings/infra; inbox
> start; **2026-07-11 parity:** hall training, youth promote at 21, injuries for
> AI, softer OVR retune (half-gap when clearly under target).
> **Still open:** granular AI decisions like the player, deeper poaching drama,
> bankruptcy/comebacks, life-events, full gazette, voting.

## Goal
AI clubs must feel ALIVE — make real, varied decisions, not one fixed algorithm.
The table should genuinely shift across seasons because clubs pursue different
strategies and react to circumstances.

## AI as full agents + Team Principals (owner 2026-06-29)

**Historical problem (solved at Layer 1):** AI clubs once earned almost no income
(only occasional cup prize) while the player took all streams → bleed-out and
flattened leagues. Income + wage discipline fixed the structural bankruptcy.

**Target (full vision):** AI clubs are full simulated entities that do everything
the player does — budget with real income, choose sponsors, set ticket price,
decide player pay (wage vs signing bonus), contract years, infra, staff hires.
Each runs on a STRATEGY.

**Team Principal (the elegant key):** every club has a Principal (a GM/manager
entity — the SAME kind of entity the player is; the player already has
managerPrestige/history and gets club offers). The **strategy lives on the
Principal**, not the club:
- **Club** = identity + constraints/traits (e.g. only-domestic staff, no players
  over 32, traditionalist, big-spender, academy-first).
- **Principal** = how to operate within that: risk appetite, youth-vs-win-now,
  wage-vs-bonus, leverage/loans, ticket pricing, sponsor ambition.
- Board sets expectations; an underperforming Principal is **fired and replaced** by
  another — possibly with a DIFFERENT strategy → the club visibly changes direction.
So both the club AND its current management shape behaviour, and it evolves.

**Bankruptcy + comebacks (owner):** a pool of reserve clubs; when a club fails,
varied comeback types — **corporate buyout** (extra budget, but new name + logo),
**fan buyout** (small new budget, keeps identity), etc. Player bankruptcy =
fail-state with warnings + recovery (sell, bailout, or get fired & move clubs).

**Build in LAYERS (not a monolith):**
1. **AI budget + income + coarse strategy profile** (youth-investor / win-now /
   frugal) governing spend. Fixes the drift; clubs start to differ. (= the "A" work.)
2. **Team Principal entities** carrying the strategy; board expectations; fire &
   replace with a (possibly different) strategy.
3. **Granular AI decisions** like the player: sponsor choice, ticket price,
   wage-vs-bonus split, contract years, infra. Incremental, decision by decision.
4. **Bankruptcy + comeback types** (corporate/fan buyout, reserve-club pool).
Honest scope note: "AI as detailed as the player" is a long road — we build it
layer by layer, each shippable and tested.

## Layer 2 PROPOSAL — Club traits × Principal strategies (pending owner OK)

**Two combined layers:** the CLUB is the stable frame (identity + hard constraints);
the PRINCIPAL is the current approach within it (soft modifiers), and changes when
fired. Club constraints are HARD; principal tendencies are SOFT. The player is also
a principal, so this mirrors the player's role.

### Club traits (stable; 1–2 per club)
| Trait | Effect |
|-------|--------|
| **Academy club** | +youth slots, develops own, lower transfer spend, hires youth-dev coaches |
| **Big spender** | chases ready stars, high wages, little youth |
| **Traditionalist** | HARD: domestic players & staff only |
| **No veterans** | HARD: won't sign players over ~32 |
| **Frugal / selling club** | low wages, sells improved players for profit, banks cash |
| **Community club** | low ticket prices (more attendance, less per ticket), high loyalty |

### Principal strategies (carried by the manager; change on replacement)
| Strategy | Levers it pushes |
|----------|------------------|
| **Youth investor** | cheap young high-ceiling, long deals, invests in dev coach, patient |
| **Win-now** | buys ready players, short deals, aggressive spend, less youth |
| **Frugal / balanced** | conservative spend, keeps reserve, opportunistic |
| **Gambler** | high wages/leverage (loans later), big risks, bankruptcy-prone |
| **Builder** | prioritises infrastructure investment |

Principal also has a **competence** level (good principals manage money/squad better).

### How they combine (hooks into the real sim levers)
Principal strategy modulates: `aiCashMult` (spend aggression), free-agent pick weight
(youth ceiling vs current OVR), wage-vs-bonus split, contract years, infra-invest
chance, budget reserve. Club traits add hard filters (nationality, age) + base
tendencies (youth count, ticket price). Club constraints override principal.

### Board expectations + fire/replace (the dynamism)
Each club's board sets an expectation scaled to its resources (top-X / avoid
relegation / win promotion). A principal who misses for ~2 seasons is **fired**; a
new one is hired from a pool with a strategy weighted by club identity (but
sometimes a contrarian) → the club visibly changes direction → more variance, more
alive.

### Visible
Team overview / league shows each club's identity + current principal + strategy +
board target, so you can scout rivals' approaches.

### EXPANDED set (owner wants much more variety)

**Club traits (1–3 per club; HARD = constraint):**
Academy/youth-first · Big spender/galactico · Frugal/selling (develop & sell) ·
Community club (cheap tickets, loyalty) · Traditionalist (HARD: domestic only) ·
No-veterans (HARD: no >~32) · Ambitious board (high expectations, impatient) ·
Patient board (lenient, long-term) · Corporate-backed (owner cash injections) ·
Sleeping giant (big fanbase/marketability, low now → high income potential) ·
Attacking identity / Defensive identity (prefers certain play styles → ties to the
5-style system) · Old-school / Modern (prefers certain coach styles) ·
Sugar-daddy volatile (owner may inject OR withdraw funds → variance).

**Principal strategies (primary + optional secondary trait):**
Youth investor · Win-now/galactico · Frugal/value · Gambler/high-leverage ·
Builder (infra) · Wheeler-dealer (buy low/sell high, high turnover) ·
Loyalist/continuity (keeps & renews squad) · Tactician (invests in staff/style) ·
Mentor/developer (youth + dev-coach) · Risk-averse · Star-chaser (one marquee) ·
Disciplinarian (wage control, never overpays).

**Compatibility — clubs hire COMPATIBLE principals (owner).** Each club trait has
preferred / incompatible strategies, e.g. Academy→prefers Youth investor/Mentor/
Builder, avoids Win-now/Star-chaser; Big spender→prefers Win-now/Star-chaser, avoids
Frugal; Traditionalist→prefers Loyalist/Disciplinarian. On a vacancy the club draws
from the principal pool weighted by compatibility (small chance of a contrarian for
variety).

**Principal LIFECYCLE — like staff (owner).** A `principalPool` of free agents; each
club has one principal. Principals have age, peakAge, competence/reputation,
ambition, loyalty. Each season they age; retire ~62–68. Fired principals sit in the
pool as free agents for a while (hireable by others); if not hired in N seasons or
too old → retire. New random principals generate to keep the pool stocked. Reuse the
existing staff lifecycle patterns (`ensureStaffMeta`, `closeStaffTenure`, retire).

The PLAYER is a principal too: club already has a board objective + firing
(`handleManagerFired`, `managerPrestige`), so the AI side mirrors the player's.

### Build order (Layer 2)
1. Principal entity + lifecycle (pool, gen, age, retire, free-agency) — reuse staff.
2. Club traits (hard constraints first: traditionalist, no-veterans) + compatibility.
3. Strategy → sim levers (spend aggression, youth weight, wage/bonus, years, infra).
4. Board expectations → fire/replace with a compatible principal.
5. Visible in team overview/league. Tune via stress (more variety ⇒ more distinct
   champions / more churn?).

## AI strategy personalities (to design)
Each club has short- & long-term strategy leanings, e.g.:
- "Youth project": cheap young high-ceiling players + staff on long deals; saves
  money early, climbs as they grow, then must overpay to retain (the dynasty cycle).
- "Win now": buys finished players, short windows.
- ...and a spectrum between.
Plus **club TRAITS** (flavour + constraints): only-domestic staff, no players over
32, "traditionalists", big-spender, academy-first, etc. → variety and identity.

## Poaching — rivals come for OUR players AND staff (owner design 2026-06-29)
Rivals generate offers for our people based on their value and the rival's
needs/budget/strategy. **How we're notified depends on the person's MORALE & LOYALTY:**

| Morale / loyalty | What happens |
|------------------|--------------|
| **Low** | They simply tell us they're LEAVING to another club next season. (Little/no chance to stop it — the warning sign was the low morale.) |
| **Medium** | "I have a better offer" → we must COUNTER with better terms (re-negotiation prompt) or lose them. |
| **High** | "I'm getting offers but I'm staying — thanks for the good atmosphere." Flavour + loyalty payoff; we keep them. |

This makes morale & loyalty matter directly, and ties to: psychologist (morale),
club atmosphere, life-events (pillar 3), and the renewal-repricing churn. Applies to
**players and staff alike**.

### Refinements (owner 2026-06-29)
- **100% unstoppable departure ONLY when** loyalty AND morale are really near 0,
  **OR** when the contract terms aren't being honoured (e.g. a guaranteed-starter
  promise is broken). Otherwise medium = counter-offer chance.
- **High-loyalty "tempted" case is rate-limited:** a big external offer can only
  appear **after a few matchdays into the season** AND when the person has **only 1
  year left** on the contract (never when they still have e.g. 4 years).
- **Player/staff profile must show recent MORALE & LOYALTY modifiers** (why it went
  up/down) so the player can see trouble coming.
- **MAILBOX / inbox** is a core feature — departures, offers, board messages, etc.
  land there; big lever for making the world feel alive.
- **Top-player poaching breaks in the GAZETTE first** (owner): for a star
  (highest OVR / club legend), the newspaper reports "talks between club X and the
  player" BEFORE the player privately tells us — building tension/story.
- **Later idea (discuss):** a tiny LOCAL ai/text model to vary email & gazette
  prose so it isn't the same lines every time — must run on basically any hardware.

### Still to agree
- Medium counter-offer reuses the normal negotiation flow? (assistant: yes)
- Exact thresholds for "near 0" morale/loyalty.

## Round gazette (see HANDOFF §13)
Per-round newspaper: results, transfer rumours, infra upgrades, shock sackings,
poaching stories — the world narrates itself.

## Voting (F1/FIA style) (see HANDOFF §13)
Clubs vote on league rules (rounds, team count, budget cap, match format, prizes);
outcomes change the world over time.
