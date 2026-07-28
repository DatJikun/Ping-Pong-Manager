# Autosave failure handling

Date: 2026-07-28

Status: owner approved

## Problem

`persistGame()` serializes the entire career and writes it synchronously to one
`localStorage` key. If serialization or `localStorage.setItem()` throws, the
exception escapes into the gameplay action that requested the save.

The failure is reproducible by making `setItem()` throw `QuotaExceededError`.
The currently supplied saves still fit in the tested Chromium storage, so this
task does not assume that quota exhaustion is happening today. Storage can also
fail because of browser policy, disabled persistence, disk problems, or a future
desktop-shell configuration.

## Chosen behavior

- `persistGame()` returns `true` only after a successful write.
- It returns `false` when there is no active game or when serialization/storage
  fails.
- A save failure never escapes into gameplay code.
- The first failure in a continuous failure period shows one actionable message:
  `Autosave nie powiódł się — pobierz zapis do pliku w Ustawieniach.`
- Repeated failures do not repeat the message.
- A later successful save resets the notification latch, so a new failure is
  reported once again.
- The previous valid `localStorage` value is left untouched.

The notification latch is transient UI state and is not written into the career
save.

## Scope boundaries

This task does not:

- debounce or delay autosaves;
- change save data or schema version;
- introduce save slots, backups, IndexedDB, file-system storage, or Steam Cloud;
- alter any of the existing gameplay call sites;
- change the manual JSON export/import path.

Those are separate release tasks. In particular, the measured 77–80 ms write
cost is not enough evidence to trade immediate durability for delayed writes.

## Verification

Focused tests must prove:

1. a successful save returns `true`, stores the current `_pid`, and clears a
   previous failure latch;
2. a thrown storage error does not escape, returns `false`, and reports one
   actionable message across repeated attempts;
3. after a successful save, a subsequent new failure is reported again.

Syntax checks and the full existing test suite run before integration.
