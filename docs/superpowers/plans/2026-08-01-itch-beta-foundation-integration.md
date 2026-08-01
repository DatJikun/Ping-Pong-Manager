# Itch Beta Foundation Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Połączyć zatwierdzony pakiet `foundation/world-systems` z kandydatem bety i zbalansować wpływ fizjoterapeutów zgodnie z decyzją właściciela.

**Architecture:** Gotowa gałąź zostanie scalona jako całość, aby zachować wspólnie przetestowane kontrakty świata. Wpływ fizjoterapeuty zostanie skupiony w jednym profilu efektów, używanym przez zmęczenie i kontuzje, z ograniczeniem łącznego skracania rehabilitacji przez sztab i infrastrukturę.

**Tech Stack:** JavaScript, Node.js test runner, Git.

## Global Constraints

- Wolni agenci pozostają naturalną populacją wynikającą z ruchu zawodników; awaryjny limit nie jest celem rynku.
- Mecz wymaga trzech zdrowych seniorów; do dwóch rezerw pozostaje rekomendacją, a nie obowiązkiem.
- Fizjoterapeuta 50 OVR ma być odczuwalny, a 90 OVR elitarny, lecz nie może usuwać kontuzji z gry.
- Łączna redukcja czasu kontuzji z fizjoterapeuty i centrum medycznego nie może przekroczyć 80%.
- Żadna zmiana nie może osierocić istniejących zapisów ani zmienić tożsamości sztabu.

---

### Task 1: Merge the approved world foundation

**Files:**
- Merge: branch `foundation/world-systems`
- Verify: `src/core/gameplay.js`, `src/core/state.js`, `src/data/constants.js`, `tests/*.test.js`

**Interfaces:**
- Consumes: verified branch tip `11789c7` and current beta base `0e3f3e8`.
- Produces: one combined beta branch containing organic markets, shared staff ratings, match readiness, auto-season, player-request cadence, and infrastructure levels 0–7.

- [x] **Step 1: Merge the branch tip without cherry-picking**

Run `git merge --no-ff foundation/world-systems` and inspect every conflict before resolving it. Preserve the newer beta-report and project Codex configuration from the destination branch.

- [x] **Step 2: Run syntax checks**

Run `npm run check`. Expected: `syntax OK` and exit code 0.

- [x] **Step 3: Run the focused foundation suite**

Run `node --test tests/world-foundation.test.js tests/match-readiness.test.js tests/auto-season-config.test.js tests/infrastructure-progression.test.js tests/player-request-cadence.test.js`. Expected: all tests pass.

### Task 2: Bound physiotherapist effects

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `tests/world-foundation.test.js`
- Modify: `docs/design/RATING-AND-POPULATION-CONTRACT.md`

**Interfaces:**
- Consumes: `getTeamPhysio(teamId)`, staff fields `recovery`, `prevention`, `injReduction`, and medical-centre `injBonus`.
- Produces: `physioEffectProfile(teamId)` returning `fatigueGainMultiplier`, `restBonus`, `injuryChanceReduction`, and `injuryDurationReduction`.

- [x] **Step 1: Add failing behavior tests**

Add tests proving that no physio returns neutral effects; an ordinary 50/50/50 physio yields approximately 8% lower fatigue gain, +4 rest, 13% injury prevention and 17% shorter rehabilitation; an elite 90/90/90 physio yields approximately 15%, +7, 24% and 30%; effects are monotonic and remain below their caps.

- [x] **Step 2: Verify RED**

Run `node --test tests/world-foundation.test.js`. Expected: failure because `physioEffectProfile` is not exported.

- [x] **Step 3: Implement the shared profile**

Use role attributes as ratings rather than literal percentages:

```js
fatigueReduction = 0.02 + 0.15 * Math.pow(recovery / 100, 1.4)
restBonus = Math.round(0.5 + 7 * recovery / 100)
injuryChanceReduction = 0.03 + 0.24 * Math.pow(prevention / 100, 1.3)
injuryDurationReduction = 0.05 + 0.28 * Math.pow(injReduction / 100, 1.2)
```

Return neutral values when the club has no active physiotherapist. Make `physioFatigueMult` and `physioRestBonus` consume the shared profile.

- [x] **Step 4: Bound combined rehabilitation**

In `tryInjuriesForTeam`, consume the profile and calculate the combined duration reduction as `Math.min(0.80, 1 - (1 - medBonus) * (1 - injuryDurationReduction))`. Use `injuryChanceReduction` instead of dividing the raw `prevention` attribute by 100.

- [x] **Step 5: Verify GREEN and update the contract**

Run the focused foundation suite from Task 1. Document the effect ranges and the 80% combined rehabilitation cap in `RATING-AND-POPULATION-CONTRACT.md`.

- [x] **Step 6: Commit the integration package**

Run `git diff --check`, stage the gameplay, test, contract and plan changes, then commit with `fix: balance physiotherapist effects for beta`.

### Task 3: Establish the combined baseline

**Files:**
- Verify only: combined repository tree.

**Interfaces:**
- Consumes: merged foundation and bounded physiotherapist effects.
- Produces: trusted baseline for reproducing the six external beta reports.

- [ ] **Step 1: Run the normal suite**

Run `npm test`. Expected: all non-slow tests pass.

- [ ] **Step 2: Record exact combined state**

Record the passing count and current commit in the next beta-bug plan. Do not diagnose reported UI symptoms against the pre-merge tree.
