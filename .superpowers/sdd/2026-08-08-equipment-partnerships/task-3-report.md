# Task 3 Report: Preseason and Club Contract UI

## Delivered

- Replaced the Club partner picker with one active-contract summary: profile, included rubber, style fit, exact rating modifiers, signed annual cashflow, remaining term, visible termination fee, and termination action.
- Clubs without a deal now direct the manager to preseason; no partner cards or signing controls render in Club, including after an in-season termination.
- Added preseason 1/2/3-season selectors that pass the selected term to `selectTechPartnership`, display the signed annual cashflow, and explain the term benefit.
- A carried contract marks the technical step complete and renders as a non-editable summary.
- Added stable profile/rubber ID translations in English and Polish, plus UI copy for all contract states.
- Made player equipment explanations distinguish personal blade/sponge modifiers from the partner-rubber modifiers.

## RED / GREEN evidence

RED:

`node --test tests/pages-render.test.js tests/i18n.test.js` failed as expected before implementation:

- Missing stable profile/rubber localization keys.
- Club still rendered the selectable technical-partner grid instead of a preseason-only empty state.

GREEN:

`node --test tests/pages-render.test.js tests/i18n.test.js tests/equipment-contracts.test.js`

- 63 passed, 0 failed.

`npm run check`

- `syntax OK`.

## Full-suite evidence

`npm test`

- 310 passed, 0 failed, 0 skipped by failure (slow tests excluded by the project command).

## Files changed

- `src/ui/pages.js`
- `src/i18n/i18n.js`
- `src/core/gameplay.js`
- `tests/pages-render.test.js`
- `tests/i18n.test.js`

## Self-review

- Confirmed the Club page has no `selectTechPartnership` controls and no legacy rubber UI.
- Confirmed preseason keeps offers and term selection only when there is no active contract; a carried contract has no replacement controls.
- Confirmed UI reads profile/rubber translations by stable IDs, not technical-partner array indexes.
- Confirmed termination fee uses the runtime `techContractBreakFee` helper and annual cashflow comes from the signed contract snapshot.
- Confirmed EN/PL dictionaries remain key-identical and that rendered contract markup contains no raw contract translation keys or `undefined`.
- Confirmed player-modal labels separate personal setup from partner rubber.
- `git diff --check` produced no whitespace errors.

## Concerns

None. The visible termination action continues to rely on the existing confirmation and insufficient-budget handling in `terminateTechPartnership`.
