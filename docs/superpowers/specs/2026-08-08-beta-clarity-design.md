# Beta Clarity Design

## Goal

Make the National Cup, sponsors, loans, and remembered match squad explain their state truthfully without adding unnecessary management or breaking old careers.

## National Cup

Use one shared read-only `getCupClubStatus(teamId)` helper derived from the existing bracket. It returns the club's state (`waiting`, `due`, `alive`, `eliminated`, or `champion`), next trigger, current path, opponent/result that caused elimination, and relevant round label. No new cup save fields are required.

Move the existing prize values into one shared constant: winner EUR 35,000, finalist EUR 18,000, semifinalist EUR 9,000, quarter-finalist EUR 4,500. The Cup screen explains the 32-team single-elimination format, rounds after league matchdays 4/8/12/16/20, prizes, next condition, and the player's path. The dashboard uses the same helper, stops advertising future rounds after elimination, and explicitly shows elimination or victory.

## Sponsors

Replace the root-by-sector Cartesian products with explicit fictional brand pools of at least 48 unique names per country. Names may be locally styled, while all UI descriptions remain localized through semantic keys. Preserve `COUNTRY_SPONSORS` as arrays so generation, official-save debranding, and custom databases keep their current interfaces.

Sponsor tiers become semantic IDs: `local`, `regional`, `national`, `premium`, and `elite`. Schema migration maps historic Polish/English labels to those IDs. UI renders `sponsor.tier.<id>` instead of saved raw text. Tests reject the old repeated root-sector pattern and raw Polish tier labels in English screens.

## Loan safety

`doLoanOut()` must call `canLoanOut()` immediately before mutating state. This closes stale-modal and direct-call bypasses, including the last contract year, injuries, new signings, already active loans, and minimum squad size. A rejected mutation shows the same reason as the modal and leaves the player and loans unchanged.

## Remembered match squad

Advance the save schema to 26. Normalize the remembered 3+2 selection positionally: invalid or duplicate values become `null` in their original slots rather than compressing later players forward. Unknown finite IDs remain in place long enough to explain that the former player is no longer in the career.

Add a compact `lastMatchSelectionSnapshots` structure aligned with the five slots, storing only `{id,name}`. It is refreshed when the manager confirms a squad and immediately before pruning a referenced retired player. `matchSelectionView()` uses it only when the live player object is gone, returning a visible `missing` reason and previous name without making the snapshot clickable or treating it as eligible. Selecting a replacement overwrites that slot and its snapshot. This preserves player identity without retaining retired player objects or their history.

Schema-25 saves build snapshots from any referenced live players and preserve unknown IDs positionally. Older saves still use the existing role-to-squad migration first, then receive positional normalization and snapshots.

## Deferred Stage 4 copy cleanup

Correct the carried equipment-contract sentence in English and Polish: the deal continues, and replacing it requires paid termination through Club. Remove the remaining dead legacy rubber/action/modifier translation keys while preserving dictionary parity.

## Verification

- Cup states: before first round, due now, advanced, eliminated, champion, exact rewards, dashboard and Cup page in EN/PL.
- Sponsors: six pools with at least 48 unique names, low repeated-token rate, no old Cartesian examples, semantic tiers through migration and EN/PL rendering.
- Loans: direct mutator cannot bypass every `canLoanOut()` rejection, especially final contract year.
- Selection: retirement, prune, save/reload keeps the original slot/name and visible missing reason; replacement clears it; schema-25 positional migration does not shift survivors.
- Focused syntax/tests after each task, then Stage 5 integration tests and a multi-season soak.
