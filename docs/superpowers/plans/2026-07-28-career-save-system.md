# Career Save System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single browser autosave with a dynamic career library, ordered autosaves and recoverable checkpoints while preserving every existing career.

**Architecture:** `save-storage.js` owns the asynchronous persistence adapter; `save-manager.js` owns career metadata, queues, recovery and legacy import. `state.js` remains the only module that serializes, validates and migrates gameplay state. UI code consumes public career-management functions without reading IndexedDB directly.

**Tech Stack:** Browser JavaScript, IndexedDB, existing Node test runner and VM harness, existing HTML/CSS.

## Global Constraints

- Do not impose a numerical career limit; available storage is the only limit.
- Keep three rotating ordinary checkpoints per career.
- Keep one temporary unmodified pre-migration recovery record until read-back succeeds.
- Never silently overwrite a career during import, restore or new-game creation.
- Keep exported careers as plain compatible JSON.
- Preserve the rule that committed match results are durable before presentation.
- Keep application settings in their existing `localStorage` key.
- Do not add runtime dependencies.

---

### Task 1: Define and test the storage adapter

**Files:**
- Create: `src/core/save-storage.js`
- Create: `tests/save-storage.test.js`
- Modify: `tests/harness.js`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Produces: `window.PPM.saveStorage.createMemoryAdapter()` and `createIndexedDbAdapter()`.
- Adapter methods: `open()`, `listCareers()`, `getCareer(id)`, `commit({career, backup, deleteBackupIds})`, `listBackups(careerId)`, `deleteCareer(id)`, `getMeta(key)`, `putMeta(key, value)`.

- [ ] **Step 1: Write adapter contract tests**

Test that the memory adapter starts empty; commits and returns a career; stores
backups; atomically deletes requested old backup IDs; stores metadata; and
deleting a career also removes all its backups.

```js
const adapter = createMemoryAdapter();
await adapter.open();
await adapter.commit({career:{id:'career-a',name:'A',data:'{}'},backup:null,deleteBackupIds:[]});
assert.equal((await adapter.listCareers()).length,1);
assert.equal((await adapter.getCareer('career-a')).name,'A');
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/save-storage.test.js`

Expected: FAIL because `save-storage.js` and the adapter exports do not exist.

- [ ] **Step 3: Implement both adapters**

Use IndexedDB database `ppm-careers`, version `1`, with object stores:

```js
db.createObjectStore('careers',{keyPath:'id'});
const backups=db.createObjectStore('backups',{keyPath:'id'});
backups.createIndex('careerId','careerId',{unique:false});
db.createObjectStore('meta',{keyPath:'key'});
```

`commit()` must use one `readwrite` transaction covering `careers` and
`backups`. `deleteCareer()` must use one transaction and delete backups selected
through the `careerId` index.

- [ ] **Step 4: Load the module in browser and harness**

Insert `save-storage.js` after `utils.js` and before `state.js`. Add it to
`tests/harness.js` and the syntax-check file list in `package.json`.

- [ ] **Step 5: Run focused and fast tests**

Run: `node --test tests/save-storage.test.js && npm run check && npm test`

Expected: adapter contract PASS and existing fast suite remains green.

- [ ] **Step 6: Commit**

```powershell
git add -- src/core/save-storage.js tests/save-storage.test.js tests/harness.js index.html package.json
git commit -m "Add career storage adapters"
```

---

### Task 2: Build the career save manager

**Files:**
- Create: `src/core/save-manager.js`
- Create: `tests/save-manager.test.js`
- Modify: `tests/harness.js`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Consumes: the adapter contract from Task 1.
- Produces: `window.PPM.saveManager` with `initialize()`, `listCareers()`, `createCareer(gameText, name)`, `importCareer(gameText, name)`, `loadCareer(id)`, `renameCareer(id, name)`, `deleteCareer(id)`, `requestAutosave(gameText)`, `flush()`, `createCheckpoint(kind, gameText)`, `listBackups(id)`, `restoreBackup(id, backupId)`, `deactivate()`, `getActiveCareerId()`, and `estimateStorage()`.

- [ ] **Step 1: Write queue and career tests**

Cover:

```js
for(let i=0;i<7;i++) await manager.createCareer(validText(i),`Career ${i}`);
assert.equal((await manager.listCareers()).length,7);
```

Also assert stable IDs, metadata extraction, rename, deletion, import creating a
new ID, latest-wins autosave ordering, `flush()` durability, failure preserving
the previous record and one warning per failure period.

- [ ] **Step 2: Write recovery tests**

Create four matchday checkpoints and assert only the newest three ordinary
records remain. Assert a migration backup is separate. Restore a backup and
verify the displaced current state first becomes a checkpoint.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `node --test tests/save-manager.test.js`

Expected: FAIL because the manager does not exist.

- [ ] **Step 4: Implement the manager**

Career records use:

```js
{
  id, name, createdAt, updatedAt, revision,
  summary:{clubName,countryId,season,matchday,phase,difficulty,schemaVersion},
  data
}
```

Generate IDs with `crypto.randomUUID()` and a timestamp/random fallback. Queue
ordinary saves one at a time and replace any not-yet-started pending snapshot
with the latest request. Store checkpoint IDs separately as
`<careerId>:checkpoint:<timestamp>:<nonce>`.

- [ ] **Step 5: Add storage estimation**

Return `{usage, quota, ratio}` from `navigator.storage.estimate()` when
available, otherwise `null`. Treat a ratio of at least `0.85` as low-storage
warning state; never turn it into a career-count limit.

- [ ] **Step 6: Load the module and run tests**

Insert `save-manager.js` after `state.js` and before `shell.js`; update harness
and syntax check.

Run: `node --test tests/save-manager.test.js && npm run check && npm test`

Expected: focused and fast suites PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/core/save-manager.js tests/save-manager.test.js tests/harness.js index.html package.json
git commit -m "Add ordered career save manager"
```

---

### Task 3: Integrate validation, legacy import and active autosave

**Files:**
- Modify: `src/core/state.js`
- Modify: `src/core/save-manager.js`
- Modify: `src/main.js`
- Modify: `tests/persistence.test.js`
- Create: `tests/save-migration.test.js`

**Interfaces:**
- Produces: `stateApi.serializeGame()`, `stateApi.validateSaveObject(obj)`, and `stateApi.flushPersistence()`.
- `persistGame()` remains callable by all existing synchronous gameplay paths and enqueues the captured snapshot.

- [ ] **Step 1: Write validation and future-version tests**

Assert that non-object JSON, missing `teams`, missing `players`, non-numeric
`season`, and `schemaVersion > SAVE_SCHEMA_VERSION` are rejected before
migration. Assert a current exported save still loads.

- [ ] **Step 2: Write legacy migration tests**

Seed `ppgame`, initialize with an empty adapter, and assert:

- one new career exists;
- its read-back data loads;
- the old key is removed only after successful read-back;
- adapter failure leaves the old key untouched;
- repeated initialization does not duplicate the career.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `node --test tests/persistence.test.js tests/save-migration.test.js`

- [ ] **Step 4: Refactor the persistence boundary**

`serializeGame()` synchronously stamps `_pid` and returns compact JSON.
`persistGame()` captures that string and passes it to the initialized manager.
Before initialization it retains the existing safe `ppgame` fallback. Expose
`flushPersistence()` for critical async flows.

- [ ] **Step 5: Initialize storage before the first menu render**

Render a plain loading state, initialize the manager, run idempotent legacy
import, then render the career menu. Initialization failure keeps legacy export
available and shows a clear storage error.

- [ ] **Step 6: Run focused and fast tests**

Run: `node --test tests/persistence.test.js tests/save-migration.test.js && npm run check && npm test`

Expected: legacy compatibility and existing persistence behavior PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/core/state.js src/core/save-manager.js src/main.js tests/persistence.test.js tests/save-migration.test.js
git commit -m "Migrate autosave into career storage"
```

---

### Task 4: Add the career-library UI

**Files:**
- Modify: `src/ui/pages.js`
- Modify: `src/main.js`
- Modify: `src/ui/shell.js`
- Modify: `index.html`
- Create: `tests/career-ui.test.js`

**Interfaces:**
- Consumes: public manager operations from Tasks 2–3.
- Produces global UI handlers: `continueCareer`, `renameCareer`, `deleteCareer`, `showCareerBackups`, `restoreCareerBackup`, `exportCareer`, and the updated JSON import flow.

- [ ] **Step 1: Write source/UI contract tests**

Assert the menu renders dynamic career metadata and actions, has no five-career
limit, and the import handler calls `importCareer()` rather than replacing the
active save.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/career-ui.test.js`

- [ ] **Step 3: Implement the career list**

Keep one primary `NOWA GRA` action. Under it render careers sorted by
`updatedAt` descending with club, season/matchday and last-save metadata.
Selecting a row continues it; a compact action menu provides rename, backups,
export and delete.

- [ ] **Step 4: Implement safe actions**

Deletion requires confirmation containing the career name. Rename rejects blank
names and trims to 60 characters. Restore shows checkpoint labels and confirms
before changing the active state. Import creates a new career and then opens it.

- [ ] **Step 5: Connect new-game creation**

Before replacing an active in-memory career, flush and deactivate it. After
`newGame()` creates the world, create a new career record immediately; later
background-history autosaves target that new ID.

- [ ] **Step 6: Run focused and fast tests**

Run: `node --test tests/career-ui.test.js && npm run check && npm test`

- [ ] **Step 7: Commit**

```powershell
git add -- src/ui/pages.js src/main.js src/ui/shell.js index.html tests/career-ui.test.js
git commit -m "Add career library and recovery UI"
```

---

### Task 5: Make match and season boundaries durable

**Files:**
- Modify: `src/core/gameplay.js`
- Modify: `src/core/state.js`
- Modify: `tests/protocol.test.js`
- Modify: `tests/save-manager.test.js`

**Interfaces:**
- Consumes: `saveManager.createCheckpoint()` and `stateApi.flushPersistence()`.
- Preserves: committed results are durable before any replay/presentation begins.

- [ ] **Step 1: Extend durability tests**

Use a delayed fake adapter. Assert matchday state is not presented as committed
until its save promise resolves. Assert a pre-matchday checkpoint contains the
state before results and season rollover creates a labelled checkpoint.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/protocol.test.js tests/save-manager.test.js`

- [ ] **Step 3: Await critical boundaries**

Before matchday, cup, international tournament and season rollover mutation,
create the appropriate checkpoint. After applying results, call `persistGame()`
and await `flushPersistence()` before starting presentation or navigation.
Ordinary transfer, staff and settings actions remain coalesced background saves.

- [ ] **Step 4: Run focused, fast and full suites**

Run:

```powershell
node --test tests/protocol.test.js tests/save-manager.test.js
npm run check
npm test
npm run test:full
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/core/gameplay.js src/core/state.js tests/protocol.test.js tests/save-manager.test.js
git commit -m "Guarantee durable career checkpoints"
```

---

### Task 6: Browser verification with supplied careers

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `HANDOFF.md`

**Interfaces:**
- Produces: verified browser behavior and current project documentation.

- [ ] **Step 1: Run browser checklist**

Verify:

1. existing `ppgame` becomes exactly one career;
2. create and switch between two new careers;
3. create at least six careers;
4. reload and confirm every career remains;
5. export and re-import a supplied long career as a separate entry;
6. restore each of three checkpoints;
7. interrupt a match presentation and confirm no reroll;
8. simulate failed storage and confirm the previous save survives;
9. console remains free of errors.

- [ ] **Step 2: Update current docs**

Record the career library, legacy migration, backup policy and Tauri adapter
boundary. Remove statements that the product still has only one local autosave.

- [ ] **Step 3: Final verification**

Run: `npm run check && npm run test:full`

Expected: syntax OK and every test PASS.

- [ ] **Step 4: Commit**

```powershell
git add -- CHANGELOG.md HANDOFF.md
git commit -m "Document reliable career saves"
```
