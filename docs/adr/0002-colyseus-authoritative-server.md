# 2. Colyseus for authoritative netcode, with prediction sharing the domain

- Status: accepted
- Date: 2026-11-10

## Context

Real-time action over the internet needs an authoritative server, client-side
prediction so input feels immediate, reconciliation when the two disagree, and
lag compensation so hit tests resolve against what the shooter actually saw.

Writing that from raw WebSockets is weeks of subtle work. The alternatives
considered were Nakama (Go; heavier, oriented at larger persistent worlds),
raw `ws` with bespoke sync (maximum control, maximum cost), and PartyKit (tied
to Cloudflare, which rules it out for Coolify).

## Decision

Colyseus 0.18 on Node, via `@colyseus/core` and `@colyseus/ws-transport`
directly rather than the `colyseus` meta-package — which pulls a git-sourced
`uWebSockets.js` that pnpm blocks, and which we do not need.

The client uses `@colyseus/sdk` 0.18 (`colyseus.js` is the legacy package name
and its latest release predates this protocol).

## Consequences

Colyseus 0.18 supplies exactly the pieces required, and its design assumes the
shared-domain approach that ADR 1 arrived at independently:

- `setFixedTimestep(step, 30)` runs the authoritative loop and advertises the
  rate to predicting clients
- `defineInput(MoveInputSchema, { bufferMaxSize })` buffers inputs per client
- `predict.reconciler(self, { step })` replays unacknowledged inputs on the
  client using a step function we supply — ours is `applyInput` itself
- `predict.attachAll('players', { mode: 'damped' })` smooths other players,
  whose inputs are not ours to guess
- `allowRewindState({ maxRewindMs: 500 })` records positions for lag compensation

**Schema instances are simulation values.** `PlayerSchema` structurally
satisfies `MoveState`, so `applyInput` operates on a schema instance directly —
no adapter, no copying, and no import of Colyseus by the simulation. Guarded by
tests in `packages/protocol/src/boundary.test.ts`.

**Schemas are declared without decorators**, using `schema({ x: t.float32() })`.
This avoids configuring experimental decorators under TypeScript 7.

**Authority is real but unparanoid.** This is co-operative play, not
competitive. The server validates what keeps the simulation coherent — input
magnitude, who is allowed to move — and does not spend effort on an adversary
who can only cheat themselves. If PvP is ever added, this reasoning expires and
the decision must be revisited.

**Redis is deliberately absent.** Parties of four mean one Node process hosts
hundreds of rooms. `RedisPresence` and `RedisDriver` are a two-line change when
one container stops being enough, so deferring them costs nothing.
