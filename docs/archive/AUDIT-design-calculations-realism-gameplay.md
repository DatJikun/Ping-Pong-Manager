# Full audit: Ping-Pong Manager

> **Date:** 2026-07-11 (written) · **Last progress:** 2026-07-11 (traits/staff/styles/AI + docs sync)  
> **Scope:** Design, calculations, realism, and gameplay  
> **Tests at audit:** 88 → engine honesty 92 → full batch **108 green**.

This document captures a full-repo audit of problems that hurt design honesty, math, table-tennis realism, and manager gameplay — not a changelog of already-fixed owner notes in `OPEN-ISSUES.md`.

---

## Progress since audit

| Item | Status |
|------|--------|
| Equipment / tech into point sim | ✅ **FIXED** — `engineStats` via adjusted stats; coach lift not double-counting. |
| World-wide fatigue multi-rest | ✅ **FIXED** — only the two clubs in a fixture settle load/rest. |
| Style counter strength | ✅ **FIXED** — live STYLE_EDGE + engine mults; equal-stat ~57–65%; skill still dominates large OVR gaps. Tests in styles + traits-staff-ai. |
| Dead traits / psychologist | ✅ **FIXED** — traits wired; +6 new; psych morale/clutch; physio fatigue; coach dev up. |
| AI parity (injury/hall/youth promote) | ✅ **FIXED** — both clubs injured; AI hall + youth promote at 21. |
| AI `raisePlayerBaseOvrTo` retune | ✅ **SOFTENED** — only half-gap when >3 OVR under target (not full magic rewrite). |
| Transfer value vs “buy now” | ⏸ **DEPRIORITIZED** — owner: market is next-year pre-sign first, not instant buys. Fee tuning optional later. |
| Architecture monolith / living world / UI | ⏳ still open (roadmap, not engine honesty) |

---

## Executive summary

The project has a strong foundation; **engine honesty batch of 2026-07-11 closed the critical “presentation layers”** (equipment, fatigue, styles, traits, staff, AI parity). Remaining product gaps: **playtest feel**, **scout fog**, **living world**, **UI**, **Steam**, optional **pre-sign fee** polish.

| Severity | Theme | One-line issue | Status |
|----------|--------|----------------|--------|
| Critical | Match engine | Equipment / tech not in point sim | ✅ fixed |
| Critical | Match engine | Style counters flavor-only (~53%) | ✅ fixed (~57–65%) |
| Critical | Fatigue | World multi-rest every fixture | ✅ fixed |
| High | Traits / staff | Dead weight | ✅ fixed (direction; playtest feel TBD) |
| High | Economy | Buy-now value absurd | ⏸ next-year market; optional later |
| High | AI world | Magic OVR retune | ✅ softened |
| Medium | Architecture | Monolith, dead duel odds code | ⏳ open |
| Medium | Gameplay feel | Living world thin; 3+2 vs 4 starters | ⏳ open |

---

## 1. Design / architecture problems

### 1.1 God-file + mutation-heavy sim

- Almost all systems live in `gameplay.js` (~5.5k lines).
- `simTeamMatch` **mutates** fatigue, W/L, morale side-effects, nominations, etc. in place.
- That blocks clean what-if previews, doubles balancing experiments, and “preview this lineup” without risking state.

Already on the roadmap (`HANDOFF` #2–#3) — still the main engineering risk.

### 1.2 Docs vs shipped code diverge

`BALANCING-v17.md` still describes:

1. `duelWinProbability`
2. `matchupProfileSwing`
3. style edge as a pre-duel odds boost

Live path is **point-by-point** `simulateRallyPoint` → `simulateSetScore` → `simIndividual`.  
`duelWinProbability` / `matchupProfileSwing` are **unused** in the live path. Easy to rebalance the wrong knobs.

### 1.3 Roster model vs match protocol clash

- Squad UI / `teamOvr` / growth assume **4 starters**.
- Match protocol uses **3 nominated + up to 2 reserves**, first to 3 games + doubles.

So “starter #4” is only loosely related to who actually plays. Board order matters for A/B/C, but the 4-starter fantasy is half-true — confusing for a pure manager game.

### 1.4 Two name generators (known landmine)

`randNameForCountry` exists in both `state.js` and `gameplay.js` with **different** behaviour (`HANDOFF` §5). Subtle name/nationality bugs over long careers.

### 1.5 Save schema still ad-hoc

No `schemaVersion` + ordered migrations — only growing `if (!field)` guards. Long careers + new systems = load risk.

### 1.6 Vision gap (by design, but it shows in feel)

Pillar 3 (life events, poaching drama, mailbox depth, voting) is only partly there. Today the game is still closer to a **solid spreadsheet sim** than an “alive” dynasty. Design docs admit this; it is the biggest *product* gap, not a bug.

---

## 2. Calculation / engine problems

### 2.1 Critical: equipment & tech partnership do not affect matches

> ✅ **FIXED 2026-07-11.** `engineStats()` now uses `getPlayerAdjustedStats`.
> Coach lift is `effectiveRating − ovr` (coach-only) so gear is not double-counted.
> Regression: `tests/engine-honesty.test.js`. Historical description kept below.

**Was (pre-fix):**

- `ovr()` used `getPlayerAdjustedStats` (blade + sponge + rubber + tech).
- Match profiles used `engineStats(p)` on **raw** `p.fh/bh/...` only.
- Player paid for PRO rubber and got a higher OVR number, not better results.

### 2.2 Critical: style counter table is mostly UI

```js
function getStyleEdge(homeStyle, awayStyle) {
  const delta = ((STYLE_EDGE[homeStyle] || {})[awayStyle] || 0) * 0.58;
  return { delta, label: ... };
}
```

In `simIndividual`, only `styleEdge.label` is returned. **`delta` is never applied.**

Real style effect comes only from `PLAYER_STYLE_INFO.engine` multipliers (`winnerMult`, `errorMult`, `oppErrorMult`). Tests show equal-stat DEFENDER vs TWO_SIDED is only **~53%** edge — barely readable in a single match, weak for “I built a counter squad” fantasy.

Also: **TWO_SIDED** gets free `allStatLift: 3` — permanent +3 on all engine channels → meta bias for the balanced style.

### 2.3 Dead / half-dead match systems

| System | Status |
|--------|--------|
| `duelWinProbability` | Defined, unused live |
| `matchupProfileSwing` | Defined, unused live |
| `STYLE_EDGE` deltas | Label only |
| Traits: `COMEBACK_KID`, `HOTHEADED`, `TACTICIAN` | Described in data; **no match logic** |
| `AGGR_SERVE` | Only ace mult slightly |
| `IRON_ATTACK` / `SERVE_MASTER` etc. | Growth/generation caps, not in-rally |
| Psychologist | Salary + OVR display only — **no morale/pressure effect** |
| Scout “stat bands / fog” | Designed in `DESIGN-staff.md`, **not implemented** |

Players hire staff and collect traits that do almost nothing on matchday.

### 2.4 Critical: global fatigue recovery every match

> ✅ **FIXED 2026-07-11.** Fatigue settles only for the two clubs in the fixture:
> players who played gain load; sitting teammates rest once; other clubs untouched.
> Regression: `tests/engine-honesty.test.js`. Historical description kept below.

**Was (pre-fix):** every non-participant in the world recovered after every
`simTeamMatch` → a full matchday multi-rested bystanders ~6–11× and gutted rotation.

### 2.5 Elite / coach stacking can still inflate strength

`effectiveRating` adds:

- coach focus + synergy + motivation,
- **eliteBonus** that scales hard above 84–90,

then `buildPointSimProfile` folds a chunk of that into every rally channel, plus form/morale/fatigue.

Favorite bias is intentional, but stacking coach + elite + form + (fake) OVR equipment can make ratings and results diverge in confusing ways — especially once equipment is fixed to actually matter.

### 2.6 Serve rule at deuce is wrong

Serve alternation always uses every **2** points (`floor(totalPoints / 2)`).  
Real ITTF: from deuce, serve every **1** point. Small but pure realism bug.

### 2.7 Market value formula is broken relative to wages

```js
// ~ ovrBase * 240 * age * form * traits
```

Rough scale:

| OVR | Wage/season (curve) | Transfer value (~) |
|-----|---------------------|--------------------|
| 70 | ~€13k | ~€17k |
| 80 | ~€48k | ~€19–22k |
| 90 | ~€170k | ~€22–25k |

A star costs **years of wages** but sells for **weeks of wages**. Rational play: **never buy, always free-agent / pre-sign / academy**. AI “buy outgrown stars” uses `wage * 2.2` as fee — still tiny vs multi-year wage commitment, but at least not the `*240` path. Two valuation systems fight each other.

### 2.8 AI strength is magically retuned to budget

Every season `maintainAiRosters` → `tuneGeneratedLeagueRoster`:

- tops squads up to 10 players,
- **`raisePlayerBaseOvrTo`** top 4 to budget-derived targets.

So AI strength is not only “earned income → sign better people”; it is also **stat editing to fit the money model**. That:

- hides bad AI transfer logic,
- compresses organic aging stories,
- means promotion/relegation strength can jump without roster drama.

Wage discipline also **silently scales every AI salary** to ≤62% of income — solves bankruptcy, but erases contract tension for the AI world.

### 2.9 Player-only development / lifecycle asymmetries

In `applyGrowth`:

- Hall training bonus: **player club only**.
- Youth auto-promote at 21: **player club only**.
- Loyalty++ : **player club only**.

AI academies get coach/infra multipliers but not hall, and AI juniors may sit as `youth` forever. Unfair and unrealistic.

### 2.10 Other calculation smells

- **Doubles:** average of two stats + tiny +2 chemistry if styles differ — no true doubles skill, no “lefty/righty”, board-1 ban is good protocol but pairs feel random.
- **Mundial / Olympics:** other nations are `simOvr` blobs with ±10 noise — fine for v1, but not a real international layer.
- **Prestige** is only for the player club’s recent form; AI prestige is a proxy in marketability — different systems.
- **Board objective** can become `topN` for predicted position; reward scaling via `goalDiff('top7')` etc. is improvised — OK, but risk of odd rewards at the extremes.
- **Tech partnership** cost sign comment is confusing (`costPerSeason` positive vs negative) — easy finance misread.

---

## 3. Realism problems (table tennis & club-manager sense)

### What is good

- 5 real styles (names/grips/archetypes).
- Per-country protocols (Superliga / TTBL / CTTSL / T.League) with golden point, Victory Match, last set to 6.
- Equipment *concept* (blade/sponge personal, rubber club recurring) is research-based.
- Wage curve roughly anchored to TTBL-scale budgets.
- Age curves by stat group (physical / technical / mental) are the right idea.
- First-to-3 + doubles deciding matches matches real team events better than pure “4 singles”.

### What is still fake / thin

1. **Women’s / mixed / age categories** — none (OK for scope, but world feels single-track).
2. **No dual club + national registration** (on roadmap).
3. **Country peak bands exist in data** (`CN` 21–26 vs `PL` 27–32) but must be verified they fully drive generation for foreign players in a PL save — many flows force `store.G.countryId`.
4. **No ITTF cards / misconduct / walkovers** beyond empty-roster forfeit.
5. **Hall capacity vs ticket prices** improved after the exploit fix, but AI tickets are a fixed €55/€40 model with no club-trait variance (community vs big-spender).
6. **Injury only rolls on player starters** (`rollInjuries` filters `myId` starters) — AI injuries are weak/absent → unfair schedule health.
7. **Life off court** almost absent vs VISION (babies, scandals, burnout) — biggest “feels dead” gap.
8. **Poaching** of expiring players is a 25% random snatch, not multi-club bidding / loyalty / agent drama.
9. **Perfect season record** still framed around old point assumptions in places; Superliga scoring is 3/2/1/0, not pure 3-per-win.

---

## 4. Gameplay / feel problems

### 4.1 Decisions that should matter, often don’t

| Decision | How it feels |
|----------|----------------|
| Rubber / blade | ✅ On-court (fixed 2026-07-11) + OVR; playtest feel still TBD |
| Style counters | Tiny edge; hard to “feel” a tactical masterplan |
| Psychologist | Pure wage sink |
| Scout fog | Market is transparent OVR; no intel game |
| Bench depth / sparring | Exists as a small growth mult — good idea, easy to miss |
| Traits | Mostly flavor text |
| Tech partnership | Marketing € + on-court adjusted stats (fixed 2026-07-11) |

Manager fantasy: *set up the club so matches swing*.  
Current peak levers that **do** work: raw OVR/stats, fatigue (if it stuck), form/morale, coach synergy, lineup order A/B/C, protocol-specific doubles.

### 4.2 Match experience vs manager fantasy

- Point-by-point VME is cool, but for a **manager** game the strategic layer between matchdays is thinner than the match page is long.
- Inbox decisions are a good start (reserve request) but sparse vs “you run a club every week”.

### 4.3 Transfer market UX/gameplay

- Values make buying feel stupid.
- Free agents each offseason + caps by difficulty do most of the work.
- Pre-sign / fee / next-season joins are solid rules — undermined by valuation.

### 4.4 Long-term dynasty

- Academy path for Akademia Orłów is intentionally hard (~27 seasons) — good challenge design.
- HoF capped at 20 permanently deletes history — intentional for performance, but hurts dynasty lore.
- League hierarchy depends heavily on **budget retuning + wage cuts**, not pure narrative AI mismanagement.

### 4.5 UI (VISION pillar 2 — still open)

- Market as huge cards, not dense spreadsheet.
- Dark theme known broken.
- Avatars weak.
- Layout “too wide” — product issue, not sim bug.

---

## 5. Highest-impact fix order

1. ~~Equipment + tech into match engine~~ ✅  
2. ~~Fatigue scope~~ ✅  
3. ~~Style counters ~57–65%~~ ✅  
4. ~~Traits + psych/physio/coach~~ ✅  
5. ~~AI hall / youth / injury + soft retune~~ ✅  
6. **Playtest** staff/trait/style strength (owner feel).  
7. Scout fog · living world · UI · Steam (see HANDOFF backlog).  
8. Optional: next-year pre-sign fee polish (not buy-now transfers).

---

## 6. What is actually in good shape

Worth stating clearly so this is not only a hit list:

- Headless harness + **88 tests** is a real safety net.
- EUR wage curves and “no renewal shock” are coherent.
- League formats and doubles protocol are a differentiator.
- Ticket demand exploit was properly fixed.
- Academy design + stress target is thoughtful.
- Atomic matchday commit (no re-sim on reload) is correct for a browser game.
- First-to-3 team matches with forfeit guards — solid.

---

## Bottom line

**Design ambition is high; several “shipped systems” were (or still are) presentation layers.**  
The game’s spine (OVR, wages, academy, protocol matches) works. Equipment and fatigue honesty landed 2026-07-11. Remaining soul gaps: styles as strong counters, staff/trait depth, living AI without magic retune, transfer market values.

### Suggested next steps

1. **Style counters** — apply `STYLE_EDGE` or retune engine mults (~58–65% equal-OVR).
2. Transfer values, dead traits/psych, AI roster retune (discuss numbers before coding where balance).

---

## Related docs

| Doc | Role |
|-----|------|
| `DOCS.md` | Doc map / what is current |
| `HANDOFF.md` | Working state + engineering roadmap |
| `VISION.md` | Four pillars (backend → UI → alive → Steam) |
| `OPEN-ISSUES.md` | Owner playtest feedback (mostly fixed) |
| `DESIGN-economy.md` | Wage / EUR scale |
| `DESIGN-staff.md` | Staff + two-curve philosophy + scout fog (partly unbuilt) |
| `DESIGN-ai-world.md` | Living AI / principals |
| `DESIGN-academy.md` | Academy (shipped vertical slice) |
| `BALANCING-v17.md` | Formulas — **partly stale** vs live engine |
| `GDD-v17.md` | Full design intent — **partly stale** |
