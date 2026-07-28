# Autosave Failure Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a failed browser autosave from interrupting gameplay and tell the player once how to protect the career.

**Architecture:** Keep the change inside the existing persistence boundary in `state.js`. Add one transient notification latch to `ui`; `persistGame()` catches both serialization and storage errors, reports the first failure through the existing global `toast()`, and clears the latch after the next successful write.

**Tech Stack:** Browser JavaScript, `localStorage`, Node.js built-in test runner, existing VM test harness.

## Global Constraints

- Do not change the save schema or serialized game object.
- Do not change any gameplay caller of `persistGame()`.
- Do not debounce or delay autosaves.
- Use the exact player-facing message: `Autosave nie powiódł się — pobierz zapis do pliku w Ustawieniach.`
- A previous valid value under `ppgame` must survive a failed write.

---

### Task 1: Make autosave failure safe and visible

**Files:**
- Modify: `src/core/state.js`
- Create: `tests/persistence.test.js`

**Interfaces:**
- Consumes: global `toast(message)` supplied by the existing UI shell.
- Produces: `window.PPM.stateApi.persistGame(): boolean`; transient `window.PPM.ui._saveFailureNotified: boolean`.

- [ ] **Step 1: Write the failing success-contract test**

Create `tests/persistence.test.js` with a test that boots a game, sets `_pid` to a literal value, starts with the notification latch set, calls the real `persistGame()`, and asserts: return value `true`, stored `_pid` equals the literal, and the latch is `false`.

- [ ] **Step 2: Write the failing failure-cycle test**

In the same file, seed `localStorage` with a known previous value, replace only `setItem()` with a function throwing `QuotaExceededError`, and collect messages by replacing the harness's global `toast`. Assert that two failed calls both return `false`, neither throws, the previous value remains, and the exact message appears once. Restore working storage, assert a successful save, then fail storage again and assert that the message appears a second time.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test tests/persistence.test.js`

Expected: failure because the current `persistGame()` either returns `undefined` on success or lets the storage exception escape.

- [ ] **Step 4: Implement the minimal persistence contract**

Add `_saveFailureNotified: false` to `ui`. Change `persistGame()` so it returns `false` without an active game; otherwise sets `_pid`, performs `JSON.stringify()` and `localStorage.setItem()` inside one `try`, clears the latch and returns `true` after success. In `catch`, call `toast()` only when the latch was previously false, set the latch, and return `false`.

- [ ] **Step 5: Run focused verification**

Run: `node --test tests/persistence.test.js`

Expected: both focused tests pass with no warnings or uncaught errors.

- [ ] **Step 6: Run repository verification**

Run: `npm run check`

Expected: `syntax OK`.

Run: `npm test`

Expected: the complete suite passes.

- [ ] **Step 7: Commit**

```text
git add src/core/state.js tests/persistence.test.js
git commit -m "Handle autosave storage failures safely"
```
