# Shared Current and Peak Rating Design

## Goal

Every place that summarizes a player or staff member uses one five-star visual
language. The only rating number shown in lists is current OVR. Gold fill shows
current ability, a gold outline extends to the potential peak, and a dim outline
completes the five-star scale. The exact peak OVR number is reserved for the
opened player or staff profile.

The system must make potential visible at a glance without exposing a second
number in dense list views. It replaces the transfer market's separate star
formula and all screen-specific current/peak presentations.

## Considered approaches

### 1. One layered five-star component backed by `ratingProfile` (selected)

All consumers pass current OVR and an optional known peak into one renderer.
Each star slot contains a dim outline, a clipped gold outline, and a clipped
gold fill. This supports fractions without inventing extra rating formulas and
keeps transfer, squad, academy, and staff displays identical.

### 2. Separate filled and outlined star rows

Two rows would be straightforward, but users would need to compare them rather
than read a single range. It would also consume too much vertical space in
transfer and squad cards.

### 3. Reuse the existing clipped text glyphs and add another text layer

This would be a smaller patch, but font-dependent star glyphs and text strokes
render inconsistently across platforms. Their outlines also become muddy when
partially clipped. A small inline SVG star is deterministic in the packaged
Electron build and remains crisp at every supported size.

## Rating contract

The existing `gameplay.ratingProfile(currentOvr, peakOvr)` remains the single
calculation boundary. Its five-star scale is authoritative:

```text
current stars = clamped current OVR / 20
peak stars    = clamped max(current OVR, known peak OVR) / 20
slots         = 5
```

The profile normalizes malformed and out-of-range values. Renderers do not
repeat clamping or create alternative transfer-market scales.

If peak is absent or not trustworthy, the caller marks it unknown. The visual
then ends the gold range at current OVR and uses dim outlines for the remaining
scale. It must not imply invented potential, and a profile must omit the exact
peak row rather than display a fabricated value.

## Visual semantics

Each of the five fixed slots has three stacked layers:

1. a dim neutral outline across the whole star;
2. a gold outline clipped to the peak fraction;
3. a solid gold fill clipped to the current fraction.

The order makes the three meanings mutually exclusive to the eye: solid gold
is current ability, unfilled gold contour is reachable peak, and the remaining
dim contour lies beyond that peak. A value of current 62 and peak 84 therefore
renders 3.1 filled stars, another 1.1 stars of gold contour, and 0.8 stars of
dim contour.

Fractions are continuous rather than rounded to half-stars. The shared
component has compact, standard, and profile sizes, but color, spacing, star
geometry, and rating math stay the same. It fits the existing dark interface
and uses the game's established gold accent rather than introducing another
status color.

## Shared renderer

A pure UI helper renders the layered star markup from a normalized rating
profile. Inline SVG paths sit inside clipped wrappers, so fractional widths do
not require per-render SVG IDs. The helper owns:

- the five fixed star slots;
- current-fill and peak-outline fractions for each slot;
- compact, standard, and profile presentation classes;
- safe accessible labeling;
- an optional visible current-OVR label controlled by the consuming layout.

The renderer has no dependency on a page or modal and never looks players up in
global state. Pages remain responsible for deciding whether peak is known and
whether the exact peak number is permitted in that context.

## Information disclosure

List and card summaries show only one numeric rating: current OVR. Their stars
may communicate peak through the gold contour, but neither visible text,
tooltips, titles, hidden labels, nor accessible names reveal the exact peak
number.

Opened profiles show current OVR and, when known, an explicit numeric Peak OVR
beside the same shared star component. This rule applies to both players and
staff who have a peak or ceiling value. The UI does not expose internal
potential-roll fields or scouting implementation details.

Accessible list labels name current OVR and explain that the outline represents
potential without stating its exact number. Profile labels may include the
numeric peak because it is already visible there. The English and Polish
translations convey the same information and never fall back to raw keys.

## Screen coverage

The component replaces local rating displays in:

- the transfer-market results and related transfer cards;
- the senior squad and match-selection surfaces;
- academy prospect and academy report cards;
- player cards and the opened player profile;
- staff lists, staff-market/history cards, and the opened staff profile when a
  peak or ceiling exists;
- any compact club overview that repeats one of those player or staff cards.

On every list, the adjacent number remains current OVR only. The exact peak
number appears only inside the opened profile. Academy or scouting copy may
continue to describe potential qualitatively when that text is a distinct game
mechanic, but it must not add another numeric peak outside the profile.

## Transfer-market behavior

Transfer sorting and numeric OVR filtering continue to use current OVR only.
The existing star filter is converted to the authoritative current-star value
from `ratingProfile`; it does not consider peak and does not keep the market's
old `(OVR - 45) / 10` display scale.

Potential outlines are informational. They never change result ordering,
asking price, AI valuation, eligibility, or negotiations.

## Interaction and responsive behavior

Stars are informational and do not introduce hover-only behavior or a new click
target. Existing card/profile actions retain their current hit areas.

At narrow widths, the component may use its compact size but must retain all
five slots and all three visual layers. It must not hide peak outlines, wrap
individual stars, or replace them with a second number. High-contrast outlines
and non-color distinctions (fill versus contour) keep the meanings readable
without relying on hue alone.

## Failure behavior

- A missing peak produces no gold potential extension and no numeric Peak OVR.
- A peak below current is normalized to current; the UI never draws potential
  backwards.
- Malformed values use the safe normalized `ratingProfile` output and never
  generate invalid widths or broken markup.
- Exactly 0 and 100 OVR render valid empty/full endpoints.
- Names and other user-visible text are escaped independently of the rating
  markup.

## Verification

Focused tests prove:

1. rating endpoints and fractional current/peak values produce five slots with
   the expected clipped layer widths;
2. a peak below current cannot create a negative outline range;
3. unknown or malformed peak data does not invent potential;
4. transfer, squad, academy, player, and staff lists use the shared component
   and expose only numeric current OVR;
5. player and applicable staff profiles expose the exact numeric Peak OVR;
6. market star filtering uses current stars from `ratingProfile`, never peak;
7. English and Polish output contains translated accessible labels and no raw
   translation keys;
8. compact layouts preserve five stars and the current/peak/beyond distinction.

After focused tests, the stage runs syntax checks and the complete automated
suite. A packaged-layout smoke check covers the transfer market, squad,
academy, player profile, staff list, and staff profile at desktop and narrow
viewport widths.

## Out of scope

- Changing OVR, development, scouting, valuation, or transfer-balance formulas.
- Revealing the precise peak number in list views or tooltips.
- Reordering transfer results by peak or adding a potential filter.
- Redesigning the surrounding cards, profiles, or navigation beyond the space
  needed for the shared rating component.
