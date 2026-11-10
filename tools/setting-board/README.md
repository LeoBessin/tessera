# Setting board

The trial board that produced the art direction in
[ADR 9](../../docs/adr/0009-the-art-direction-as-chosen.md): six complete mood
treatments and three sets of asset variants, rendered by real generators under
the game's own isometric camera rather than drawn as mockups.

Open `index.html` in a browser. Nothing to install — it pulls Three.js from a
CDN and renders eighteen stills through one WebGL context.

## Why it is in the repository

ADR 8 says the generator is the artwork. These generators are the prototypes
for phase 3's `apps/client/src/render/`:

- **tesserae** — a rounded square extruded with a real chamfer, instanced a few
  thousand times, laid in any of the four Roman patterns. `opus vermiculatum`
  is the one that was chosen.
- **restorers** — an articulated figure on a joint frame, with work clothes, an
  apron, a satchel and a tool. The `Crucible` build was chosen.
- **scavengers** — a plated carapace on jointed legs, carrying what it took.
  The `Hauler` build was chosen.

Two things here are worth keeping when the code moves into the client:

**Fog is depth beyond the focal plane, never absolute distance.** An
orthographic camera for an isometric view sits far outside the scene, so
absolute fog distances wash the entire frame to flat background. This blanked
four of the six mood tiles before it was spotted.

**Judge a generator across seeds, not at a seed.** The seed control exists for
that. A generator that looks good once has not been shown to work.

## What it is not

Not part of the build. Nothing imports it, `pnpm arch` does not cruise it, and
`tsc` never sees it. It is a decision record that happens to be executable, and
it is deliberately frozen at the state that made the decision.
