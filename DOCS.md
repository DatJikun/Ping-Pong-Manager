# Documentation index — START HERE

Map of every doc, what it's for, and how fresh it is. Read in this order.

## Quick facts — what is ACTUALLY shipped right now (2026-07-24)
- **Headless test harness + 112 passing tests** (`npm test`) + long-career probe
  (`node tests/stress.js`) + academy balance probe (`node tests/stress.js youth`).
- **Academy** (vertical slice): 6 levels, age-curve dev, youth sales/loans, challenge
  club Akademia Orłów. See `DESIGN-academy.md`.
- **5 playing styles** with **live counter-pentagon** (equal-stat counters ~57–65%;
  large OVR favorites still beat weak counters). See styles tests.
- **EUR economy**: convex wage curves, no renewal shock; AI real income + wage
  discipline. Market is **next-season pre-sign first** (not mid-season contracted buys).
- **Match protocols** per country + doubles; **equipment** in match engine;
  **fatigue** only for the two clubs in a fixture.
- **Traits:** expanded catalog (incl. FAST_FEET, SPIN_WIZARD, WALL, CLUTCH, MENTOR,
  BIG_MATCH) with **match/growth effects** (not flavor-only).
- **Staff impact:** coach development stronger; physio fatigue/injury; psychologist
  morale + clutch. Scout fog / fitness coach / analyst still unbuilt.
- **AI parity:** hall training, youth promote at 21, injuries for both clubs;
  soft budget→OVR retune (half-gap only when clearly under target).
- **Avatars (2026-07-24 rewrite):** real head/neck/shoulder construction, hairline
  curves + 15 hair styles × 4 textures, jaw-clipped beards, age marks, glasses/cap/
  headband, 4 staff outfits, club jersey colours. **Region/ethnicity model unchanged.**
  Preview: `tools/avatar-preview.html`.
- **UI (2026-07-24 pass):** surfaces are theme tokens → **dark theme actually works**;
  header regrouped (no truncation); Squad / Dashboard / Budget / Club / Market /
  Staff / Preseason decluttered; one market row component for players + staff.
- **Principals / club traits / inbox** (partial living world).
- **Still open:** deeper living world (life-events, poaching drama, bankruptcy),
  scout stat-band fog, Steam wrap, `gameplay.js` split, full next-year fee
  rebalance (owner: not buy-now transfer meta). See `HANDOFF.md` + `AUDIT-*.md`.

## Read first (current, authoritative)
| Doc | Purpose | Status |
|-----|---------|--------|
| **HANDOFF.md** | Working state, roadmap, how to test. **"What now".** | ✅ current |
| **VISION.md** | North-star: 4 pillars + Tauri/Steam. | ✅ current |
| **AUDIT-design-calculations-realism-gameplay.md** | Audit + progress of honesty fixes. | ✅ current (batch fixed 2026-07-11) |
| **CHANGELOG.md** | What actually shipped (dated). | ✅ current |

## Design decisions (owner-agreed)
| Doc | Purpose | Status |
|-----|---------|--------|
| **DESIGN-economy.md** | Wages / EUR scale. | ✅ core shipped |
| **DESIGN-staff.md** | Staff roles, two-curve, scout fog. | ⚠️ coach/physio/psych stronger; scout fog / fitness / analyst still open |
| **DESIGN-ai-world.md** | Living AI layers. | ⚠️ Layer 1–2 partial; 3–4 open |
| **DESIGN-academy.md** | Academy + youth challenge. | ✅ vertical slice shipped |

## Owner feedback archive
| Doc | Purpose | Status |
|-----|---------|--------|
| **OPEN-ISSUES.md** | Early-July playtest bugs. | ✅ all fixed — archive |

## Reference (v17 — PARTLY STALE)
| Doc | Purpose | Status |
|-----|---------|--------|
| **ARCHITECTURE-v17.md** | File map. | ⚠️ layout OK; counts lag |
| **GDD-v17.md** | Full design intent. | ⚠️ lags many 2026-07 systems |
| **BALANCING-v17.md** | Old formulas. | ⚠️ match §0.4 partly obsolete; trust code + DESIGN-economy |

**On conflict:** `HANDOFF` + `DESIGN-*` + `AUDIT` + **code/tests** win.

## How we work
- **`npm test` (112 tests)** after every change; `npm run check` for syntax;
  `node tests/stress.js 100` for long careers.
- Balance/feel: agree with owner before coding when numbers change feel.
- One logical change per commit when using git.

## Maintenance debt
- Optional: rewrite stale sections of `*-v17.md` when next touched.
- Playtest whether staff/traits *feel* strong enough in-browser (tests prove
  direction; owner feel is final).
