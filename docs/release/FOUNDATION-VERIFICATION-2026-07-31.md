# Foundation verification — 2026-07-31

Branch: `foundation/world-systems`

## Delivered

- Shared 0–100 OVR semantics and five-slot current/peak star contract.
- Credible staff distributions and league-aware employed staff quality.
- Organic staff and free-agent populations with lifecycle and emergency caps.
- One-time migration of legacy physiotherapist ratings.
- Protocol-aware nominations and stale-matchday nomination protection.
- Exported sparring development and opponent-style preparation contracts.
- Configurable auto-season engine with fixed/rotating squads, match limit,
  two-second default result pace, selective stops and recorded stop reason.
- Playing-time requests based on real neglect, form and cooldowns.
- Infrastructure levels 0–7, shared operating upkeep and strategy-led AI
  investment rather than universal late-game maxing.

## Verification evidence

- `npm run check`: PASS.
- `npm test`: 258/258 PASS after the infrastructure package.
- `npm run test:full`: **290/290 PASS**, including supplied real saves S4, S8
  and S11, slow AI/offseason tests, save durability and deterministic replay.
- `npm run test:soak`: **30 seasons PASS**, world invariants plus save/validate/
  load after every season.
  - players 374 → 358;
  - free agents S30: 89 (not a fixed 120);
  - staff 93 → 88, candidates S30: 166;
  - player-history rows 645 → 1285 (bounded pruning);
  - save 1.873 MB → 3.080 MB;
  - 20-entry Hall of Fame retained.
- Infrastructure distribution measurement at S30: 13/23 AI clubs owned at
  least one level-6 project; 1/23 owned a level-7 project. Before the strategy
  correction, 23/23 reached an elite level.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm run dist:win`: PASS; portable Windows executable built successfully.
  - size: 84,232,375 bytes (80.3 MB);
  - SHA-256: `885BE90F13C4AF94C785241780FEBC27738C777B0D70192D448C708AF0049991`.

The generated `dist/` directory is intentionally Git-ignored; source and build
configuration are pushed, not the binary.

## Required before selling the game

These are not failures of this foundation branch, but the game is not a release
candidate until they are handled:

1. Integrate and verify Fable's UI/localisation work against the contracts in
   `docs/design/`.
2. Replace the default Electron application icon and complete product branding.
3. Finish an English-only end-to-end playthrough; legacy infrastructure strings
   still bypass i18n until the UI pass moves them to translation keys.
4. Add/store-test Steamworks integration if Steam is the chosen channel,
   including achievements/cloud/workshop decisions. Workshop database sharing
   does not exist yet.
5. Create a signed release candidate, clean-machine smoke test, store assets,
   legal/support text, crash-reporting decision and a small external beta.

## Integration note

This branch is intentionally not merged into `merge/long-career` while Fable is
working separately. Integrate by merging the branch tip, not by cherry-picking
individual implementation commits, then rerun `npm run test:full` and a Windows
build on the combined tree.

