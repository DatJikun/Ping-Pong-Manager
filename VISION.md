# VISION — PingPong Manager

> The north-star for the project. Owner-written direction (2026-06-29).
> **Today:** public **beta 0.1.x**. **1.0** is the first real release (Steam).
> `HANDOFF.md` is the working state; this file is the *why*.

## The four pillars (in priority order)

### 1. Clean backend — non-negotiable foundation
Every system must actually work, be balanced, and never crash. When the player
clicks a button in the UI, the engine must do the right thing. No fighting stupid
bugs for hours. **This is why we built the test harness first** and fix bugs with
regression tests. Definition of done for a system: it works, it's balanced, it has
tests, and the UI control that drives it is wired correctly.

### 2. UI redesign
The current UI is decent but:
- **too "wide"** — needs tighter, more deliberate layout.
- **font isn't the best**; spacing/placement is chaotic in places.
- **Transfer market** is a sortable list of oversized profile cards — it should be
  a compact, **Excel-like spreadsheet that looks GOOD**: low row height, dense,
  scannable, sortable, still beautiful.
- **Better avatars** (current ones are weak).
General direction: dense but elegant, consistent spacing, clear hierarchy.

### 3. Make the game feel ALIVE (the soul)
You never play the matches. You make **real manager decisions**: players, coaches,
infrastructure, budget — everything set up to win. The world must surprise you.
A deep **life-events system** drives emergent stories:
- newborn baby (player misses time), sickness, injury aftercare
- low morale, depression, burnout
- off-court trouble: addiction, "fashion killa" / lifestyle distractions, scandals
- positive: breakout form, mentor relationships, loyalty, redemption arcs
- thousands of combinations → **unlimited replayability**, build your own **dynasty**.
This is the difference between a spreadsheet and a game people love.

### 4. Steam-ready (last step) + open data
Release on Steam once it's fun to play for hours. Two enablers:
- **Unlicensed / fictional data** so the community can legally make real-life mods
  (à la Football Manager). Avoids licensing restrictions.
- **Database editor** in the menu so players build content per country.
- **Challenge / scenario mode**: e.g. "win the league in 3 years starting 11th in
  overall, your best player just left, no budget", and many more.

## Tech & Steam — straight answer (owner asked: is HTML OK?)

**Yes, HTML/JS is completely fine for a Steam release, and porting will be easy.**
Many shipped Steam games are web apps in a desktop shell. The plan:

- Keep building as a plain browser app (what we have). Do NOT adopt a heavy
  framework — staying vanilla keeps the port trivial and avoids lock-in.
- For release, wrap the existing HTML/CSS/JS **unchanged** in a desktop shell:
  - **Tauri (recommended)** — uses the OS webview (WebView2 on Windows). Tiny
    (~3–10 MB), fast, low memory. Ideal for a single-player offline game.
  - **Electron (fallback)** — bundles Chromium; bigger (~150 MB) but maximally
    compatible. Use only if a webview quirk bites us.
- Work needed for the port (all small, none touches game logic):
  1. Real **file-based saves** (we already export/import JSON; just route default
     saves to disk instead of localStorage) → also enables Steam Cloud.
  2. A proper **main menu** + window/fullscreen handling (already on the backlog).
  3. Optional **Steamworks** integration for achievements.
  4. **Audio licensing** — any music/SFX must be cleared for commercial release.

**Bottom line:** HTML/JS stays. **0.1** already wraps the same app in Tauri for a Windows `.exe` (GitHub Releases). Steam Cloud, store page and 1.0 come later — still a wrap, not a rewrite.

## How this maps to the current plan
- Pillar 1 ↔ the engineering plan in `HANDOFF.md` §4 + bug fixes §10.
- Pillar 2 ↔ UI redesign (after systems are stable; market = spreadsheet, avatars).
- Pillar 3 ↔ the **life-events system** (new major system; needs the sim/mutation
  split, `HANDOFF.md` plan #3, to be clean first).
- Pillar 4 ↔ Tauri wrap + file saves + main menu + DB editor + challenge mode.

Sequencing stays: finish backend correctness & depth → UI redesign + alive-events
(can interleave) → Steam wrap + editor + challenges last.
