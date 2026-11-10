# 6. Restraint as the art direction, and colour as the progress bar

- Status: accepted, amended by [ADR 8](0008-generated-art-must-be-detailed.md),
  values fixed by [ADR 9](0009-the-art-direction-as-chosen.md)
- Date: 2026-11-10

## Context

ADR 3 settled the *technique* — real 3D under an orthographic camera,
procedural geometry, no asset pipeline — and said nothing about what the art
should look like or mean. The palette in `scene.ts` was arrived at by internal
logic rather than by pointing at anything: cold near-black blues, one warm key
light, saturation reserved for players. It works, but nothing recorded why, and
nothing said where it should go as the campaign progresses.

ADR 5 then gave the game a subject — a broken mosaic, restored panel by panel —
which raises the obvious question of whether the world should visibly change as
it is repaired.

## Decision

**The reference is Scandinavian and Japanese minimalism**: restraint as the
organising principle, negative space, few elements, nothing decorative.

Restraint here governs *composition and palette* — what is included, and in
what colour. It does not govern how well the included thing is made. ADR 8
draws that line explicitly, because minimalism is otherwise easy to read as a
licence for crude forms, which neither reference supports.

**Colour returns to restored panels.** Unrestored work stays cold and
desaturated — the palette as it exists today. A restored panel regains
saturation and keeps it.

## Consequences

**The current palette is the "before" state, not the whole look.** Everything
in `scene.ts` today — `#11131a` background, `#1e2230` ground, `#39415a`
scatter — describes a world that has not been put back yet. That reframing
costs nothing to implement, because the materials already exist; what changes
is that they are now one end of a range rather than the entire scheme.

**Fifteen hours of progress are continuously visible with no UI at all.** The
player can see how far they have got by looking around. For a game whose
campaign is long and linear, this is the single highest-value thing the premise
offers, and it is free.

**Restoration means resolution, not opulence** — and this is the consequence
most likely to be got wrong later. Byzantine mosaic, the real art the premise
is named after, is dense, gold-ground and ornamental. It was considered as a
reference and deliberately rejected. The restored state here is not *richer*
than the broken one, it is *right*: fewer elements, not more; the colour that
returns is sparing and carefully chosen, not abundant. Anyone who later
proposes to make restored panels more decorative is overturning this decision
and should say so.

**The player teal now has competition.** `#6fd3c7` is currently the only
saturated colour in the frame, which is what makes players instantly legible.
Once restored panels carry colour too, that readability is no longer free. The
rule going forward: **players remain the most saturated thing on screen**, and
the restored palette is chosen to leave that headroom. If it cannot, players
need a different signal — emissive, outline, scale — and the palette is not
allowed to take it by accident.

**Audio follows the same discipline.** Phase 5 already commits to synthesised
audio through the Web Audio API to keep the zero-asset pipeline. Minimalism
makes that a virtue rather than a limitation: sparse, tonal, long silences.
A dense score would contradict the picture.

**The palette becomes data, not constants.** Two material states per surface —
unrestored and restored — mean `PALETTE` stops being a frozen object in
`scene.ts` and becomes something a panel's content can reference. That belongs
with phase 4's content pipeline, not before it.

**Accessibility is affected and is not optional.** Progress encoded as
saturation is progress invisible to some players. The colour-blind-safe palette
already promised in phase 5 now has a second job — it must preserve the
restored/unrestored distinction without relying on hue alone, which most
plausibly means value contrast or completeness of form carrying the same
signal redundantly.
