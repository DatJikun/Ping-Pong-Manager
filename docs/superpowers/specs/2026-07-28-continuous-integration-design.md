# Continuous integration foundation

Date: 2026-07-28

Status: owner approved

## Goal

Every pushed code change is checked automatically without using Codex, Claude or
any AI API. A broken syntax check or regression test must be visible on GitHub
before the change is treated as safe.

## Workflow

One GitHub Actions workflow will use the current Node.js LTS release on Windows:

- every push to `master` and every pull request runs `npm run check` followed by
  the fast `npm test` suite;
- a scheduled weekly run and a manual GitHub button run `npm run check` followed
  by the complete `npm run test:full` suite;
- jobs have explicit timeouts and minimal read-only repository permissions;
- concurrent runs for an obsolete commit are cancelled when a newer commit is
  pushed to the same branch.

The fast gate gives feedback in seconds. Slow deterministic career tests remain
automatic but do not delay every small iteration.

## Scope

This task adds only the GitHub workflow and documentation needed to understand
it. It does not add AI review, external services, deployments or release
publishing. Therefore future CI runs consume GitHub Actions compute time, not AI
tokens.

## Verification

- validate the workflow YAML locally;
- run the exact fast commands locally;
- run the complete suite once before merging;
- after pushing, confirm the first workflow run on GitHub is green.

