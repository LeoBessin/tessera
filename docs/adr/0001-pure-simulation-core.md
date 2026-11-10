# 1. The simulation is a pure, dependency-free package

- Status: accepted
- Date: 2026-11-10

## Context

The game must be built test-first, run an authoritative server, predict on the
client, and be iterated on largely by AI. Those four requirements pull in the
same direction and are hard to satisfy separately.

Game logic is normally untestable for a mundane reason: it is tangled into the
render loop and the engine's object model. Phaser scenes, Godot nodes and Unity
`MonoBehaviour`s all put state and behaviour inside objects the engine owns and
drives, which means testing a rule requires booting an engine.

## Decision

`packages/sim` contains the entire game simulation as pure TypeScript with no
dependencies whatsoever — no npm packages, no Node built-ins, no browser
globals, no other workspace package.

Everything else is an adapter: Colyseus on the server, Three.js on the client.

## Consequences

**The client and the server run the same code.** Not equivalent code — the same
functions. `applyInput` is called by `CampaignRoom.step` and by the client's
reconciler. Prediction cannot drift from authority by construction, which
removes the most expensive class of multiplayer bug.

**Tests need no I/O.** The whole suite runs in under a second, which is what
makes a genuine test-first loop bearable rather than aspirational.

**Determinism becomes available.** A seed plus an input log reproduces a run.
That enables replay regression tests — the safety net that makes AI-driven
iteration tolerable, because a change that quietly alters how the game feels
cannot pass unnoticed.

**Some ceremony is the price.** State the simulation must mutate is passed in
rather than reached for, and the renderer has to be told about the world rather
than owning it. This is a real cost and it is worth paying.

**Enforcement is automated.** `pnpm arch` fails the build on any import that
crosses the boundary, including unresolvable ones — a rule cannot police a
module it could not resolve. Verified by deliberately introducing a violation
and watching it fail.
