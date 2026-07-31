# Auto-season engine

## Goal

Replace the current blind on/off fast-forward with a persistent, explainable
simulation policy. Fable will build the configuration screen; core gameplay will
own validation, selections, consequences, pacing and stop reasons.

## Contract

`setAutoSeasonConfig` accepts:

- `lineupMode`: `best`, `fixed`, or `rotation`;
- ordered `basePlayerIds` and `reservePlayerIds`;
- `matchLimit` (`0` means until another stop condition or season end);
- `paceMs` (safe range 250–5000, default 2000);
- `stopOn`: injury, Top 12, cup, player request, other decision, and selected
  player unavailable.

Unknown values are discarded, duplicate IDs are removed, and protocol reserve
limits still win over configuration.

## Implementation sequence

1. Write tests for normalization and persistence of the policy.
2. Write tests for fixed and fatigue-aware rotating nominations.
3. Write tests for selective decision handling. Ignored player requests are
   explicitly declined and keep their normal morale consequence; they do not
   silently disappear.
4. Write end-to-end tests for match limit and recorded stop reason.
5. Implement the loop using the same `runMatchday` path as manual play. Keep a
   result visible for `paceMs`; never duplicate match simulation.
6. Export a Fable-facing status/config contract and document it.
7. Run complete regression tests, commit and push the package.

## Safety rules

- Fewer than three healthy seniors always stops, regardless of settings.
- Season end always stops.
- A fixed selected player becoming unavailable stops by default; the manager may
  explicitly permit automatic replacement.
- The active runtime flag is not treated as durable career state after a reload.

