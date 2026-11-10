# Tessera

A co-operative isometric action game for the browser.

Two to four players, a roughly fifteen-hour linear campaign, played entirely
from the keyboard. Death costs a few seconds and a walk back, never progress.
All art is procedural geometry — there is no asset pipeline.

## Quick start

```bash
pnpm install
pnpm dev        # server on :2567, client on :5173
```

Open <http://localhost:5173>. Move with WASD or the arrow keys. Open a second
tab to see another player join the same session.

```bash
pnpm verify     # typecheck · architecture · tests — everything CI runs
```

## Layout

```
packages/sim       the game: pure, deterministic, dependency-free
packages/protocol  wire schemas shared by both sides
apps/server        Colyseus adapter
apps/client        Three.js renderer, keyboard, prediction
```

The dependency graph runs one way only, and `pnpm arch` fails the build if it
ever stops doing so:

```
apps/client  ─┐
              ├─> packages/protocol ─> packages/sim ─> (nothing)
apps/server  ─┘
```

`packages/sim` is the whole game and depends on nothing at all — not a library,
not a Node built-in, not a browser global. That is what lets the authoritative
server and the predicting client execute literally the same functions, and what
lets the entire game be tested without any I/O.

## Testing

Unit tests for rules, property tests (`fast-check`) for invariants that must
hold over *all* inputs, and replay tests that run recorded sessions and compare
a digest of the result.

The replay digests are the regression gate: a change that quietly alters how
the game feels moves a digest and fails the build. When that is intended, run
`pnpm replay:bless` and commit the new digest alongside the change.

## Deployment

Coolify, from `docker-compose.yaml` — a Colyseus server and the static client
behind nginx.

The client's server URL is inlined by Vite at build time, so changing it needs
a rebuild rather than a restart, and in production it must be `wss://`.

## Documentation

- `CLAUDE.md` — working rules, conventions, and the contracts code must keep
- `docs/adr/` — architectural decisions and the reasoning behind them
