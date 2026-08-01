# Codex Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skonfigurować oszczędne, projektowe kierowanie zadań między Luna, Terra i Sol dla Ping Pong Managera.

**Architecture:** Repozytorium otrzyma własne ustawienia głównego modelu i limitu współbieżności. Trzy małe profile agentów rozdzielą zwiad, implementację i analizę wysokiego ryzyka, a `AGENTS.md` opisze zasady delegowania zrozumiałe dla kolejnych sesji.

**Tech Stack:** Codex project configuration (TOML), Markdown, Git.

## Global Constraints

- Ustawienia muszą działać wyłącznie w repozytorium Ping Pong Managera.
- Maksymalnie dwóch pomocniczych agentów może działać jednocześnie.
- Tylko jeden agent może edytować kod w tym samym czasie.
- Nie wolno tworzyć automatyzacji podtrzymujących sesje.
- Zmiana nie może modyfikować kodu ani balansu gry.

---

### Task 1: Project-scoped model routing

**Files:**
- Create: `.codex/config.toml`
- Create: `.codex/agents/ppm-explorer.toml`
- Create: `.codex/agents/ppm-worker.toml`
- Create: `.codex/agents/ppm-senior.toml`
- Create: `AGENTS.md`

**Interfaces:**
- Consumes: project-local Codex configuration precedence and custom-agent TOML schema.
- Produces: three named agents (`ppm_explorer`, `ppm_worker`, `ppm_senior`) and routing rules for future sessions.

- [x] **Step 1: Add project configuration**

Create `.codex/config.toml` with Terra/high as the primary model, Luna/max as the default subagent, multi-agent enabled, and a concurrency limit of two.

- [x] **Step 2: Add the read-only explorer profile**

Create `ppm_explorer` using Luna/max and `sandbox_mode = "read-only"`. Require concise, evidence-backed findings and prohibit edits.

- [x] **Step 3: Add the implementation profile**

Create `ppm_worker` using Terra/high. Require narrow changes, preservation of unrelated work, proportionate tests, and no architecture expansion.

- [x] **Step 4: Add the read-only senior profile**

Create `ppm_senior` using Sol/high and `sandbox_mode = "read-only"`. Limit its use to architecture, save migrations, cross-system failures, and high-risk review.

- [x] **Step 5: Add repository routing instructions**

Create `AGENTS.md` that selects the cheapest adequate profile, forbids redundant delegation, limits parallel work to independent tasks, and preserves the rule that the user provides product feedback while Codex makes technical decisions.

- [x] **Step 6: Validate configuration**

Parse every new TOML file with Python `tomllib`, verify the required agent fields and exact model/effort values, confirm the global Codex configuration has not changed, and inspect `git diff --check` plus `git diff --stat`.

- [x] **Step 7: Commit the isolated configuration change**

Stage only `.codex`, `AGENTS.md`, and the two design/plan documents, then commit with message `chore: add cost-aware Codex routing`.
