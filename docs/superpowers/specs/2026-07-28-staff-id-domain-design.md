# Staff lookup-domain ID repair

Date: 2026-07-28

Status: owner approved streamlined follow-up after academy ID fix

## Problem

Legacy `_pid` rewind created different staff people with the same ID across
collections searched by staff UI and negotiation code. Examples:

- S11 ID 305: employed scout Marcin Rosiński vs market coach Łukasz Duda;
- S11 ID 593: employed scout Wacław Wilk vs market scout Tomasz Rutkowski;
- S8: five equivalent collisions across `staff`, `staffPool`, `scoutPool` and
  `prDirectorPool`.

Different lookup orders then select different people for profile, feedback and
hiring actions.

## Design

- Employed `staff` is authoritative and keeps its ID.
- Unemployed candidates are processed in current market lookup order:
  `staffPool`, `scoutPool`, then `prDirectorPool`.
- A different person colliding with an already claimed ID receives a fresh ID
  above the save maximum.
- A `keptScouts` copy with the same ID and identity as its employed `staff`
  counterpart remains legal and unchanged.
- Identity comparison uses stable staff fields: name, type, age and nationality.
- No global ID invariant is introduced.
- Player IDs, teams, reports and balance are untouched.

## Tests and acceptance

- A synthetic S11-equivalent collision fails before the fix and passes after it.
- An employed person keeps the original ID; the market candidate remains
  addressable under a new ID.
- A legal employed-scout copy is not renumbered.
- Different candidates colliding across market pools become unambiguous.
- S8 and S11 have zero different-person collisions in the staff lookup domain
  after migration.
- `findStaffById(305)` and `findStaffById(593)` resolve the employed people in S11.
- Focused tests, syntax check and the full suite pass before commit.

## Separate follow-ups

Duplicate free-agent market rows and save-performance work remain separate tasks.
