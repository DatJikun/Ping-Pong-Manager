# Infrastructure and long-career economy

## Measured baseline

- Existing complete infrastructure path costs about €1.30m.
- A conservative automated manager did not rush it, but reached academy level 5
  in season 16; strong human play can finish a chosen path materially earlier.
- AI averages by season 20 were hall 3.3, medicine 3.2, academy 4.2, merch 2.7.
- Existing player saves must keep their current levels and purchase history.

## Design

1. Preserve levels 0–5 and their build prices.
2. Add levels 6–7 as late-game projects with sharply rising capital cost and
   diminishing sporting returns. The full portfolio should cost roughly €4m,
   not €1.3m.
3. Add modest operating upkeep to hall, medicine and merchandising; academy
   already has upkeep. Early levels remain cheap to run, while a complete elite
   complex is a strategic commitment.
4. Use one `facilityUpkeep(teamId)` contract for the player and AI. Expose its
   breakdown for UI and tests.
5. Keep AI using the same build prices and upkeep. Its probability and treasury
   ceiling should make the new final levels exceptional, not universal.

## Test sequence

- RED: monotonic late-game progression, full-path cost, and upkeep contract.
- GREEN: constants and shared upkeep implementation.
- Regression: economy/unit suite and 20-season PL measurement.
- Long verification: 30-season soak including save/load identity and population
  invariants.

## Boundaries

Technical partnerships remain Fable's system. This package does not change their
bonuses, names or UI. It also does not retroactively charge build costs to old
saves.

