# League Integrity Design

## Goal

Every part of Ping Pong Manager must resolve a league tie in exactly the same
way, so the table shown to the player is also the table used for titles,
promotion, relegation, objectives, prizes, history, prestige, and club income.

## Ranking contract

Teams in the same division are ranked by these descending criteria:

1. league table points (`pts`);
2. team-duel difference (`gf - ga`);
3. small-point difference (`pointsWon - pointsLost`);
4. small points scored (`pointsWon`);
5. deterministic club identity: numeric/string `id`, then `name`.

`gf` and `ga` are the main competitive balance because `applyResult()` records
the individual team duels won and lost there. `pointsWon` and `pointsLost`
record the lower-level points played inside those duels.

Missing legacy fields are read as zero. The ranking calculation does not write
to the save, add cached positions, or change the save schema.

## Shared boundary

`src/core/gameplay.js` owns two pure public helpers:

- `compareLeagueTeams(a, b)` implements the complete ranking contract;
- `leagueStandings(league)` returns the clubs in that division in that order.

All position-dependent engine and UI paths consume `leagueStandings()` instead
of defining local point-only sorting. This includes the dashboard and header,
league and club pages, matchday news, sponsor and board progress, attendance,
merchandise and TV calculations, PR-director lifecycle, season records,
championship awards, promotion/relegation, season prizes and history, and AI
club income.

Statistical leaderboards such as “most small points scored” remain statistical
leaderboards and do not become league-position consumers.

## Player-facing table

The league table continues to show league points and small points, and adds the
team-duel score/difference needed to explain why clubs tied on league points are
ordered differently. Promotion and relegation markers follow the same shared
order.

## Failure and compatibility behavior

- Null, malformed, or absent numeric counters contribute zero instead of
  producing `NaN`.
- IDs are compared deterministically across numeric and string legacy shapes;
  names are the final fallback.
- Existing saves need no migration because all required counters already exist
  and missing counters have safe defaults.
- The helper returns a fresh array, so rendering and calculations cannot reorder
  `store.G.teams` in place.

## Verification

A focused regression fixture creates tied clubs whose database order conflicts
with every successive tie-break. It proves the comparator hierarchy and then
proves that the rendered table, board/sponsor objective, championship award,
promotion/relegation, season-history position, and position-based financial
calculation all select the same order.

The focused league, page-render, sponsor, economy, and club-history tests run
after the change, followed by the normal fast test suite for the completed
stage.

## Out of scope

- Head-to-head mini-tables are not introduced.
- League scoring formats are unchanged.
- Historical season rows are not retroactively re-ranked.
- Other competition rankings and statistical leaderboards are unchanged.
