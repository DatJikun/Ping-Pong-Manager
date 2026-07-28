# Continuous Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically run the correct test gate for every pushed change and periodically run the complete suite without using AI APIs.

**Architecture:** Add one read-only GitHub Actions workflow with two independent jobs. The fast job gates pushes and pull requests; the full job runs weekly or through the manual workflow button.

**Tech Stack:** GitHub Actions, Node.js 22 LTS, npm scripts already defined in `package.json`.

## Global Constraints

- Use only GitHub-maintained `actions/checkout` and `actions/setup-node`.
- Grant workflow contents read permission only.
- Do not install dependencies because the repository currently has none.
- Cancel obsolete runs for the same branch or pull request.
- Limit each job to 10 minutes.

---

### Task 1: Add the GitHub Actions test gates

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run check`, `npm test`, and `npm run test:full` from `package.json`.
- Produces: GitHub checks named `Fast checks` and `Full suite`.

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
  schedule:
    - cron: "17 3 * * 1"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  fast:
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    name: Fast checks
    runs-on: windows-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm run check
      - run: npm test

  full:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    name: Full suite
    runs-on: windows-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm run check
      - run: npm run test:full
```

- [ ] **Step 2: Check the workflow diff**

Run: `git diff --check && git diff -- .github/workflows/ci.yml`

Expected: no whitespace errors; triggers and commands match the approved design.

- [ ] **Step 3: Run the fast gate locally**

Run: `npm run check && npm test`

Expected: syntax check and all non-slow tests pass.

- [ ] **Step 4: Run the full gate locally**

Run: `npm run test:full`

Expected: every test passes, including tests whose names begin with `[slow]`.

- [ ] **Step 5: Commit the workflow**

```powershell
git add -- .github/workflows/ci.yml
git commit -m "Add automatic GitHub test gates"
```

- [ ] **Step 6: Push and confirm GitHub accepted the workflow**

Run: `git push origin master`

Expected: the push succeeds and the public GitHub Actions API reports a completed
successful `CI` run for the pushed commit.

