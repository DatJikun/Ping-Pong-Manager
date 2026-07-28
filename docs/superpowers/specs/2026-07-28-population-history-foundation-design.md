# Population and history foundation

Date: 2026-07-28

Status: owner approved

## Goal

Long careers keep a rich statistical history without retaining dead player or
staff objects. The active world remains bounded and future season/lifetime
comparisons can be built without another save-format rewrite.

## Population lifecycle

- Retired players are removed from `players`.
- Only the best 20 lightweight retired-career summaries remain in `hallOfFame`.
- Free agents are ranked by current quality, upside and age. The pool is capped
  at five players per active club, with a floor of 60 (120 in the current world).
- A discarded free agent with a real playing career is evaluated for Hall of
  Fame; an unused generated player is deleted without creating historical noise.
- References and per-player history belonging to removed players are deleted.
- `staffHistory` remains only for staff who still exist in an active role or
  market pool.
- Cleanup runs at season end and immediately after loading a legacy save.

## Permanent club ledger

`clubHistory[clubId]` remains permanent for every active club. Each season row
stores only compact comparison data:

- season, league, position and matches played;
- table points, wins, draws and losses;
- team score for/against and individual points won/lost;
- squad OVR and budget;
- cup stage;
- three lightweight best-player performances: ID, name, age, OVR, wins, losses
  and points won/lost.

Old `seasonHistory[].teamsSnapshot` data is used once to enrich legacy
`clubHistory`, then removed because it duplicates the same league table.

Lifetime club statistics and the future top-20 club Hall of Fame are derived
from this ledger. They are not stored as a second growing history.

## Future comparison UI

The data layer will expose season and lifetime club aggregates. A later UI task
will compare active clubs and active players, switching between current-season
and lifetime views. This task does not redesign any screen.

## Verification

- focused tests cover free-agent capping, reference cleanup, Hall of Fame and
  staff-history cleanup;
- focused tests cover the complete club season row and lifetime aggregation;
- supplied legacy saves are loaded and measured before/after cleanup;
- a 25-season stress run records player count, free-agent count, compact save
  size and season time;
- fast tests, syntax checks and the full suite remain green.
