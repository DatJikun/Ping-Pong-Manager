# DESIGN — Academy & youth pipeline

> **STATUS: vertical slice SHIPPED 2026-06-30.** See **IMPLEMENTED** at the bottom
> for live numbers, levels, and the youth-challenge balance probe. Sections above
> that are the original design discussion (kept for history). On conflict, the
> IMPLEMENTED section + code + `tests/academy.test.js` win.
>
> Youth-only challenge club (Akademia Orłów) is only beatable if the academy is
> deep and balanced — probe: L1-quality ~season 27, hard but possible.

## What exists today (quick audit)
- Players have `isYouth` / `role:'youth'`, an `academyProfile`, a `ceiling`.
- `genYouthPlayer()` makes juniors; `pullYouth()` / `signAcademyProspect()` bring
  them in; `academyProspects` holds candidates.
- Scouts run academy missions (`sendScout`, `genScoutPlayer`, `checkScoutReturns`).
- `infraAcademy` levels exist; coach `training` now develops players
  (`coachDevMultiplier`), youth benefiting most (+120% at the top).
- Youth auto-promote to reserve at age 21.

So the bones exist: generation, a prospect pool, scouting, infra, development. It's
shallow, not absent.

## Open questions for the owner (decide these)
1. **How do juniors ENTER?** Options (likely a mix):
   - regional **scout missions** (already there) → prospects pool,
   - **youth intake each preseason** scaled by `infraAcademy` + a youth-dev coach,
   - the **"mini-tournament trial"** idea (a higher-cost event yielding a shortlist
     with better-revealed potential).
2. **How visible is potential?** Per earlier decision: OVR real & visible, but stat
   bands + ceiling are FOGGY and tighten with a better scout. Confirm for juniors.
3. **Development curve** — how fast do juniors grow, and how much do infra + coach +
   playing time matter? (We have `coachDevMultiplier`; need infra + minutes hooks.)
4. **Failure/variance** — do some prospects bust (plateau early) and some break out
   (wonderkind)? How often? (Keeps it a judgement call.)
5. **Throughput vs quality** — how many juniors/season, and what ceiling
   distribution? This decides whether a youth-only club can ever reach L1.
6. **Economy** — junior wages (tiny), promotion costs, selling academy graduates
   (a real income stream for selling clubs / the frugal strategy).
7. **Ties to Layer 2** — Academy clubs + youth-investor principals should get
   tangible academy bonuses; that's how those identities express themselves.

## Strawman proposal (to argue with)
- **Preseason intake**: each club drafts `1 + infraAcademy` juniors (more with a
  youth-dev coach / youth-investor principal). Juniors enter at ~OVR 45–58 with a
  hidden ceiling (foggy band, scout tightens it).
- **Development**: per season a junior moves toward its ceiling at a rate set by
  `coachDevMultiplier` × infraAcademy × playing-time; with breakout/bust variance.
- **Reveal**: ceiling shown as a band; better scout/analyst narrows it.
- **Output**: a deep academy (infra 3+ + good dev coach) can produce the rare 80+
  graduate every few seasons — enough that a patient youth-only club can climb, but
  only with good management (the challenge).
- **Selling**: graduates you don't keep can be sold (income), enabling the
  "develop & sell" club/principal identity.

## Balance target (for the challenge club)
Akademia Orłów (youth-only, €5k, starts ~OVR 60) should be **hard but possible** to
take to L1 over many seasons IF you nail academy management — not a coin-flip, not
impossible. We'll tune via `tests/stress.js` (can a youth-only AI clone ever reach
L1?) once the design is agreed.

## OWNER DECISIONS (2026-06-29) — now agreed
- **Q1 Intake:** scout missions + **yearly academy intake scaled by academy level**.
  Academy level sets: number of SLOTS, the OVR/ceiling BAND (higher level → better
  juniors), and a development BONUS → real reason to upgrade the academy. Plus the
  **mini-tournament** option, priced so it's an economically NON-obvious choice
  (doesn't always pay off in talent).
- **Q2 Visibility:** as now (OVR real; stat bands + ceiling foggy, scout tightens).
- **Q3 Curve:** use the owner's age/peak research (below).
- **Q4 Bust:** ~**10%** of juniors fail to reach their peak (poor coach / little
  playing time); otherwise peak OVR is the target they climb toward until peak age.
  (Exact % to fine-tune.)
- **Q5 Throughput/quality:** scales with **academy level**.
- **Q6 Economy:** small junior wages (their wage INCLUDES training cost), youth are
  **loanable** out.
- **Dev rate by role:** ×1.0 in the first team, **×0.8** on the bench / in the
  academy (playing time matters).

## Age / OVR curve (owner research — to apply)
Per-year OVR change by age (average talent / wonderkid):
| Age | avg | wonderkid | driver |
|-----|-----|-----------|--------|
| 11–14 | +4..+6 | +8..+12 | technique, speed |
| 15–19 | +5..+7 | +10..+15 | serve/receive, mind |
| 20–23 | +2..+4 | +4..+6 | tactics, experience |
| 24–28 (PEAK) | ±1 | ±1 | stable form |
| 29–33 | −1..−2 | −0.5..−1 | speed down / tactics up |
| 34+ | −3..−5 | −2..−4 | physical drop-off |

**Three hidden stat groups age differently** → map onto the current atk/def/srv/men:
- **Physical** (reflex/agility/stamina): peak 21–24, decline FIRST & fastest →
  weight onto `atk` and stamina.
- **Technical** (spin/drive/service/receive): learned 10–18, stays high long →
  weight onto `srv` and part of `atk`.
- **Mental** (tactics/composure/anticipation): peak **28–32**, slowest → weight
  onto `men` (and part of `def`). This is why 30-somethings beat young guns.
Implementation: keep 4 stats but give each an aging profile (men peaks later &
declines slowest; atk/physical declines first), and use the bracketed rates above
in `applyGrowth`, multiplied by coach dev (`coachDevMultiplier`) × infra × role
(×1 starter / ×0.8 bench).

## Still open
Exact bust %, mini-tournament cost/odds. Build as a vertical slice with tests +
stress (can a youth-only club reach L1?).

---

## IMPLEMENTED (2026-06-30, peakChance 2026-08-20)

Owner approved the economy + levels; coded as a vertical slice with
`tests/academy.test.js` + a balance probe (`node tests/stress.js youth`).

**2026-08-20:** peak RANGE is **56–92 at every level**. Upgrade raises `peakChance`
(0.08→0.58), intake OVR and `devBonus` — not a higher ceiling.

**Levels (6, `constants.js` `INFRA_ACADEMY`):**

| Lvl | Build | Upkeep/sezon | Intake OVR | Peak range | Szansa na 78+ | Dev bonus |
|-----|-------|--------------|-----------|------------|---------------|-----------|
| 1 | €10k | €2k | 25–38 | 56–92 | 8% | +0% |
| 2 | €25k | €5k | 30–45 | 56–92 | 16% | +5% |
| 3 | €55k | €10k | 35–52 | 56–92 | 28% | +10% |
| 4 | €90k | €18k | 38–58 | 56–92 | 42% | +16% |
| 5 | €138k | €30k | 42–64 | 56–92 | 58% | +22% |

**Intake:** fixed **1–2 juniors/season** (level drives QUALITY, not throughput).
Plus scout missions (unchanged) and the **mini-tournament** (€10k, 3 candidates,
keep 1, quality only +0..+4 over baseline → economically non-obvious gamble).

**Economy:** academy **upkeep** charged every season-end (player + AI); junior wages
**€500–1500** with training baked in; **free downgrade** on every infra building
(no refund) as the cash-crisis valve; **youth sales** (`sellPlayer`, fee ≈ wage×1.6–3
with youth/ceiling premium) + loans (already existed) — both valid strategies.

**Development (`applyGrowth`):** the owner's age curve + 3 stat-aging groups —
`atk`=physical (matures ~25, fades first & fastest), `srv`=technical (holds to ~31),
`men`=mental (peaks ~33, slowest), `def`=mixed; maturities flex with `peakAge`.
Growth = age-bracket rate × coach × infra hall × academy devBonus × role
(**×1.0 first team / ×0.8 bench/academy**) × gap-to-ceiling; **~10% bust** plateau a
few OVR short. Same engine drives AI clubs (each via their own coach + academy).

**Balance result (probe).** A well-managed youth-only club from €5k reaches
L1-quality (best-4 OVR ~80) around **season ~27**, peaking ~82, staying solvent —
**hard but possible**, as targeted. Reach gradient: infra5+coach90+starter → ~76
peak (occasional 80+); infra3+coach65 → ~65; neglected → ~43 (talent wasted).
