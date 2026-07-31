# Rating and population contract

Status: implemented simulation contract for UI consumers.

## Rating profile

UI must consume `window.PPM.gameplay.ratingProfile(currentOvr, peakOvr)` instead of defining another OVR-to-stars formula.

The function returns:

```js
{
  currentOvr: Number,   // clamped 0..100
  peakOvr: Number,      // clamped 0..100, never below currentOvr
  currentStars: Number, // currentOvr / 20
  peakStars: Number,    // peakOvr / 20
  slots: 5,
}
```

Examples:

| Current / peak | Current fill | Potential reach | Meaning |
|---|---:|---:|---|
| 20 / 100 | 1.0 | 5.0 | one filled star, four potential outlines |
| 46 / 58 | 2.3 | 2.9 | two full stars plus partial current/peak progress |
| 82 / 86 | 4.1 | 4.3 | established elite with limited remaining upside |

Fable owns the drawing. The intended five-slot grammar is:

- filled gold area: `currentStars`;
- gold outline may extend only from current quality to `peakStars`;
- unused slots beyond peak remain neutral;
- never render current stars and potential as two additive rows or six total stars.

For players, pass `ovr(player)` or `ovrBase(player)` according to the screen and `playerCeiling(player)` as peak. Market/list comparison should use one choice consistently. For staff, pass `staffOvr(staff)` and `staffCeiling(staff)`.

## Shared staff meaning

Coach, physiotherapist, psychologist, and scout generation now use one 0–100 competence language. Different professions still have different attributes and effects, but equal OVR represents comparable professional calibre:

- below 35: weak/entry-level;
- 40–59: ordinary professional;
- 60–74: strong;
- 75–84: elite;
- 85+: exceptional.

Fresh first-division clubs receive broadly stronger staff than second-division clubs, with overlapping distributions and occasional weaker hires. UI should not label OVR as a guaranteed outcome or tier.

Legacy physiotherapists are rebased once by save schema 22. IDs, club, contracts, and tenure history remain stable.

## Population is a snapshot, not a quota

Do not present a market count as a supported maximum or promised minimum.

Free-agent supply comes from releases, expired deals, graduates, retirement-linked external intake, AI recruitment, and natural departure after unemployment. A deterministic seasonal wave creates scarce and abundant years. A 10-season PL soak produced free-agent counts from 65 to 113 instead of the old exact 120.

`freeAgentMarketPolicy(...)` exposes diagnostics (`externalIntake`, `softTarget`, `emergencyCap`), but `softTarget` is pressure, not a hard trim point. The UI normally needs only the actual list/count.

Staff markets also rotate. `staffMarketPolicy(...)` exposes `floor`, `intakeTarget`, and `hardCap` for tests/diagnostics. Each role has its own seasonal intake. Candidates age and may leave after prolonged unemployment. UI must not describe those values as fixed vacancies or caps.

## Ownership boundary

Codex owns rating/population rules, save migration, and long-career stability. Fable owns visual stars, market presentation, team comparisons, and all explanatory copy. If UI needs another derived value, add it to the simulation contract rather than duplicating the formula in `pages.js`.

