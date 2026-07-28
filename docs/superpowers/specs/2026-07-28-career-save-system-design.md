# Career save system

Date: 2026-07-28

Status: owner approved

## Goal

The game supports any practical number of independent named careers, reliable
autosaves and recoverable backups in the browser today. The only limit is
available storage. The gameplay code talks to one storage interface so the
later Windows/Tauri build can replace IndexedDB with normal files and Steam
Cloud without another save-system rewrite.

## Player-facing flow

The main menu contains a dynamic career list. Each career shows:

- career name;
- managed club;
- country;
- season and matchday or preseason;
- difficulty;
- last-save time.

Starting a new game creates another career. Its initial name is based on the
club and can be renamed. There is no artificial slot limit.

Selecting a career offers:

- continue;
- recover a backup;
- rename;
- export to JSON;
- delete with confirmation.

Importing JSON always creates a new career. It never silently overwrites an
existing career.

## Storage architecture

Browser careers live in IndexedDB, not `localStorage`. Multiple long careers
with three backups each exceed the reliable capacity of the current single-key
storage.

Before creating or importing a career, the game checks the browser's storage
estimate when available. Low storage produces a clear warning with occupied
space and suggests exporting or deleting old careers. It does not impose an
arbitrary career count.

The persistence layer has two boundaries:

1. a save coordinator that captures the current game, manages autosave order,
   backup policy, metadata and errors;
2. a storage adapter that reads and writes records.

The browser adapter uses IndexedDB. A later Tauri adapter will implement the
same asynchronous interface using files in the application's save directory.
Steam Cloud will synchronize those files rather than changing save semantics.

Application settings remain in their small existing `localStorage` key.

## Stored records

The browser database stores:

- any practical number of career records keyed by stable generated career IDs;
- up to three rotating checkpoint records per career;
- at most one temporary pre-migration recovery record per career;
- one small metadata record containing the active career ID and storage version.

A career record contains the serialized game plus metadata derived from that same
snapshot. Metadata is never trusted as gameplay state.

Each successful write is one IndexedDB transaction so the game payload and its
menu metadata cannot disagree.

## Autosave and ordering

IndexedDB writes are asynchronous, while the current game calls
`persistGame()` from many synchronous action paths. The save coordinator
therefore:

- captures a complete serialized snapshot at the time autosave is requested;
- writes one snapshot at a time;
- coalesces queued ordinary autosaves so the latest state wins;
- exposes a promise that critical flows can await;
- does not show a success state until storage confirms the transaction.

Ordinary actions may request a background autosave. Matchday commitment,
tournament commitment, season rollover, returning to the main menu and closing
or switching a career must await the pending durable write. This preserves the
existing rule that refreshing during match presentation cannot reroll results.

Failed writes leave the previous valid record untouched, show one clear warning
per failure period and keep the current game in memory so the player can export
it.

## Recovery points

The current autosave updates after meaningful actions, but rotating backups are
created only at useful boundaries:

- immediately before committing a matchday or tournament round;
- immediately before season rollover;
- before a loaded save is migrated to a newer schema.

Only the three newest ordinary checkpoints are retained per career. They are
labelled with season, matchday, phase and time so recovery is understandable.

Before schema migration, the unmodified source is stored separately as a
temporary recovery record. It is removed only after the migrated career has
been written and successfully read back. It does not silently replace any of
the three normal checkpoints.

Restoring a backup first checkpoints the current state, then loads and validates
the selected backup. Recovery never destroys the only known-good copy.

## Legacy migration

On the first launch of the new system:

1. inspect the existing `ppgame` key;
2. parse and minimally validate it without changing the original;
3. import it as a new career with a stable generated ID;
4. read the new IndexedDB record back and load it successfully;
5. only then remove the legacy `ppgame` key.

If any step fails, the old key remains untouched and the menu offers export of
the legacy save. Migration is idempotent, so refreshing during the process
cannot duplicate or lose the career.

## Validation and compatibility

Before migration, loading requires a JSON object with the minimum career shape:
numeric season, teams array and players array. Schema migration remains the
responsibility of `migrateLoadedGame()`.

The system preserves compatibility with existing exported `.json` careers.
Exports remain plain, human-portable JSON and include the current `_pid` and
`schemaVersion`; storage metadata is not embedded into gameplay state.

Unknown future schema versions are rejected with a clear message instead of
being rewritten by an older build.

## UI scope

This task changes only the main-menu career management and recovery flow. It
does not redesign the in-game dashboard or the rest of the visual language.

The initial loading state must make it clear that careers are being read. An
empty list, a corrupted career and temporarily unavailable storage each have a
distinct message and valid next action.

## Verification

Automated tests cover:

- dynamic career creation, stable IDs, metadata and rename;
- creating more than five careers without an artificial rejection;
- ordered/coalesced autosaves;
- three-checkpoint rotation;
- pre-migration recovery;
- legacy `ppgame` import and safe cleanup;
- import without silent overwrite;
- corrupt/current-future save rejection;
- failed writes preserving the previous valid save;
- backup restoration preserving the state being replaced;
- matchday durability before presentation;
- adapter contract shared by browser and future filesystem implementations.

Browser verification covers creating two careers, switching between them,
refreshing during a save, restoring a checkpoint, importing/exporting a supplied
legacy career and simulating unavailable/full storage.
