# ROADMAP — from playable prototype to Steam release

> **Purpose:** `VISION.md` says *what* and *why*. `HANDOFF.md` says *where we are
> this week*. **This file says how we actually ship it** — milestones, definition
> of done, blockers, and the order of work. Owner-facing: no code, only decisions.
>
> Written 2026-07-24 after the owner asked: *"this game is ought to be released on
> Steam someday, I hope you've got a plan."* Short answer: there was a direction
> (VISION's four pillars) but **not a release plan**. This is it.

---

## 0. Honest state of the game today

| | |
|---|---|
| Engine | Works. 112 regression tests, headless harness, long-career + academy probes |
| Systems | League + cup + Top 12 + Mundial/Olympics, 5 playing styles with counters, EUR economy, staff, academy, equipment, principals, inbox (thin), AI transfers |
| Content | 6 countries × 2 divisions × 12 clubs, procedural players/staff, procedural portraits |
| UI | Just rebuilt (2026-07-24): theme tokens, working dark theme, decluttered screens. Still Polish-only, still "sections stacked on a page" in the long flows |
| Language | Polish only |
| Packaging | Browser app, opened from disk. No installer, no menu-driven saves, no Steam |
| Playtime | Playable for hours by the owner; never tested by a stranger |

**The honest gap:** the *simulation* is close to release quality. The *product*
around it — language, onboarding, flow, story, packaging, store presence — is
roughly 20% done. That's normal, and it's the work this roadmap covers.

---

## 1. What we are shipping (scope commitment)

**Product:** single-player, offline, desktop (Windows first) table-tennis club
manager. **Steam Early Access first** (confirmed by the owner 2026-07-24), 1.0
after 2–3 content updates.

**Why Early Access:** this genre lives on long careers and emergent stories. We
need strangers playing 20-season careers to find the balance holes the tests
can't. EA also starts revenue and wishlists earlier, and the community can build
databases (VISION pillar 4) before 1.0.

**Non-negotiable quality bar for EA:** no crashes, no `NaN`/`undefined` on any
screen, saves never break inside a season, English-complete, a stranger can start
a career and understand what to do without asking the developer.

---

## 2. Release blockers found in the current build

These are cheap to fix now and expensive later. All three are new findings from
the 2026-07-24 audit.

1. **Real trademarks in game data — bigger than first reported.** Equipment
   partners (`Butterfly`, `Tibhar`, `Andro`, `DHS`, `Xiom`, `Donic`, `Stiga`),
   sponsors (`x-kom`, `Rossmann`, `PKO BP`, `Orlen`, `Lotos`, `CCC`, `Tymbark`,
   `Inglot`, `Neonet`, `Amica`, `Oshee`, `House`) **and most club names outside
   Poland** — `COUNTRIES[*].l1Names` still contains real clubs and brands
   (`Borussia Düsseldorf`, `TTC Butterfly`, `Nittaku Premium`, `Seoul Samsung`,
   `Hiroshima Carp`, `Shandong Luneng`, `Spårvägens TK`…). Poland was rewritten
   on 2026-07-24 with invented club words + real cities; **the other five
   countries still need the same pass.** These are real companies/clubs. Selling a game that uses them without a
   licence is a legal risk and contradicts `VISION.md` ("unlicensed / fictional
   data so the community can legally mod real names in"). **Fix:** rename to
   fictional equivalents; ship the real-name set as a community database file.
   **Scheduling (owner, 2026-07-24): do it whenever nothing higher-priority is
   queued** — it is cheap, and the equipment rework touches the same data, so
   the two should land in one pass.
2. **External runtime dependencies.** `index.html` loads GSAP from a CDN and
   `main.css` `@import`s Google Fonts. A desktop build must run offline — today
   the game degrades (no animation, fallback font) with no network. **Fix:**
   vendor GSAP and the two fonts into the repo.
3. **Saves live in `localStorage`.** Fine in a browser, wrong for a desktop game:
   no save slots, no Steam Cloud, and a cleared browser profile wipes a career.
   **Fix:** file-based saves in M4 (the JSON export/import already exists).

---

## 3. Milestones

Each milestone ends with a build the owner plays for at least one full season
before we move on. Sizes are relative effort, not calendar dates.

### M1 — Interface & language (biggest, in progress)
*Goal: the game looks like a 2026 product and speaks English.*
- **UI direction LOCKED (owner, 2026-07-24):** `prototypes/proto-final.html` —
  prototype **D's skin** (dark carbon, club livery, Saira Condensed display,
  colour-coded figures) with **E's attribute grid** for player profiles. That file
  is the design reference: tokens, components, spacing, typography.
- **The season is ONE flow, not tabs (owner):** pre-season → season → post-season
  are phases of the same hub, driven by a persistent stage rail. Pre-season is not
  a nav destination (it caused "am I stuck here?" confusion); post-season is where
  **changing club** happens, and nowhere else.
- Rebuild screens on the chosen system, screen by screen, tests green after each.
- **Flows, not stacked sections** for pre-season, academy, and season-end — the
  owner's specific complaint. One decision at a time, a step rail, an explicit
  "you're done" state.
- **i18n:** `t('key')` lookup + `src/i18n/en.js` (default) and `pl.js`. Strings
  get extracted per screen *as that screen is rebuilt* — never twice. A test
  fails the build on a missing/orphan key. Language switch in Settings.
- **Transfer market as a real grid** (VISION pillar 2's explicit request).
- Fix blockers #2 (vendor fonts/GSAP).
- *Done when:* every screen is English by default, PL switchable, no screen is a
  scroll-stack of sections, `npm test` green.

### M2 — The living world (the soul, VISION pillar 3)
*Goal: a career generates stories you'd tell someone.*
- **Equipment rework** (`DESIGN-equipment.md`) — rubber *families* with real
  trade-offs instead of a pay-more-get-more tier ladder; wear/freshness;
  adaptation cost; player kit preferences (which become inbox threads); partner
  contracts with terms instead of a flat buff. The owner called the current
  system "a free boost of money, stats and marketability" — this is the fix, and
  it gives AI clubs a visible identity too.
- **Inbox rewritten from the ground up** (see §4) — threads with senders,
  consequences, memory and escalation; a cadence governor so nobody asks the same
  thing twice.
- **Life events**: injuries with aftercare, burnout, family, lifestyle, mentor
  relationships, redemption arcs, poaching drama, bankruptcy scares.
- **Press & reputation**: interviews that move morale, rival managers, board mood.
- *Done when:* two 10-season careers produce clearly different stories, and no
  event repeats verbatim within a season.

### M3 — Content & replayability
- **Database editor** in the menu (VISION pillar 4) + fictional default DB (fixes
  blocker #1) + import/export of community databases.
- **Scenarios / challenges**: "win the league in 3 years from 11th", "no budget,
  best player just left", etc.
- **Tutorial / first-run**: a guided first pre-season that teaches the loop.
- *Done when:* a stranger finishes a first season without help.

### M4 — Desktop shell
- **Tauri wrap** (WebView2, ~3–10 MB) — no game-logic changes.
- **File saves + slots + autosave rotation**, migration policy, Steam Cloud paths.
- Window/fullscreen/resolution handling, in-game settings, key bindings.
- Audio: licensed music/SFX or none at all.
- *Done when:* installs and runs offline on a clean Windows machine, alt-tab safe,
  saves survive an update.

### M5 — Store readiness
- Steam app, store page: capsules, 6–8 screenshots, ~60s trailer, description,
  tags, age rating, pricing, EA description and duration.
- **Demo build** (first season only) — demos drive wishlists.
- Wishlist campaign starts ~2–3 months before launch: page live early, devlogs,
  r/footballmanager-style communities, TT communities, YouTube/streamer keys.
- Achievements via Steamworks (career milestones, dynasty, underdog runs).
- *Done when:* store page is live and collecting wishlists while M2/M3 finish.

### M6 — Early Access launch & live ops
- Launch, then a fixed patch cadence (e.g. fortnightly) for 3–6 months.
- Feedback loop: in-game "report a save" button that exports the save + log.
- 1.0 when: balance stable across long careers, scenarios shipped, no P1 bugs
  for two consecutive patches.

**Suggested order:** M1 → M2 → (M5 store page opens here, in parallel) → M3 →
M4 → M6. M5 starts early on purpose: wishlists compound.

---

## 4. Inbox rewrite — design (M2, owner-requested)

**What's wrong today:** three generators total — a reserve asking for a game
(50% roll every round), an expiring-contract note, and a fatigue report. So the
same player asks the same question every other round, and the mail is a
notification list, not a world.

**The model**
- A **thread** has: a *sender* (a real entity — player, agent, board, staff,
  journalist, rival manager), a *category*, a *priority*, an optional
  **decide-by** round, **options with visible consequences**, and a **memory**
  record of what you chose.
- **Consequences are shown before you answer** (as in the prototypes): "+4 morale
  / −12 morale & −1 loyalty / −6 morale". No blind choices.
- **Escalation instead of repetition.** Bench a promised player → he asks for a
  transfer → his agent calls → the press asks about dressing-room unrest. Each
  step is a *different* mail that references what you did.
- **Cadence governor.** A per-round event budget (2–4), per-sender cooldowns, no
  template repeat within N rounds, and category quotas so it isn't all whining.
- **Only decisions block play.** Everything informational is folded into one
  digest ("Round 8 briefing") instead of separate mails.
- **Categories:** Board, Players, Agents, Staff & medical, Academy, Press,
  Rivals, Life events.

**Content pass:** ~60–80 hand-written templates with slots, each tagged with
context gates (form, morale, standing, budget, age, contract, history), so the
right mail arrives at the right moment. This is content work as much as code —
it's what makes the world feel alive.

---

## 5. What we are deliberately NOT doing

- No multiplayer, no online features, no accounts.
- No 3D, no match视 animation beyond the existing 2D visual engine.
- No engine rewrite and no framework (React/Vue) — vanilla keeps the Tauri port
  trivial, exactly as `VISION.md` decided.
- No mobile build for 1.0 (the layout work would compete with M1–M4).
- No real-world licensing deals. Fictional data + community databases instead.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Scope creep in M2 (life events are endless) | Ship a fixed catalogue size per patch; extra events are post-1.0 content |
| Balance breaks with new systems | Every system lands with tests + a long-career probe, as now |
| Solo-dev bandwidth | Milestones are independently shippable; the store page can go live during M2 |
| Nobody discovers the game | M5 starts early: page + demo + devlogs, wishlists before launch |
| Save breakage during EA | `schemaVersion` + migrations already exist; add a save-compat test per release |
| Trademarks / audio licensing | Blocker #1 fixed in M3; audio only from cleared sources |

---

## 7. Right now (next working sessions)

1. **Owner picks a UI prototype** (A / B / C, or a mix) → locks the design system.
2. Build the design system + shell on the chosen direction, with **English as the
   default language** and the i18n scaffolding in place.
3. Rebuild in this order: shell/nav → hub → squad → **pre-season flow** →
   **academy flow** → **season-end flow** → market grid → the rest.
4. Then M2 starts with the inbox rewrite.
