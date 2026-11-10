# Tessera — working rules

A co-operative isometric action game for the browser. Two to four players, a
roughly fifteen-hour linear campaign, keyboard only, and death that costs
seconds rather than progress.

The world was a single mosaic and has been broken apart. Players are
**restorers** sent to re-lay it; a chapter is a **panel**, and restoring one
reveals what it depicts, so repairing the world and learning its story are the
same act. **Scavengers** pull it apart for their own purposes. The register is
quiet and melancholy. See `ROADMAP.md` for the whole shape and
`docs/adr/0005-the-mosaic-premise.md` for why.

Development is AI-driven, so the guarantees below are enforced by CI rather
than by anyone remembering them. Read this before changing anything.

## The one rule everything else follows from

**`packages/sim` is the game. It depends on nothing.**

No npm packages, no Node built-ins, no browser globals, no other workspace
package. Everything it needs arrives as an argument.

This is not purism:

- The authoritative server and the predicting client run *the same* functions.
  Not equivalent implementations — the same ones. Prediction cannot drift from
  authority because there is only one set of rules.
- The whole game is testable at thousands of ticks per second with no I/O.
- A seed plus an input log reproduces a session exactly, which is what makes
  replay regression testing possible.

`pnpm arch` enforces it. It also fails on unresolvable imports, because a rule
cannot police a module it could not resolve.

## The dependency graph

```
apps/client  ─┐
              ├─> packages/protocol ─> packages/sim ─> (nothing)
apps/server  ─┘
```

Arrows never reverse. If something in `sim` seems to need something from
`protocol` or an app, the dependency is pointing the wrong way — invert it by
passing the thing in.

| Package | Responsibility |
| --- | --- |
| `packages/sim` | Rules, physics, progression, replay. Pure and deterministic. |
| `packages/protocol` | Wire schemas. Data only — a method here is a rule only one side knows. |
| `apps/server` | Colyseus adapter. Owns sockets and persistence, owns no rules. |
| `apps/client` | Three.js renderer, keyboard, prediction. Owns pixels, owns no rules. |

## How to work

Write the test first. In `sim` this is not aspirational — the code is pure, so
there is no excuse available.

1. **Express the behaviour as a test**, in the vocabulary of the game. Test
   names are sentences about the game, not about the function.
2. **Watch it fail.** A test that has never failed has never been shown to test
   anything.
3. **Make it pass** with the smallest change that is honest.
4. **Run `pnpm verify`** — typecheck, architecture, full suite.

Prefer a property test when a rule holds for *all* inputs. `applyInput` is
clamped for every possible command, not for the three someone thought of; it is
tested that way with `fast-check`.

## Replay digests

`packages/sim/src/replay/fixtures.ts` holds recorded sessions and the digest
each one is expected to produce. The test suite replays them on every run.

A digest that moves means the game now plays differently. That is not
automatically a bug — it is a question:

- **Intended?** Run `pnpm replay:bless` and commit the new digest *in the same
  commit as the change that caused it*, so the diff shows cause and effect
  together.
- **Not intended?** Something broke. The digest is the only warning you get.

Never bless a digest to make a red build green without knowing why it moved.

## Design contracts that code must keep

These are product decisions encoded as tested invariants. Changing the
behaviour means changing the decision, not just the code.

- **A Google account is required to play.** There is no anonymous path, no
  guest mode and no local-only fallback. Identity is derived *only* from the
  Google subject claim on a server-verified JWT — never from email, which
  people change, and never from anything the client sends. Not yet
  implemented; see phase 1 of `ROADMAP.md`.
- **Progress is per player and never decreases.** `reachCheckpoint` takes the
  maximum chapter, never the newer one, so playing early content with a friend
  cannot rewind a campaign. Dropping into a session ahead of you credits what
  you actually play. Property-tested over arbitrary operation sequences.
- **Unlocks branch per trade; the panel does not.** A player works as a
  `cutter`, `setter` or `keeper`, chosen per session, and carries a separate
  never-decreasing unlock set for each. Campaign position stays one number
  under the `Math.max` rule. Two properties hold it: nothing is ever lost in
  any trade, and work in one trade cannot disturb another — which is what makes
  picking a role per session safe to offer.
- **Death costs a tally and nothing else.** `recordDeath` touches only a
  counter. A downed player stays in the world and returns at their checkpoint
  with full health after a few seconds.
- **Keyboard only.** Input is modelled as intents, never as `KeyboardEvent`.
  Rebinding is a data change. Nothing downstream of `IntentState` knows a
  keyboard exists.
- **Diagonal movement is not faster.** Commands are clamped to the unit disc in
  `sanitizeCommand`, which also means a hostile client cannot buy speed.
- **The camera is isometric, so input is rotated.** `screenToWorld` puts
  movement where the player can see it going.
- **Every asset is generated by code, and generated is not an excuse for
  crude.** No asset pipeline, no models, no textures — and the generated forms
  must be detailed. Restraint governs composition and palette; craft governs
  form and surface. What `scene.ts` draws today is a *placeholder*, marked as
  such in the file.
- **Colour is the progress bar.** Restored panels regain saturation, unrestored
  ones stay cold, so progress is visible by looking around. Players must remain
  the most saturated thing on screen; a palette change that breaks that has
  broken the contract, not just the look.
- **The renderer never advances the simulation's PRNG.** It makes its own
  instance from the shared seed. Generated detail must never be able to move a
  replay digest.

## Conventions

- TypeScript throughout, `strict` plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. Internal packages export source; nothing emits
  JavaScript. `tsc` is a type checker here, not a compiler.
- Imports carry the `.ts` extension. Resolution is bundler-style everywhere.
- Comments explain *why*. The code already says what.
- `sim` mutates entity state in place where Colyseus requires it (schema
  synchronisation observes mutation), and is otherwise value-oriented.

## Commands

| Command | Does |
| --- | --- |
| `pnpm verify` | Everything CI runs. Use this before saying you are done. |
| `pnpm test` | Unit, property and replay tests |
| `pnpm test:watch` | The `sim` suite, watched |
| `pnpm typecheck` | All four packages |
| `pnpm arch` | Dependency boundaries |
| `pnpm replay:bless` | Recompute replay digests — deliberately |
| `pnpm dev` | Server on :2567, client on :5173 |

## Decisions

Architectural decisions and the reasoning behind them live in `docs/adr/`.
Read the relevant one before overturning it, and write a new one when you do.

ADRs 1–4 are the architecture: the dependency-free core, Colyseus, isometric
via an orthographic camera, per-player progression. ADRs 5–9 are the game: the
premise, the art direction, the three trades, the detail standard, and the
concrete palette and silhouettes chosen from `tools/setting-board/`.

## Deployment

Coolify, from `docker-compose.yaml`. Two services: the Colyseus server and the
static client behind nginx.

The client's server URL is **inlined at build time** by Vite. Changing it
requires a rebuild, not a restart. In production it must be `wss://` — a page
served over HTTPS cannot open a plaintext socket, and the failure is silent.
