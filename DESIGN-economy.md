# DESIGN — Wages & economy

> **STATUS: core SHIPPED 2026-06-29.** EUR wage curves live (`playerWageForOvr`,
> `staffWageForOvr` in `gameplay.js`), feed initial generation + renewals (shock
> gone: avg renewal ~1.4× vs the old ~2.5-3×), staff routed through the staff
> curve, budgets/sponsors/TV/maintenance rescaled to EUR, currency shown as €.
> Tests: `tests/wages.test.js`. Numbers below are the shipped baseline — tune by
> playtest. **Follow-ups:** multi-season solvency needs in-game playtest (income is
> applied in the season-finale flow, not the headless probe); free-agent pool
> floats larger now (~430 active players, stable) — consider scoping per-match
> loops to teamed players for speed.

## Original proposal (now implemented)

Anchored to owner research: TTBL top club ≈ **€500k/season**, smaller ≈ **€250k**;
~80% of budget goes to player wages. (Decide: realistic EUR scale vs fantasy — see
end.) Numbers below are a PROPOSAL to react to, not final.

## Wage curve (convex — top players cost a lot more)
`wage(OVR) ≈ 2000 × 1.135^(OVR−55)` €/season, floor ~1000 below OVR 55.

| OVR | ~wage/season |
|-----|--------------|
| 60 | €4k |
| 70 | €13k |
| 75 | €25k |
| 80 | €48k |
| 85 | €90k |
| 90 | €170k |

Initial generated wages use THIS same curve → no artificial renewal shock. A
legitimate increase still happens only when a player actually IMPROVES (the
dynasty churn). Higher loyalty/morale → accepts somewhat worse terms.

## "4 superstars is impossible" check (works)
- €500k club (~€400k wages): 1×OVR90 (170k) + 1×85 (90k) + 2×78 (~35k) ≈ €330k.
  A 2nd genuine star (another 170k) blows the budget → can't field 4 stars. ✅
- €250k club (~€200k wages): an 80 top (48k) + 75s + 70s = solid mid-L1.
- ~€100k L2 club (~€80k wages): 70 top (13k) + 65s + 60s → squad avg ~65, "poverty",
  ~70 ceiling EMERGES from affordability (no hard cap). ✅ → the L1/L2 gap is economic.

## Staff wage curve (parallel, lower ceiling — realistic)
Decision: **all money in EUR, realistic scale, all leagues.** Research: a €500k club
spends ~€350k on players but only ~€50k on ALL staff combined — so staff are
correctly CHEAPER than star players, not "paupers".

`staff_wage(OVR) ≈ 1500 × 1.075^(OVR−45)` €/season (ceiling ~€40k vs player €170k):

| OVR | ~staff wage |
|-----|-------------|
| 50 | €2k |
| 70 | €9k |
| 80 | €19k |
| 90 | €40k |

A full elite staff (coach ~€33k + physio ~€19k + psych ~€16k + scout ~€13k) ≈ €80k
— a real budget line, affordable in L1, painful in L2 (emergent gap). And buying an
elite coach (~€40k) vs a star player (~€170k) is the trade-off the owner wanted:
the coach is the cheaper DEVELOPMENT play, the star is the expensive instant play.
**So player prices are NOT too high — staff are just realistically cheaper.**

## Contracts & finance (owner decisions)
- **New contracts take effect NEXT season** (mid-season signings are pre-contracts,
  €0 cost now) → sidesteps the proration bug where a coach signed for the last
  matchday is charged a full season. Clean + matches owner preference.
- Wages tie to league economy (L1 earns more → affords more → stays strong).

## Coach development (owner additions, to fold into P2)
- Even a WEAK coach still develops players, just slower (never zero growth).
- The BEST coaches can grant NEW positive traits, especially to YOUNGER players.

## Open decision for owner
**Realistic EUR scale (these numbers) or a fantasy scale?** Recommendation:
realistic-anchored — grounds the sim, makes the research meaningful, and already
produces the right pressure. (Game currently uses zł; either switch to € or keep zł
at the same magnitudes.) Also: owner to confirm per-league budget ranges.
