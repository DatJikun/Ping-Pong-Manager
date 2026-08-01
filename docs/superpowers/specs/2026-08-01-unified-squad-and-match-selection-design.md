# Unified Squad and Match Selection Design

## Goal

A club has one senior roster. Before every normal match the manager names an
ordered match squad of three base players and two reserves. Contract status may
describe a player's expected importance, but it never places that player in a
separate sporting team.

This design supersedes the earlier optional-reserve wording in
`docs/design/MATCH-READINESS-CONTRACT.md`. The real country protocols remain
unchanged; every country now carries a 3+2 match squad even when its protocol
does not substitute a reserve during the match.

## Considered approaches

### 1. One senior role plus persistent match selection (selected)

Every contracted first-team player uses `role: 'senior'`. A separate
`lastMatchSelection` stores five ordered IDs, while the existing one-shot
`matchNomination` locks the current match. Availability is resolved at the
moment the selection screen opens.

This is the only approach that removes the old team split from both gameplay
and UI while preserving the manager's last decision.

### 2. Hide starter/reserve tabs but keep the roles internally

This would be cheaper, but injuries, development, AI decisions, awards, and
default nominations would still treat the two groups differently. The visible
roster would promise one model while the simulation retained another.

### 3. Expand `boardOrder` into five permanent slots

This would mix long-term roster identity with a single match decision. It also
cannot explain an injured or loaned-out previous selection without silently
compacting the order. A dedicated match-selection record is clearer and safer.

## Data model and migration

The current save schema is bumped once. All non-academy player roles migrate
from `starter` or `reserve` to `senior`. Existing contractual expectations stay
in `preferredRole`/`promisedRole`; their player-facing labels become Key,
Rotation, and Development where appropriate.

The new save field is:

```js
lastMatchSelection: {
  base: [playerId, playerId, playerId],
  reserves: [playerId, playerId]
} | null
```

Migration seeds it in this order:

1. a current saved `matchNomination`, if present;
2. otherwise old starters by `boardOrder` and original storage order;
3. then old reserves in original storage order;
4. stop after five unique senior players.

The first three IDs become base slots and the next two reserve slots. IDs of
players who later leave are retained in `lastMatchSelection` until the manager
confirms a replacement, allowing the UI to explain the vacancy rather than
silently choosing another player.

Loading an already migrated save is idempotent. No player IDs, contracts,
loans, histories, or awards are rewritten.

## Roster boundaries

Core helpers separate three concepts:

- club senior roster: all active senior players currently registered at the
  club, plus the club's players who are visibly away on loan when presenting
  ownership;
- available match players: registered seniors who are healthy and not away;
- ordered match selection: three base slots followed by two reserve slots.

Borrowed-in players are available to the borrowing club. Loaned-out players are
shown as owned-but-unavailable to their parent club. Academy players remain in
the academy and are not selectable until promoted.

Team OVR, AI squad depth, transfer decisions, and emergency roster checks use
the best available seniors rather than a stored starter role.

## Match availability

One shared resolver returns a status and translated reason for every player on
the selection screen. At minimum it distinguishes:

- available;
- injured, including remaining rounds;
- loaned out, including destination club;
- academy player;
- retired;
- no longer registered at the club.

Unavailable players remain visible and cannot be selected. A previous slot
whose player is unavailable stays visibly vacant with that reason. The default
selection does not compact the remaining players or rebuild the five by OVR.

## Selection behavior

The modal always displays A, B, C, R1, and R2 in order.

- Opening the modal restores `lastMatchSelection` slot-for-slot.
- A first-ever selection starts from a deliberate best-five suggestion.
- Clicking an available player fills the first vacant slot; clicking a selected
  player vacates that exact slot.
- “Clear” empties the five slots.
- “Best lineup” explicitly chooses the five best available players by OVR,
  strongest first.
- Confirming writes both the one-shot `matchNomination` and the persistent
  `lastMatchSelection` without reordering IDs.

When five or more players are available, confirmation requires all five slots.
With four available it requires 3+1; with three it requires the base three. A
normal match never starts with fewer than three available seniors. Cup and
automated matches use the same eligibility rules; AI and “best” automation may
still choose by OVR.

For protocols without substitutions, R1/R2 travel with the match squad but do
not enter the fixed protocol. The UI explains this rather than removing their
slots.

## One-roster UI

The squad screen has one `Squad` tab for all senior players, plus the existing
Academy and Loans areas. The First Team and Reserves tabs, promotion/demotion
buttons, and permanent board arrows disappear.

Senior cards show:

- match-selection status (A/B/C/R1/R2 or outside the last squad);
- contract expectation (Key/Rotation/Development);
- injury or loan status;
- the existing condition, contract, attributes, and actions.

The dashboard shows the last selected five in order, using the best-five
suggestion only when the player has never confirmed a lineup. It never labels a
permanent “main squad”.

## Gameplay systems formerly tied to roles

- All healthy seniors train normally; academy players retain their academy
  development path.
- Healthy roster depth outside the base three contributes to sparring and style
  preparation. There is no reserve-team membership requirement.
- Playing-time requests depend on real recent appearances, form, cooldowns, and
  contract expectation rather than `role === 'reserve'`.
- Post-match injury rolls target players who actually appeared in the result,
  not a permanent starter group.
- League and cup squad awards include the active senior squad instead of only
  players carrying an old starter flag.
- AI clubs rank their seniors by OVR for match selection, loans, transfers, and
  minimum depth without writing permanent starter/reserve roles.

## Failure behavior

- Duplicate IDs in a saved selection are ignored after the first occurrence.
- Unknown or malformed IDs become vacant slots.
- A stale one-shot nomination still expires after one matchday.
- If a selected player becomes unavailable between confirmation and simulation,
  the match is blocked for the player club and the modal reopens with the reason;
  the engine does not silently replace the whole selection.
- AI clubs retain the existing forfeit safety when they cannot field three.

## Verification

Focused tests prove:

1. legacy starter/reserve saves migrate to one senior roster and preserve order;
2. migration is idempotent and leaves identity, contracts, loans, and history;
3. a manually confirmed five is restored exactly before the next match;
4. injury or loan of one saved player leaves that slot vacant and visible;
5. “Best lineup” is the only OVR-based manual rebuild;
6. five available players require 3+2, while genuine shortages allow 3+1 or 3;
7. all country protocols expose five squad slots without changing their match
   schedule;
8. playing-time requests, sparring, injuries, awards, transfers, and AI depth no
   longer depend on `starter`/`reserve` roles;
9. the one-roster squad page and nomination modal render in English and Polish;
10. a migrated career can play a full season and save/reload cleanly.

After focused tests, the stage runs syntax checks, the normal suite, and the
relevant slow manual-match and migration/career tests.

## Out of scope

- Changing country match protocols or substitution timing.
- Rebalancing contract-expectation morale effects.
- Redesigning academy progression.
- Changing the number of contracted players a club may own.
