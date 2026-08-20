# DESIGN — Equipment & kit deals (rework proposal)

> **Status: zakres M w grze (2026-08-20).** Owner asked (2026-07-24): *"the kits system for
> the players sucks, it's just a free boost of money, stats and marketability —
> it needs better variety."* Numbers from the table below were signed off and shipped
> (families, grades, wear, adaptation, preference, kit demands). **Partner contract
> terms (scope L) and manager blade/sponge overrides are still later.**

---

## 1. Why the current system is a free boost (from the code)

| Layer | Today | Problem |
|---|---|---|
| `EQUIPMENT.rubberTiers` | tier 0 → 1 → 2, mods `{}` → `{fh+1,srv+1}` → `{fh+2,srv+1,ret+1}`, cost €0 → €900 → €2,600 per player | **Strictly monotonic.** More money is always better. There is no reason to ever pick tier 1 except budget |
| `TECH_PARTNERSHIPS` | 5 partners gated by prestige; the top one is `+1 all stats, +1 ATK/SRV, +35% marketability, +€10,000/season` | **Prestige ladder = power ladder.** The "choice" is "take the best one you're allowed to take". It also *pays you* to take the strongest |
| `EQUIPMENT.blades` / `sponges` | These *do* have real trade-offs (`OFF: fh+2,bh+1,ret−1`, `DEF: ret+2,men+1,fh−1`) | …but `fitEquipmentToStyle()` assigns them automatically. The player never makes the interesting choice |

So the one part with genuine trade-offs is hidden, and the two visible parts are
vending machines. **The fix isn't more numbers — it's making gear an identity
choice whose value depends on YOUR squad.**

---

## 2. Design principles

1. **Gear expresses identity, not power.** A kit should make a squad *play*
   differently, not uniformly better.
2. **Every gain has a cost.** No mod without a downside, at any price point.
3. **The right answer is squad-specific.** The best partner for a squad of three
   blockers must be the wrong one for a squad of topspin attackers.
4. **Money constrains, it doesn't multiply.** Cash buys *freshness and freedom*,
   not raw stats.
5. **It must hook into what already exists** — the 5 playing styles and their
   counter pentagon, morale/loyalty, the physio, and the new inbox.

---

## 3. The mechanics

### A. Rubber **families** replace rubber **tiers** *(core change)*

Five families, each with a clear identity. Proposed mods (per player, sign-off needed):

| Family | Mods | Suits | Hurts |
|---|---|---|---|
| **Tensor speed** | `fh +3, srv +1, ret −2` | Forehand topspin, two-winged attacker | Blocker, defender |
| **Tacky spin** | `srv +3, fh +1, foot −1, ret −1` | Two-winged attacker, spin styles | Counter/block |
| **All-round control** | `ret +2, men +1, fh −1` | Counter & block | Topspin attacker |
| **Short pips** | `ret +2, men +2, srv −1, fh −1` | Blocker, counter | Attacking styles |
| **Long pips / anti** | `ret +4, men +1, fh −3, srv −2` | Defender only | Everyone else |

Each family comes in three **grades** — *stock / tournament / pro*. The grade
scales the magnitude (×0.5 / ×1 / ×1.3), the **cost**, and the **wear rate**.
So the ladder survives, but only *inside a family you chose for fit*.

**Match hook:** long pips / short pips also nudge the style-counter table — a
defender on long pips gets a small extra edge against topspin attackers and a
small extra penalty against blockers. Gear becomes part of the counter game.

### B. Freshness & wear
- Every rubber has `freshness` 100 → 0, dropping per match played (pro grade
  drops ~2× faster than stock).
- Effective mods scale with freshness: 100% = full, 50% = half, 25% = quarter.
- Replacing costs money **per player, mid-season** — a real budget decision:
  fresh pro rubbers before the title run, or ride worn ones and save the wage bill.
- Physio/facility level can slow wear slightly (existing systems get a new use).

### C. Adaptation cost
- Changing a player's family costs **2–4 rounds at −2 to the affected stats**
  while he adapts. Younger players and high-MEN players adapt faster.
- Prevents free per-round min-maxing and makes a kit switch a *decision*.

### D. Player preference
- Every player has a **preferred family**, derived from style + traits.
- Match = +morale, small consistency bonus. Mismatch = −morale, −loyalty drift,
  and the small stat penalty from the family table.
- **Stars can demand their family** → an inbox thread with visible consequences
  (this is exactly the kind of content the mail rewrite needs).

### E. Partner contracts with *terms*, not just money
A partner no longer hands you a flat buff. A partner:
- **supplies 1–2 families** — signing them constrains what your squad can use;
- has **contract terms** you negotiate:
  - **Exclusivity** (only their families, more money) vs **open** (freedom, less money)
  - **Quota clauses**: "at least 2 players on our new model each round"
  - **Performance clauses**: Top 4 → bonus; relegation → payment cut
  - **Lock-in length** with a buy-out to leave early
- has a **relationship level** that grows over seasons and unlocks better terms
  and slow R&D improvements to their families.

Prestige still decides *who offers you a deal*. **Fit decides who's actually best.**

### F. Blade & sponge become visible choices
Keep `fitEquipmentToStyle()` as the default ("let the coach decide"), but let the
manager override per player, with the same adaptation cost. Micromanagers get
depth; everyone else keeps the automatic sane default.

---

## 4. What this changes at the table

Before: *"I have prestige 46, so I take Butterfly, +1 to everything, +€1,000."*

After: *"My squad is two topspin attackers, a blocker and a defender. The speed
partner pays best but wrecks my blocker and my defender, and their exclusivity
clause blocks long pips. The regional partner pays less, supplies control and
pips, and my defender is demanding pips in writing. Do I take the money and
rebuild the squad around speed, or take the fit and stay balanced?"*

That's a decision. It also gives the AI clubs a visible identity — a "speed club"
vs a "control club" — which feeds the living-world work in M2.

---

## 5. Scope options (owner picks)

| Scope | Contains | Effort |
|---|---|---|
| **S — small** | Families + grades + wear/freshness. Partner value = fit with your squad | ~1 batch |
| **M — medium** *(recommended for EA)* | S + adaptation cost + player preference + kit demands in the inbox | ~2 batches |
| **L — full** | M + contract terms (exclusivity/quota/performance/lock-in) + relationship level + R&D | ~3–4 batches |

**Recommendation: build M for Early Access, L as a post-launch content patch.**
**Shipped: M.** Scope L (exclusivity / quota / R&D) remains unbuilt. Worn rubbers floor at zero (Q3). AI clubs get family identities at generation (Q4).

## 6. Do it in the same pass as the brand rename

Blocker #1 in `ROADMAP.md` (real trademarks: Butterfly, Tibhar, Andro, DHS, Xiom,
Donic, Stiga) touches exactly this data. Renaming to fictional partners while the
structure changes anyway is nearly free; doing it later means touching it twice.

## 7. Open questions for the owner

1. Scope: **S, M or L**?
2. Are **five families** the right count, or fewer (3) for readability?
3. Should worn rubbers ever *hurt* below stock level (i.e. can neglect make a
   player worse than free gear), or floor at zero?
4. Should AI clubs get partner identities too from day one (recommended — it's
   most of the flavour for one extra loop)?
