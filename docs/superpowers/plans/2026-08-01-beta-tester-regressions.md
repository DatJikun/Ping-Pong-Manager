# Beta Tester Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usunąć sześć odtworzonych problemów zgłoszonych przez zewnętrznego beta testera na połączonej wersji gry.

**Architecture:** Poprawki zostaną wykonane przy źródłach danych: partner i wiadomości przez semantyczne resolvery, historia wstępna przez granicę przejęcia klubu i migrację starych decyzji, licznik przez rzeczywistą długość spotkania, zmęczenie przez czystą funkcję regeneracji, a dane infrastruktury przez istniejącą granicę `gameDataText`.

**Tech Stack:** JavaScript, Node.js test runner, save-schema migration, i18n dictionaries.

## Global Constraints

- Zachować zgodność istniejących karier; stare nieodpowiedziane decyzje z minionych sezonów nie mogą blokować aktualnego sezonu.
- Nowy menedżer otrzymuje tylko wiadomość powitalną z sezonu przejęcia, nie korespondencję caretakerów.
- Regeneracja między sezonami wynosi `round(max(0, fatigue - 30) * 0.20)`, czyli maksymalnie 14 przy wejściu z 100.
- Wszystkie liczniki spotkania wynikają z rzeczywistego protokołu, nie ze stałej `4`.
- Angielski interfejs nie może wyświetlać polskich nazw/opisów infrastruktury ani `undefined`.

---

### Task 1: Dashboard partner and semantic messages

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/ui/pages.js`
- Modify: `tests/pages-render.test.js`

**Interfaces:**
- Consumes: `store.G.techPartnership`, `getTechPartnership()`, news entries `{msgKey,msgParams}`.
- Produces: `getActiveBrand()` resolving the selected technical partner and one shared `newsText(entry)` presentation helper.

- [x] Add a failing dashboard test with `tp_national` and semantic news; require `PulseForge Performance`, translated news copy and zero `undefined`.
- [x] Run the focused test and verify RED.
- [x] Make `getActiveBrand()` delegate to `getTechPartnership()` and use `newsText` in both dashboard and archive.
- [x] Run the focused test and verify GREEN.

### Task 2: Background-career inbox boundary

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/core/state.js`
- Modify: `tests/prehistory.test.js`
- Modify: `tests/save-migration.test.js`

**Interfaces:**
- Consumes: `simulateBackgroundSeasons`, `generateInboxForMatchday`, save migration and `store.G.inbox`.
- Produces: no caretaker mail without a player club; clean handover inbox; migration removing unanswered decisions older than `game.season`.

- [x] Add failing tests proving a five-season handover contains only current-season welcome mail and migration drops an unanswered past-season decision while preserving a current decision.
- [x] Run both focused tests and verify RED.
- [x] Skip inbox generation when `myTeamId` is null, clear caretaker inbox at handover, and add the bounded migration cleanup.
- [x] Bump `SAVE_SCHEMA_VERSION` once and run focused tests GREEN.

### Task 3: Protocol-aware match counter

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/match-ui.test.js` if present, otherwise the existing match-presentation test file.

**Interfaces:**
- Consumes: `renderVME(..., matchups, currentIdx, ...)`.
- Produces: `vme.matchIndex` with `total: matchups.length`.

- [x] Add a failing render test requiring the fifth duel to display `MATCH 5/5`.
- [x] Verify RED, replace the hardcoded total, and verify GREEN.

### Task 4: Offseason recovery

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/match-readiness.test.js`

**Interfaces:**
- Consumes: previous player fatigue 0–100 at `endSeason()`.
- Produces: `offseasonFatigue(fatigue)` implementing `round(max(0, fatigue - 30) * 0.20)`.

- [x] Add a failing test for `0→0`, `30→0`, `70→8`, `90→12`, `100→14`.
- [x] Verify RED, implement/export the helper, use it in season rollover, and verify GREEN.

### Task 5: Complete English infrastructure presentation

**Files:**
- Modify: `src/i18n/i18n.js`
- Modify: `src/ui/pages.js`
- Modify: `tests/i18n.test.js`

**Interfaces:**
- Consumes: `gameDataText(group,index,field,fallback)` and infrastructure tables with levels 0–7.
- Produces: English rows 6–7 for hall, medical, academy and merchandise plus translated academy/preseason consumers.

- [x] Add failing English UI tests for academy level 0, venue name and all four level-7 descriptions.
- [x] Verify RED.
- [x] Extend `englishGameData` to eight rows per facility and replace direct `.name`/`.desc` reads in squad/preseason with `gameDataText`.
- [x] Verify GREEN and scan completed English screens for Polish regression markers.

### Task 6: Regression package verification

**Files:**
- Modify: `docs/playtests/2026-08-01-beta-tester-report.md`
- Modify: this plan checklist.

**Interfaces:**
- Consumes: five implementation tasks covering all six reports.
- Produces: evidence-backed closed statuses and a trusted beta-candidate tree.

- [x] Run `npm run check`.
- [x] Run all focused regression tests.
- [x] Run `npm test` and require zero failures.
- [x] Update the beta report with root cause and test evidence, then commit the package.
