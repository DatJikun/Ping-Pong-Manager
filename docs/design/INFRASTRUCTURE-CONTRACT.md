# Infrastructure contract for Fable

Infrastructure now has levels 0–7. Never hardcode level 5 as maximum; use
`table.length - 1` for each of `INFRA_HALL`, `INFRA_MED`, `INFRA_ACADEMY`, and
`INFRA_MERCH`.

Every level exposes:

- `level`, `name`, `desc`, `cost`, `upkeep`;
- a type-specific effect (`trainingBonus`, `injBonus`, academy bands/dev bonus,
  or merchandising `income`).

Call `gameplay.facilityUpkeep(teamId)` for the exact yearly operating cost:

```js
{ hall, med, academy, merch, total }
```

Do not calculate upkeep in UI. The same function is charged to the player and AI
clubs. Levels 6–7 are intentionally expensive, late-game projects with smaller
incremental gains. Existing levels 0–5 retain their old construction prices.

The legacy `name`/`desc` strings mix old Polish source text with newer working
labels. The UI/localisation pass should route every label through i18n rather
than copying these strings into a new component.

