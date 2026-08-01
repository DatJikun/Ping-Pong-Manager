# Match readiness contract for Fable

This file describes simulation data that UI may present. UI must not re-create
the formulas.

## Nomination

Call `gameplay.matchNominationRules()` for the current country.

| Field | Meaning |
|---|---|
| `requiredBase` | Number of healthy senior players required to play (currently 3 everywhere) |
| `maxReserves` | Optional match reserve slots: 2 in Superliga/TTBL/Pingisligan, otherwise 0 |
| `recommendedTotal` | Suggested total selection: 5 for Superliga, 3 elsewhere |
| `reservesUsedInMatch` | Whether this protocol can actually field a reserve |

Do not label two reserves as mandatory. A three-player Superliga selection is
legal and safe; reserves are tactical cover for game four. The useful UI wording
is "3 required · up to 2 reserves recommended".

## Sparring

Call `gameplay.getSparringProfile(teamId)`.

- `partnerCount`: healthy reserve + academy sparring partners.
- `averageOvr`: their current average quality.
- `mentorCount`: healthy players with the Mentor trait.
- `styles`: styles reproducible in training.
- `developmentMultiplier` / `developmentBonusPct`: the exact value used by
  seasonal player growth, not an estimate.

An injured player is excluded until healthy. Six partners fill the depth part of
the calculation; further depth remains useful as roster cover but does not keep
inflating growth.

## Opponent preparation

Call `gameplay.getMatchPreparation(teamId, opponentTeamId)`.

- `targetStyles`: styles among the opponent's likely base three.
- `coveredStyles`: target styles reproduced by healthy sparring partners.
- `coveragePct`: readable coverage for UI.
- `usefulPartnerCount`: partners contributing to this opponent preparation.
- `ratingBonus`: the exact match-engine lift, capped at 1.2 OVR-equivalent.

The effect is intentionally modest. Present it as preparation, not a permanent
player rating. Team-match results also expose `result.preparation.home/away`, and
each rubber exposes the applied numerical bonus in `rubber.preparation`.

