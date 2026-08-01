# Ping Pong Manager — Codex working rules

## Collaboration with the owner

The owner is a non-programmer and the project's primary playtester and product decision-maker. Translate technical choices into their gameplay and release consequences. Codex should make routine engineering decisions, present meaningful product tradeoffs, and ask the owner only when a choice materially changes the game or scope.

## Cost-aware model routing

Use the cheapest profile that can safely complete the work:

- `ppm_explorer` (Luna/max): code search, execution-path mapping, save/log inspection, untranslated strings, documentation lookup, and other narrow read-only evidence gathering.
- `ppm_worker` (Terra/high): normal implementation, focused bug fixes, tests, refactors with clear boundaries, and routine documentation changes.
- `ppm_senior` (Sol/high): architecture, save migrations, data integrity across seasons, difficult cross-system failures, and review of changes where a mistake could corrupt careers or foundations.

The primary project session uses Terra/high. Escalate to `ppm_senior` only when the risk warrants it; do not use Sol for searches, formatting, routine tests, or simple copy changes.

## Delegation limits

- Do not spawn an agent merely because one is available. Delegation must save meaningful primary-agent work or provide genuinely independent verification.
- Use no more than two subagents concurrently.
- Parallelize only independent tasks that do not need the same files or sequential discoveries.
- Only one agent may edit code at a time. Keep explorer and senior-review work read-only.
- Give every agent a narrow deliverable and enough local context to avoid rediscovering the whole project.
- Do not create heartbeat, keep-alive, or periodic token-cache automations.

## Engineering priorities

- Protect existing careers and save compatibility.
- Preserve unrelated changes in a dirty worktree.
- Prefer root-cause fixes and focused regression tests over broad rewrites.
- Match verification effort to risk: targeted checks for narrow changes; full tests and long-career soak tests for lifecycle, persistence, simulation, and migration work.
- Never claim a fix is complete without fresh verification evidence.
