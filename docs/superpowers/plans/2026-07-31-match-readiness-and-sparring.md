# Match Readiness and Sparring Foundation

## Goal

Make squad nominations safe for every league protocol and turn reserves from an
unclear roster label into a small, understandable sporting advantage. This plan
changes simulation contracts only. Fable owns the presentation.

## Design decisions

- Every current protocol requires exactly three healthy senior base players.
- Superliga permits up to two optional reserves and recommends a five-player
  match squad. Olympic and T.League protocols do not use reserve slots.
- A team never forfeits merely because it has no reserve. The simulator already
  has a complete legal schedule for three players in every protocol.
- Existing bench/academy development value remains, but its calculation becomes
  one exported source of truth.
- Style preparation is deliberately small: useful for close matches, never
  enough to erase a meaningful quality gap. It comes only from healthy reserve
  or academy sparring partners who reproduce styles expected from the opponent.

## Tasks

### 1. Protocol-aware nomination contract

Write behavioral tests for every country and add `matchNominationRules` with:
`protocol`, `requiredBase`, `maxReserves`, `recommendedTotal`, and
`reservesUsedInMatch`. Refactor automatic nomination and slot capacity to use
that contract.

### 2. One-match nomination safety

Write a regression test proving a nomination from a previous matchday is
ignored. Require both season and matchday to match before consuming a saved
nomination. Preserve the existing safe automatic fallback.

### 3. Sparring data contract

Write tests first, then extract the current development calculation into
`getSparringProfile(teamId)`. Return reserve count, average quality, mentor
count, represented styles, development multiplier, and bonus percentage. Make
seasonal growth consume this same function so UI data and simulation cannot
drift.

### 4. Opponent-style preparation

Write deterministic behavior tests. Add `getMatchPreparation(teamId,
opponentTeamId)` based on healthy reserve/academy styles and the opponent's
likely base three. Cap the effective rating lift at 1.2 points. Apply it equally
to attack, defense, serve and mentality inputs in team matches only. Include the
profile in the match result so future UI can explain it.

### 5. Verification and handoff

Run focused tests red/green, then the complete check and suite. Add a concise
data contract for Fable and a conversation entry. Commit and push this package
as an independently reviewable unit.

