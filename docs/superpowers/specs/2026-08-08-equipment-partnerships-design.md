# Equipment Partnerships Design

## Goal

Replace the two independent "technical partner" and "club rubber tier" ladders with one strategic equipment contract that supports different squad styles, lasts one to three seasons, and remains compatible with existing careers.

## Chosen approach

Keep the existing stable `techPartnership` partner ID and add one persisted `techContract` as the source of truth for terms. A contract identifies the partner, included rubber profile, original term, seasons remaining, annual financial value, and early termination fee. The legacy `rubberTier` field is accepted during migration but no longer drives gameplay.

This is preferred over keeping both old fields because retaining two selectors would preserve the duplicated upgrade ladders the feature is intended to remove. A fully individual rubber market was rejected because it would add repetitive player-by-player administration without improving the club-level decision.

## Partner profiles and balance

Each offer is a trade-off, not the next rung on a power ladder:

| Profile | Match effect | Other effect | Intended fit |
| --- | --- | --- | --- |
| Offensive | +1 FH, +1 serve | +4% marketability | Forehand loopers and proactive all-rounders |
| Control/return | +1 return, +1 mentality | +3% marketability | Blockers, defenders and fishers |
| Speed/footwork | +1 BH, +1 footwork | +4% marketability | Two-sided players and blockers |
| Mental/development | +1 mentality | +5% yearly development | Young or developing squads |
| Commercial/balanced | either +1 FH/+1 BH or no court bonus | +7% or +15% marketability | A choice between a small neutral package and maximum commercial reach |

The six existing partner IDs remain valid. Two use different commercial/balanced variants so legacy saves never point at a removed brand. The bonuses remain deliberately small: no package grants a large raw OVR increase. Prestige unlocks additional brands, but higher-prestige offers are alternatives rather than strict sporting upgrades. Personal blade and sponge setups remain attached to each player; the contract supplies the club-wide rubber package.

## Contract rules

- The player chooses a one-, two-, or three-season term during preseason.
- A two-season deal changes annual value by 4% in the club's favour; a three-season deal changes it by 8%.
- When the partner pays the club, the equivalent loyalty premiums are 3% and 6%, avoiding excessive compounding of commercial income.
- The calculated annual value is stored at signing and does not change if prestige later moves.
- The active deal settles once at season end and then loses one season. It remains selected at the next preseason while time remains.
- A current contract prevents selecting another partner.
- Early termination requires explicit confirmation and a visible fee: the rounded-up-to-500 result of `max(2500, abs(annualValue) * 0.75 + 1000 * seasonsRemaining)`.
- Termination is possible from the club screen. During a season it removes the equipment effects immediately and a replacement can only be signed in the next preseason.

## Save compatibility

The save schema advances from 24 to 25. Existing saves with a selected `techPartnership` receive a one-season `techContract` using that same stable partner ID. Their old rubber tier becomes a transitional contract-only rubber package with the same modifiers and no second seasonal charge, preserving the current season's sporting effect. Saves without a partner receive no contract and continue to preseason selection normally. Unknown partner IDs safely fall back to the always-available control package. `rubberTier` remains only as migrated legacy input and is no longer editable or charged separately.

## UI

The preseason equipment step shows each available partner's profile, included rubber package, exact modifiers, annual value, and a 1–3 season selector. An active multi-year contract marks the step complete and shows remaining seasons.

The Club page replaces the separate rubber cards and partner ladder with one contract panel. It shows the active package, style fit, annual value, remaining term, and early termination fee. When no deal is active, it explains that a new deal is signed during preseason.

All new player-facing text is available in English and Polish. English remains the default product language.

## Verification

- Focused tests cover term pricing, lockout, settlement/decrement/expiry, early termination, profile-specific match and development effects, and migration from schema 24.
- Rendering tests cover preseason and Club views with and without an active contract.
- Existing equipment engine tests are updated to prove that blade, sponge and the contracted rubber package affect the same adjusted stats used by the match engine and displayed OVR.
- A focused syntax check and relevant test files run before the stage commit. Full tests and long-career soak remain the final beta gate after stages 5 and 6.
