# PingPong Manager release readiness audit (archived)

> This file records the audit performed on 2026-07-28. It is not the current
> release checklist. See `README.md`, `CHANGELOG.md`, `docs/DESKTOP-RELEASE.md`
> and `docs/releases/ITCH-BETA-17.0.0.md` for the shipped beta.

Last verified: 2026-07-28  
Evidence branch: `audit/release-readiness` at `88a21e4`

This was the release-facing snapshot when the audit was written. Later work
added localization, offline assets, Electron packaging, Windows branding and
release-grade save handling.

## Executive verdict

The simulation is a strong playable prototype, but the application is **not yet
safe to sell**. The current browser build has meaningful automated coverage,
working multi-career saves and no installed runtime packages. The blockers are
mostly productisation work around that core: unlicensed real-world names,
localisation, offline assets, a desktop distribution target and release-grade
failure handling.

Do not rewrite the engine or adopt a framework. The shortest route to a paid
Windows release is to preserve the tested vanilla simulation and place clean
boundaries around text, persistence and the desktop host.

## Evidence captured in this audit

- `npm run check`: PASS.
- `npm test`: 141/141 PASS on a clean worktree.
- Tracked repository: 311 files, approximately 1.63 MiB unpacked.
- Installed npm runtime dependencies: none.
- External runtime requests in `index.html`: Google Fonts (two hosts) and GSAP
  from cdnjs (one host).
- UI text is hard-coded across HTML and JavaScript. There is no `src/i18n`.
- No Tauri/Electron manifest, Windows icon, installer configuration or desktop
  build command exists.
- No project `LICENSE`, third-party notice file or bundled asset licence exists.
- The application has a real career library in IndexedDB, three rotating
  checkpoints per career, JSON import/export and schema migration. The old
  roadmap statement that there is one `localStorage` save is obsolete.
- The largest risk surfaces are `src/core/gameplay.js` (345 KB),
  `src/ui/pages.js` (132 KB), 213 inline UI event attributes and a broad global
  API. These are maintainability risks, not reasons for a rewrite before launch.

## Release blockers

### R0 — Real trademarks and real club identities

**Status: remediated in schema 21.** Every supported country now ships 24
fictional clubs and 60 fictional sponsors, all technical partners are fictional,
and the obsolete branded equipment catalogue was removed. Stable club IDs and
historical statistics survive migration; official save text is updated without
touching community/custom database names.

Keep `tests/fictional-default-data.test.js` as a release gate and extend its
deny-list if new official data is added. Community databases must remain outside
the official distribution.

### R0 — English is absent

The application declares `lang="pl"` and the interface contains Polish strings
directly in templates, gameplay messages and HTML. Translation after adding more
content would multiply work. Introduce i18n before the living-world expansion:

- stable translation keys and parameter interpolation;
- English as the release default, Polish selectable;
- locale-aware numbers and dates;
- a build test for missing keys and raw user-facing strings;
- save data stores semantic IDs, never translated labels.

### R0 — No distributable desktop product

There is no installer or Windows application. IndexedDB is a good browser
backend, but a Steam build needs a stable on-disk user-data contract. The
desktop host should provide a storage adapter behind the existing save-manager
contract; it must not fork gameplay save logic.

Target:

- Tauri v2 Windows host;
- JSON career files plus metadata under the OS application-data directory;
- atomic write (`temp -> verify -> replace`) and the existing checkpoint policy;
- import from the current browser/JSON format;
- Steam Auto-Cloud over the save directory for the first release;
- browser IndexedDB remains supported for development and non-Steam builds.

Steam documents that Auto-Cloud can synchronise ordinary files configured on
the Steamworks site, so a direct Steamworks storage API is not required for the
first release.

### R1 — Runtime is not self-contained

The game fetches Saira Condensed, Barlow and GSAP at runtime. The application
mostly degrades rather than crashes when they are unavailable, but a paid
offline game should have zero required network requests.

**Status on this branch: remediated.** The fonts and their OFL notices are now
bundled, the two transitions use the native Web Animations API, and a release
test rejects remote runtime tags.

- Keep the local font files and OFL notices in release packages.
- Keep page/modal transitions on the native Web Animations API.
- Keep the automated release check that forbids remote `script`, stylesheet and
  font URLs.

### R1 — Failure handling is developer-facing

Autosave failures surface a toast, but there is no global `error` /
`unhandledrejection` boundary, diagnostic bundle, safe-mode start or crash
screen. Before external playtesting:

- catch fatal UI/runtime errors without replacing a valid save;
- offer export of the active career and a small redacted diagnostic report;
- record app version, save schema, page and error stack locally;
- never include personal paths or full career data unless the player explicitly
  exports the save;
- verify startup with unavailable storage and a corrupted imported file.

### R1 — Product truth is inconsistent

The current code still exposes and schedules Mundial, Olympics and Top 12,
while the owner says these are no longer part of the intended current game.
The long-career work on branch `test/long-career-soak` owns the factual audit and
safe removal/isolation of those paths. Do not build new UI or translations for
them until that branch resolves the discrepancy.

`ROADMAP.md`, `HANDOFF.md` and `GDD-v17.md` also contain historical claims that
must not be treated as proof of current behaviour.

## Important strengths to preserve

- Save format validation, migrations and recovery checkpoints already exist.
- The career list has no artificial slot cap.
- JSON remains a portable manual backup and mod-friendly interchange format.
- CI runs fast checks on changes and the full suite on schedule/manual dispatch.
- World generation can be seeded for repeatable diagnostics.
- The application is small and framework-free.
- Default player and Polish club identities are fictional.
- There are no audio files, analytics SDKs, ads or telemetry to license or
  disclose today.

## Release-first execution order

1. Merge/review the independent 30-season soak work and establish the current
   competition model.
2. Fictionalise all shipped brands, sponsors and club identities; add the legal
   data gate.
3. Remove runtime network dependencies and add third-party notices.
4. Introduce i18n, then migrate screens in coherent vertical slices until
   English is complete.
5. Add the desktop storage adapter and Tauri Windows host.
6. Add fatal-error recovery, diagnostic export and clean-install/offline smoke
   tests.
7. Improve first-run guidance and the few remaining broken flows.
8. Expand the living world only after new text is born localised.
9. Produce a signed release candidate and external playtest package.

## Definition of a release candidate

A candidate is not ready merely because tests pass. All of the following must
be demonstrated:

- installs and launches on a clean supported Windows machine without internet;
- contains no unapproved real-world brands or club identities;
- English is complete and Polish can be selected;
- a new player can start and finish a season without developer help;
- old supplied saves migrate, persist across an application update and can be
  exported;
- a 30-season soak passes with bounded data growth;
- a fatal UI error cannot silently destroy the latest valid career;
- window, fullscreen, alt-tab and shutdown behaviour are safe;
- all licences/notices are included;
- `npm run check`, fast tests, full tests and desktop smoke tests pass;
- the exact build is versioned and reproducible from a tagged commit.

## Sources for distribution decisions

- Google Fonts repository: font files are distributable subject to each
  family’s licence; Saira Condensed and Barlow are in the OFL collection.
- GSAP standard licence (effective 2025-04-30): commercial use is permitted for
  ordinary digital interfaces; proprietary notices may not be removed.
- Steamworks Steam Cloud documentation: Auto-Cloud can synchronise files from
  configured root paths without integrating the Cloud API.

These notes are engineering guidance, not legal advice. Final store submission
still needs the owner/publisher to confirm naming, tax, privacy and platform
agreements.
