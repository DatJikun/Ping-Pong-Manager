# Open issues — owner feedback (ARCHIVE)

> **Status: all items below are FIXED.** This file is an archive of early-July
> 2026 playtest notes, not an active backlog. For current work see `HANDOFF.md`
> and remaining items in `AUDIT-design-calculations-realism-gameplay.md`.
> New owner feedback: append a dated section here, or put it in HANDOFF §2.

---

# Owner feedback (2026-07-02, previous-build playtest)

Notes reported against the PREVIOUS build (pre the 2026-07-02 15-bug batch,
commit 5d37493). Workflow was: write down → fix against current build.

## 🟠 Bugs (suspected)

1. `[x]` **Ticket pricing exploit** — FIXED: demand elasticity steepened (zero-ish
   above ~110 €), the die-hard "ultras" floor now fades to zero at 160 € instead
   of guaranteeing 22% of capacity at ANY price. Revenue peaks at ~50–70 € and a
   200 € price earns ~6% of the peak (was ~€1M/season at max hall).
2. `[x]` **Transfer market shows wrong/duplicate players** — root cause was the
   `_pid` ID-counter rewind fixed in 5d37493. ADDED: save migration now detects
   duplicate entity ids in already-corrupted saves and reassigns fresh ids
   (first holder keeps the id), so old saves self-heal on load.
3. `[x]` **Season awards leak to pre-signed players** — the mechanics were right
   (Paletki are LEAGUE-wide awards; a pre-signed player legitimately earned his
   at his current club) but the gala/log never showed the club, so it read as
   ours. Awards now carry and display the club name.
4. `[x]` **Staff never leave** — the season-end contract-expiry sweep explicitly
   excluded the player's club. It now applies to every club (toast + log when
   it's ours); migration clamps negative contract years in old saves.
5. `[x]` **Loans** — (a) loaning out a player in his FINAL contract year is now
   blocked (his deal expired during the loan, so he "returned" straight into
   free agency — looked like he never came back); (b) borrowing IN now exists:
   AI clubs list bench players as season-long loan offers on the market
   (WYPOŻYCZ button; we pay a negotiated wage share; auto-return at season end);
   guards stop selling/releasing/renegotiating borrowed players.
6. `[x]` **Players never reach their peak OVR** — two real bugs: a flat per-stat
   cap of 84 made any advertised peak above ~84 structurally unreachable, and
   the growth taper (gap/14, capped 1.3, Math.round) starved both big-gap
   talents and the last few points. Stats may now rise to ceiling+3, big gaps
   grow proportionally faster (cap 2.2), small gains use probabilistic
   rounding. With a decent coach/hall a ceiling-80 junior now peaks 78–80.

## 🟡 Balance (direction agreed by owner in the notes)

7. `[x]` **Wonderkids too common** — academy WUNDERKIND chance halved (top
   academy ~35% → ~18%), rare-gem chance halved (~12% → ~6%), scout
   diamond/gem rolls halved, and the academy peak band now uses a min-of-two
   draw (top-of-band peaks possible, not routine). Youth-club probe still
   passes: L1-quality ~season 20, "hard but possible".
8. `[x]` **Wage curve too steep at the top** — piecewise curve: 13.5%/OVR up to
   80, 10%/OVR above. 87→90 now +€31k (was +€53k); still convex (>2.5× per
   +10 OVR), wage tests green.
9. `[x]` **Polish AI clubs go bankrupt** — AI payroll followed player OVR while
   AI income followed the club economy → structural deficit; by season 4,
   11/12 L2 clubs sat at €0. AI boards now enforce wage discipline (payroll
   scaled down to ≤62% of income). 10-season probe: L2 medians €35–46k, 0–1
   broke clubs, league OVRs unchanged.

## 🔵 Features / UX (owner-requested)

10. `[x]` **Top 12 Masters selection** — AI clubs send their best-season player
    (wins → point balance per appearance → OVR); the manager picks their own
    entrant in a pre-tournament modal (with a recommendation and season stats).
11. `[x]` **Cup rounds play automatically** — a due round runs itself before the
    next league matchday (and inside auto-play); the separate dashboard button
    is gone.
12. `[x]` **News feed is boring** — feed is now data-driven: leader actually
    dropping points, genuine upsets (both directions, with OVRs and scores),
    5+ win streaks, standout duels (underdog beating a much higher-rated
    player), career milestones (100/250/500 wins), periodic table check, star
    injuries, and notable AI signings.

---

# Open issues — owner feedback (2026-07-01, post main-menu)

Reported after the main-menu + new-game-wizard + 6-stat rework batch shipped. Order
of work agreed with the owner: **write these down → push git → then fix the code.**

## 🔴 Critical

1. `[x]` **A running match could be interrupted / re-simulated → different result.**
   FIXED: `runMatchday` now **atomically** simulates ALL matches, applies them,
   advances the matchday and `persistGame()`s **before** the animation. The animation
   only replays the committed outcome (reveal-gated so it doesn't spoil). So a refresh
   / interrupt can't re-roll — the state is already saved with the advanced matchday.
   (Backdrop + Escape + nav `go()` were already blocked during `ui.running`; the real
   vector was a reload before the end-of-match persist.) Verified in-browser: after a
   matchday, `localStorage.matchday` is already advanced and results are committed.

## 🟠 Bugs

2. `[x]` **Options threw you into the game.** FIXED: `saveSettings()` now re-renders
   ONLY the settings modal (applyTheme + re-open) instead of `render()`-ing the app.

3. `[x]` **No "back to main menu" while in a game.** FIXED: `backToMainMenu()` + a
   "🏠 MENU GŁÓWNE" button in Opcje; returns to the menu without destroying the career
   (resume via "Wznów ostatni zapis").

4. `[x]` **Finances didn't account for loans.** FIXED: one shared `myPlayerWageBill()`
   handles both directions — a player lent OUT still costs the residual (1-share)
   instead of vanishing; a player borrowed IN costs only our share. `totalWages` +
   `totalWageBreakdown` share it. Verified headlessly.

## 🟡 UX / naming

5. `[x]` **"Wczytaj grę" vs "Wczytaj z pliku" confusing.** FIXED: relabelled to
   "WZNÓW OSTATNI ZAPIS" (browser save) vs "WCZYTAJ Z PLIKU (.json)" (backup).

## ⏸ Deferred (part of the future UI redesign)

6. `[x]` **Dark theme is a bit broken.** FIXED in the 2026-07-24 UI pass — not
   piecemeal: the root cause was that every surface hard-coded a white sheen
   (`rgba(255,255,255,.48)`), so dark mode rendered light cards behind a grey
   wash. Surfaces are now theme tokens (`--sheen`, `--panel*`, `--line*`,
   `--shadow*`, `--tint-*`) and both themes are checked screen by screen.
