# 9. The art direction, as chosen

- Status: accepted
- Date: 2026-11-10
- Resolves: [ADR 6](0006-colour-is-the-progress-bar.md),
  [ADR 8](0008-generated-art-must-be-detailed.md)

## Context

ADRs 6 and 8 set the principles — restraint in composition, craft in form,
colour as the progress bar, everything generated — without fixing a single
value. Principles do not tell a generator what to emit.

A setting board was generated to decide them: six complete mood treatments and
three sets of asset variants, rendered by real Three.js generators under the
game's own orthographic camera rather than drawn as mockups, so what was being
chosen between was generators and not pictures.

## Decision

**Mood: Ash Dawn.** The palette the project already had, confirmed rather than
replaced, and now with its restored half defined.

| Role | Value |
| --- | --- |
| Background | `#11131a` |
| Ground | `#1b1f2b` |
| Unrestored tesserae ramp | `#2b3243` → `#454e67` |
| Restored tesserae ramp | `#74988b` → `#cfbb8c` |
| Key light | `#fff0d8`, intensity 2.3 |
| Hemisphere fill | sky `#fff0d8`, ground `#4a5a8a`, 0.5 |
| Player accent | `#6fd3c7` |

Fog is stated as depth **beyond the focal plane** — roughly −4 to +44 world
units — never as an absolute distance from the camera. An orthographic camera
for an isometric view sits far outside the scene, so absolute fog distances
silently wash the whole frame to flat background. This cost an afternoon on the
board and is the kind of thing that is obvious exactly once.

**Laying: *opus vermiculatum*.** Rows that follow a contour, each piece turned
to the tangent.

**Restorer silhouette: Crucible.** Heavy-set, carrying a hod of tesserae on one
arm.

**Scavenger silhouette: Hauler.** A heavy plated body on six short legs, back
loaded with what it has taken.

## Consequences

**The renderer's palette barely moves, and that is the useful result.** Ash Dawn
is what `scene.ts` already paints, so the existing constants were right and ADR
6's claim that they describe the "before" state is now settled rather than
asserted. What is genuinely new is the restored ramp: `#74988b` → `#cfbb8c` is
the colour that returns, and it was chosen to sit well below `#6fd3c7` in
saturation so players remain the most saturated thing on screen, which ADR 6
requires and which a warmer restored palette would have broken.

**Vermiculatum is the expensive choice, taken deliberately.** A strict grid is
cheaper to generate, cheaper to validate and easier to make look tidy. Rows that
follow a contour are none of those things — but they are the only one of the
four laying patterns whose rows can *carry an image*, and a panel whose whole
job is to depict something cannot be laid in a pattern that cannot depict. The
cost lands in phase 4: content has to supply contours, not just extents, and the
graph validator has to check them.

**The figures are articulated, not composed.** Both chosen silhouettes came from
generators built on a joint frame — ankle, knee, hip, waist, chest, shoulder,
neck, head for a restorer; carapace, jointed legs, mandibles for a scavenger —
rather than from stacked primitives. That is what ADR 8's detail mandate means
in practice for anything that moves, and it is the standard phase 3 inherits.

**One question this does not answer.** The restorer variants were silhouettes,
and exactly one was chosen — but ADR 7 established three trades. Crucible was
described on the board as reading "setter rather than cutter", which is either a
problem or the answer: either Crucible is the shared base build and the trades
are distinguished by tool and colour alone, or it is the setter's build and the
cutter and keeper need silhouettes of their own. Deciding that is phase 3 work
and is listed as an open thread; building three trades on one silhouette by
default, without noticing the choice was made, is the failure to avoid.

**The board is not the implementation.** Nothing here is in `apps/client` yet.
The generators exist only as the board that produced these decisions, and
porting them into `src/render/` — replacing the primitives `scene.ts` now marks
as placeholders — is phase 3.
