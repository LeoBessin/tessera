# 3. Isometric rendering via real 3D under an orthographic camera

- Status: accepted, amended by [ADR 8](0008-generated-art-must-be-detailed.md)
- Date: 2026-11-10

## Context

The art direction is isometric and procedurally geometric — shapes generated in
code, no sprite sheets, no models. The obvious choice for a 2D game is PixiJS,
and it was the initial recommendation.

## Decision

Three.js with an `OrthographicCamera`, not PixiJS.

**The simulation stays two-dimensional.** It knows a ground plane of `(x, y)`.
The renderer maps that to the scene's `(x, z)`. Three.js is an adapter; the
domain never imports it.

## Consequences

The combination of *isometric* and *geometric* is what flips the decision:

**Depth sorting disappears as a problem.** Faking isometry in 2D means sorting
sprites by hand, and the resulting occlusion bugs — a pillar drawn over the
character standing behind it — are the genre's classic failure. A z-buffer
solves this correctly and for free.

**Lights and shadows cost nothing and matter enormously.** The main reason
primitive geometry looks cheap is flat shading. A directional key light with
soft shadows is a few lines here and is not available in 2D without faking it.

**The art is already code.** `BoxGeometry`, `OctahedronGeometry` and
`InstancedMesh` *are* procedural geometric art. There is no asset pipeline at
all, and the entire visual direction is diffable text under version control.

> ADR 8 narrows this paragraph: it is a claim about the *pipeline*, not a
> standard for the finished look. Primitives are placeholders, and generated
> forms are required to be detailed.

**An orthographic camera at `(1, √2/2, 1)` is true isometric**, not an
approximation of it.

**Input must be rotated.** With the camera on the world diagonal, "up" on the
keyboard is not "up" in the world. `screenToWorld` handles this and is tested;
getting it wrong is the most disorienting bug an isometric game can ship.

**The bundle is larger.** Three.js costs roughly 200 kB gzipped against
PixiJS's ~110 kB. For a game with a fifteen-hour campaign this is not a
meaningful trade.

**The scenery is drawn from the simulation's PRNG**, so every client in a party
generates an identical landscape, and content generation and gameplay share one
source of randomness rather than two that can disagree.
