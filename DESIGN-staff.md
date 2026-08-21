# DESIGN — Staff & support roles

> **Status (2026-08-20):** coach / physio / psych **w grze**. Mgła skauta (pasmą + peak `?`) **w grze**. Fitness coach, analityk wideo i ciaśniejsze pasma od OVR skauta — później.

## Roles (owner research → game mechanic)

| Role | Real job | Game mechanic |
|------|----------|---------------|
| **Head Coach** | Between-sets coaching, time-outs, master plan | In-match: bonus in set endings + tactical shift. **Long-term: player/youth DEVELOPMENT (its real elite value).** |
| **Sparring (no separate hire)** | Style-specific prep | **FINAL (owner 2026-06-29):** NO dedicated sparring-partner hire. Sparring comes purely from your **reserves and juniors** and their styles. Prepping for an opponent's style requires having that style on your bench/in your academy → makes squad/academy STYLE DIVERSITY valuable and gives reserves & juniors a real purpose. |
| **Fitness/Motor Coach** | Footwork, explosiveness, tempo endurance | Raises physical params (stamina/agility) + lowers injury risk in intense tournaments. |
| **Physiotherapist** | Joints/recovery after multi-match days | Energy/fatigue regen between match days + faster injury healing. |
| **Sport Psychologist** | Choke under pressure, concentration | Pressure resistance / MEN in endings + resistance to negative life-events (→ pillar 3). |
| **Video/Data Analyst** | Opponent tendencies, serve/placement patterns | Pre-match: reveals opponent hidden stats / key plays → tactical edge (fog-of-war reveal). |

Scope note: not all must ship at once. Coach + physio + psychologist + scout exist
today. Sparring partners, fitness coach, analyst are NEW. Sequence them; sparring
partners are the highest-value/most-distinctive addition.

## Scout & information model (owner decision 2026-06-29)
- **Scout belongs in the staff section** and follows the two-curve model (better
  scout = better at finding players + tighter potential bands; diminishing effect,
  rising cost).
- **OVR is REAL and always visible** (refined owner decision 2026-06-29). BUT the
  **individual stats (ATK/DEF/SRV/MEN) are shown as BANDS/ranges** until scouted —
  a better scout narrows those stat bands. So you always know HOW GOOD overall, but
  not the exact composition, until you scout. Same idea for the ceiling/potential.
- **Fog-of-war = stat bands + potential + hidden traits.** Player bands + peak `?`
  until observe / play / sign are in the live game (2026-08-20). Tighter bands from
  higher-OVR scouts, and staff fog, are still later.
- **Scouting cost model — AGREED (owner 2026-06-29):** salary + a small per-mission
  cost scaled by mission size. **One scout runs ONE mission at a time** (the choice
  is the gameplay). Better scout → higher chance of a high peak OVR + tighter bands.
  - Junior-search missions (numbers to fine-tune):
    - Small: 5 matchdays → 1 junior
    - Medium: 9 matchdays → 2 juniors
    - Large: 15 matchdays → 4 juniors
  - Market-scout mission: ~1 matchday to scout a specific transfer-market player
    (reveal their stat bands / potential). Mutually exclusive with a junior mission.
- **Junior search ↔ academy integration — OPEN (pick an approach):** juniors found
  should feed OUR academy. Owner ideas: send scout to junior tournaments / academy
  applications / our own mini qualifying tournaments. Candidate model: junior
  missions are REGIONAL and drop prospects into the academy pool; an optional
  higher-cost "mini-tournament trial" mission yields a small shortlist with
  better-revealed potential (more agency). DISCUSS which to build.
- **"On feel" mode: NOT now.** Someday-only; do not build it yet (owner).

## Match variance — best players must NOT win every match
Confirmed design goal. Upsets come from: match randomness, style counters (the
5-style pentagon), form/fatigue/morale, clutch (MEN in endings), and the
diminishing-returns gaps (no insurmountable support advantage). A strong favourite
should win MOST but never ALL. (Already partly enforced: a test asserts the top
player beats the bottom >70% — i.e. <100%; we keep an explicit upset rate as we
tune.)

## The balancing philosophy — TWO different curves

Owner agreed ~90% with "diminishing impact + rising cost". The 10% (wunderkind
should dominate) is resolved by splitting inputs into two classes:

### A) SUPPORT systems (staff, infrastructure, tech partnership) → diminishing returns
- **Effect of OVR = concave** (e.g. `delta = MAX * ((ovr-30)/69)^0.65`). 70→99 buys
  only a few points of effect.
- **Cost = convex/exponential.** The top few points cost multiples.
- Result: money **cannot buy dominance** through support. Best staff = a luxury that
  only pays off with huge money + a talent worth maximising.

### B) PLAYER talent → stays impactful (near-linear), but is SCARCE, AGING, EXPENSIVE
- A generational wunderkind **is allowed to dominate on court** — raw OVR→result is
  near-linear (even slightly convex at the very top). This preserves the fantasy.
- Anti-domination for players comes NOT from flattening impact but from:
  scarcity (few exist, contested), **aging/decline** (your dynasty erodes),
  **renewal churn** (he gets expensive to keep), squad/wage limits, and match variance.
- So: you CAN have a dominant star — keeping a dominant *squad* across many seasons
  is the hard part.

**One-line rule:** *diminishing returns on what money BUYS (support); scarcity &
decline on what money RENTS (talent).*

## Tension resolutions (owner's two hard questions)

### "Wunderkind should be dominant vs diminishing returns?"
Resolved by the two-curve split above. Diminishing returns apply to support, NOT to
innate talent. The wunderkind dominates; the challenge is affording + retaining a
whole roster of quality as it ages and rivals poach at renewal.

### "If coach 99 gives only +3-4 over coach 80, isn't a better player smarter?"
**Yes — for a quick fix, buy the player. That's intended and good (real trade-off).**
The elite coach's value is NOT the small in-match bonus — it's **compounding youth
DEVELOPMENT**: a great coach makes your young talents reach a higher ceiling faster,
every season, for years. So:
- Buy a finished player = instant, short window, you rent a peak.
- Invest in elite developer-coach + youth = slow, compounding, builds a DYNASTY.

Both are valid strategies → that IS the strategic depth. The elite coach is the
**dynasty-builder's tool**, which is exactly the youth-investment cycle the owner
wants. (Implication: the coach's `training`→player-growth link must be meaningful
and visible.)

## The youth-investment cycle (the AI must do this too)
Young cheap high-ceiling staff/players on long contracts → low wages for years →
they grow → climb the table → at renewal their demand is repriced off CURRENT (now
high) OVR → must overpay to keep or sell/replace. Mid/back-table AI uses this to
rise; top clubs churn to stay. Add fog-of-war on POTENTIAL (ceiling uncertain; good
scout/analyst reveals it) so it stays a judgement call.

## Open / to lock before coding
- Concrete numbers (effect MAX per role, cost curve coefficients, wage ranges ≈ real).
- Whether sparring partners are a staff slot or a separate roster.
- Make coach `training`→player development visibly meaningful first (it underpins the
  whole "elite coach = dynasty" answer).
