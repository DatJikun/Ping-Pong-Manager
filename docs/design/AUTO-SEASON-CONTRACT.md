# Auto-season contract for Fable

Fable owns the setup screen. Core gameplay owns validation, squad selection,
simulation, consequences and stop reasons.

## Read and save

- `gameplay.getAutoSeasonConfig()` returns a complete normalized configuration.
- `gameplay.setAutoSeasonConfig(config)` validates, persists and returns it.
- After saving, call `gameplay.autoPlaySeason()` to start. Calling it while the
  run is active stops it.

## Configuration shape

```js
{
  lineupMode: 'best' | 'fixed' | 'rotation',
  basePlayerIds: [],
  reservePlayerIds: [],
  matchLimit: 0,       // 0 = until another stop or season end; max 22
  paceMs: 2000,        // clamped to 250..5000
  stopOn: {
    injury: true,
    cup: false,
    playerRequest: false,
    otherDecision: true,
    selectedUnavailable: true
  }
}
```

`fixed` preserves the chosen base order. `rotation` treats selected base and
reserve IDs as one rotation pool and weighs OVR, fatigue and current form.
`best` uses the normal automatic nomination. Every mode still obeys the active
country protocol, so China/Japan do not gain fictional reserve slots.

## Mandatory stops

These are safety/game-structure stops, not toggles:

- fewer than three healthy senior players;
- Top 12 Masters (entrant must still be chosen);
- season end;
- a matchday failing to commit.

## Decisions

When `playerRequest` is false, reserve requests are explicitly declined and the
normal morale consequence applies. When true, auto-season stops and leaves the
mail unanswered. Unknown decision types stop by default through
`otherDecision: true`.

## Result/status

The last exit is persisted as `store.G.autoSeasonLastStop`:

```js
{ code, matchesPlayed, season, matchday, playerIds?, mailId? }
```

Codes currently include `matchLimit`, `injury`, `cup`, `top12`,
`playerRequest`, `otherDecision`, `selectedUnavailable`,
`insufficientPlayers`, `matchdayBlocked`, `seasonEnd`, and `user`.

The default 2000 ms pause happens after the result is committed and shown. It
does not use a second simulation path.

