# Academy Player ID Integrity — design

Date: 2026-07-28

Status: approved in conversation

Owner: Codex implementation, Claude independent review/runtime verification

## Problem

Old saves created before `_pid` was persisted can reuse IDs already assigned to
existing entities. The concrete S8 failure is:

- `players` contains Kacper Adamski with ID `319`;
- `academyProspects` contains Łukasz Niedzielski with ID `319`;
- accepting Łukasz appends him to `players`;
- `openPlayerModal(319)` uses the first match in `players`, so it opens Kacper.

Runtime verification showed that the wrong profile is already visible before
acceptance: the academy card calls `openPlayerModal(p.id)`, but the modal resolver
searches only `players`. With a collision it opens the established player; with a
unique pending ID it finds nothing. Accepting a colliding candidate also assigns
`playerHistory[p.id]=[snap(p)]`, overwriting the established player's history.

The current migration repairs duplicates only within each individual array
because `repairIds()` creates a new `Set` for every call. It therefore misses a
collision between a live player and a pending academy candidate.

## Important data-model constraint

IDs are not globally unique across the whole save and must not be made globally
unique.

Intentional overlaps include:

- team IDs and player IDs use separate namespaces;
- `scoutResults[].reported` is a display copy of a real player and shares that
  player's ID;
- a hired scout can temporarily be represented in both `staff` and `scoutPool`.

Integrity must therefore be enforced per lookup domain and lifecycle, not by a
single global `Set` covering every object in the save.

## Scope

### In scope

- Preserve unique IDs within `players`.
- Make IDs in `academyProspects` and `academyTrial` disjoint from IDs already
  claimed by `players` and from one another.
- Keep the first player with a duplicated ID stable when repairing an already
  corrupted `players` array; assign fresh IDs to later duplicates.
- Add a runtime guard before an academy or trial candidate is appended to
  `players`.
- Resolve an academy/trial card to its exact pending collection and index so its
  profile opens correctly before acceptance.
- Prevent signing from overwriting the established player's `playerHistory`.
- Restore `ui._pid` above every ID minted by migration.
- Add regression tests based on a minimal, anonymized equivalent of the S8 save.
- Validate the migration locally against all seven supplied saves without
  committing those private multi-megabyte exports.

### Out of scope

- Global renumbering of teams, staff, scouts, sponsors or other entity types.
- Redesigning every legacy reference affected by historical duplicates already
  present inside `players`.
- Free-agent rotation, state-size reduction or balance changes.
- Replacing `localStorage`; that is the next persistence task.
- Committing the owner's private save files.

## Migration design

Migration keeps the existing deterministic policy for duplicate live players:
the first holder of an ID is canonical and later holders receive fresh IDs.
This is the least destructive rule for old saves because first-match lookups and
most operational references already resolve to the first holder.

After repairing `players`:

1. Build `claimedPlayerIds` from all current `players`.
2. Walk `academyProspects` in stored order.
3. Walk `academyTrial` in stored order.
4. If a pending candidate has a valid ID not in `claimedPlayerIds`, reserve it.
5. If its ID is missing, invalid or already claimed, assign `nextRepairId` and
   increment until an unused ID is found.
6. Add every accepted or reassigned pending ID to `claimedPlayerIds`.
7. Ensure the loaded `ui._pid` is greater than the highest ID after migration.

Fresh IDs come from a floor above `maxEntityId(game)`, so they cannot collide
with any existing numeric entity ID even though global uniqueness is not an
invariant.

Pending academy candidates do not yet own entries in `playerHistory` and are not
expected to appear in active player references such as `transferMarket`,
`loans`, `preSignedPlayers`, `matchNomination` or `top12Entrant`. Reassigning a
pending candidate is therefore safer than reassigning an established player.

## Runtime guard

Both `signAcademyProspect(idx)` and `signTrialProspect(idx)` must verify that the
candidate's ID is not already used by `store.G.players` immediately before
`players.push(p)`.

If a collision exists:

1. allocate a fresh ID using the live `ui._pid` counter, skipping any occupied
   player ID defensively;
2. append the candidate using the fresh ID;
3. initialize `playerHistory[freshId]` from the candidate snapshot;
4. preserve any scout result owned by the established player that held the
   colliding old ID. Existing cleanup may only use the candidate's safe final ID;
   it must never delete by the abandoned colliding ID.

The guard is defense in depth. Correctly migrated saves should normally reach
these functions with an already-safe ID.

## Pending profile resolution

Academy cards must not resolve pending candidates through the live-player
first-match lookup. The UI passes an explicit pending source
(`academyProspects` or `academyTrial`) and the rendered index to
`openPlayerModal`. The resolver accepts only these two allowlisted sources and
returns the candidate at that index when its ID still matches; all existing
player cards continue to use the normal `players.find(id)` path.

This makes the lookup unambiguous even if malformed runtime state reintroduces a
collision before the signing guard runs.

## Tests

### Required red-green regression tests

1. **Migration collision**
   - Given a live player with ID `319` and an academy prospect with ID `319`,
     loading the save keeps the live player's ID and assigns the prospect a new
     ID.
   - `ui._pid` ends above both IDs.

2. **Accepting migrated prospect**
   - After accepting the prospect, `players` remains unique.
   - Lookup by the prospect's new ID returns the prospect's name and object.
   - The original player remains available under ID `319`.
   - The prospect receives its own history entry.

3. **Trial collision**
   - `academyTrial` follows the same rule and cannot collide with `players` or an
     earlier academy prospect.

4. **Runtime defense**
   - Force a collision after migration but before signing.
   - Signing reassigns the pending candidate and does not create a duplicate in
     `players`.

5. **Intentional duplicates remain legal**
   - A scout report's `reported.id === realId` is not renumbered.
   - Team/player namespace overlap is not treated as corruption.

6. **Pending profile before acceptance**
   - Resolving the academy card returns the candidate, not the established
     player with the colliding ID.
   - The trial card follows the same explicit-source path.
   - Existing squad/market cards still resolve live players normally.

### Local save verification

For every supplied S4/S6/S7/S8/S11 export:

- migration completes without throwing;
- IDs inside `players` are unique;
- no `academyProspects` or `academyTrial` ID collides with `players` or another
  pending candidate;
- all active `transferMarket`, `preSignedPlayers` and `scoutResults.realId`
  references resolve to a live player;
- accepting each available academy candidate on an isolated loaded copy leaves
  unique `players` IDs and resolves the candidate by its own ID/name.

Returned loans and historical Hall-of-Fame/result references are not required to
resolve to a current live player.

## Runtime/UI acceptance

Claude performs independent verification after the implementation commit:

- reproduce the wrong-profile behavior on the unpatched S8 K0 save;
- load the patched game with S8 K0 and S11 K4;
- before acceptance, click every available academy and trial candidate card and
  confirm that its own profile opens;
- accept every available academy candidate on isolated copies;
- click each accepted player's card/profile;
- compare displayed name and ID with the accepted candidate;
- save, restart/reload, and repeat the profile check;
- report results and review findings in `CLAUDE-CODEX-CONVO.md`.

## Completion criteria

The task is complete only when:

- the new regression tests fail against the old implementation and pass against
  the fix;
- the full existing test suite and syntax check pass;
- all seven private saves pass the local domain-integrity validator;
- Claude's independent diff review and UI flow verification report no blocking
  issue;
- no balance constants or unrelated gameplay behavior changed.
