# Match readiness contract for Fable

This file describes simulation data that UI may present. UI must not re-create
the formulas.

## Nomination

Every registered adult player belongs to one `role: 'senior'` roster. Academy
players alone use `role: 'youth'`; contract expectations such as key player or
rotation are promises, not hidden team membership.

Use these gameplay APIs instead of reconstructing roster state in UI:

- `getClubSeniorPlayers(teamId, includeLoanedOut)` resolves the active roster
  and can optionally include owned players who are away on loan.
- `matchAvailability(player, teamId)` returns a stable status and semantic
  reason for injuries, loans, academy players, retirement, or registration.
- `matchSelectionView(teamId, raw)` resolves A/B/C/R1/R2 slot-for-slot. An
  unavailable previous player remains visible in the same slot with a reason;
  later slots never compact.
- `validateMatchSelection(teamId, raw)` is the authority for whether the current
  ordered selection can start a match.

Call `gameplay.matchNominationRules()` for the current country protocol.

| Field | Meaning |
|---|---|
| `requiredBase` | Number of healthy senior players required to play (currently 3 everywhere) |
| `maxReserves` | Two travelling slots, R1 and R2, in every country |
| `recommendedTotal` | Five selected players in every country |
| `reservesUsedInMatch` | Whether this protocol can actually field a reserve |

Selection fills every available slot up to five: five or more healthy seniors
require 3+2, four require 3+1, three require A/B/C, and fewer than three cannot
play. R1/R2 remain mandatory travelling slots when available even in protocols
that do not substitute them during a rubber.

`lastMatchSelection` stores the manager's last confirmed order. Reopening the
modal restores that exact order; only the explicit **Best lineup** action may
rebuild it by OVR. A Cup consumes only its one-shot `matchNomination` copy, not
the persistent order used by the following league match.

## Sparring

Call `gameplay.getSparringProfile(teamId)`.

- `partnerCount`: healthy academy players plus healthy seniors outside A/B/C.
- `averageOvr`: their current average quality.
- `mentorCount`: healthy players with the Mentor trait.
- `styles`: styles reproducible in training.
- `developmentMultiplier` / `developmentBonusPct`: the exact value used by
  seasonal player growth, not an estimate.

R1/R2 are sparring partners because they are outside the base three. An injured
or loaned-out player is excluded until available again. Six partners fill the
depth part of the calculation; further depth remains useful as roster cover but
does not keep inflating growth. All seniors use the normal senior development
path; academy players retain their academy development path.

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

