# Roadmap

From the current walking skeleton to a finished fifteen-hour co-operative
campaign.

Each phase states what "done" means in terms a test can check. Phases are
ordered by dependency, not by appetite: phase 1 comes first because nothing
downstream of it is meaningful until identity is real.

Read `CLAUDE.md` for the working rules and `docs/adr/` for why the
architecture is the way it is.

---

## Phase 0 — Foundations · **done**

The walking skeleton, verified end to end.

- Pure, dependency-free simulation (`packages/sim`) — 100 tests, 98% coverage
- Authoritative Colyseus server at 30 Hz with client-side prediction running
  the *same* `applyInput`
- Isometric Three.js renderer under an orthographic camera, procedural geometry
- Keyboard-only input modelled as intents
- Per-player progression with a property-tested monotonicity invariant
- Replay-digest regression gate, architecture boundaries enforced in CI
- Both Docker images build, run and report healthy

Players can connect, move, be downed and revive. There is no combat, no
content, and no identity.

---

## Phase 1 — Google sign-in, required to play

**The game is not playable without a connected Google account.** There is no
anonymous path, no guest mode, and no local-only fallback.

This phase comes first because progression is currently keyed on
`client.sessionId` — a value thrown away when the socket closes. Every hour of
campaign built before identity is real is an hour of progress that cannot be
saved to anybody.

### Work

- Add `@colyseus/auth` and register Google as an OAuth provider:
  `auth.oauth.addProvider('google', { key, secret, scope: ['openid', 'email', 'profile'] })`
- Add a `static async onAuth(token, options, context)` to `CampaignRoom` that
  calls `JWT.verify(token)` and returns the payload. An unverified token must
  throw, and the join must fail — not degrade to a guest.
- Derive the player identity from the Google subject claim (`sub`), which is
  stable, unique, and never reassigned. **Do not key on email**: people change
  theirs, and that would silently orphan a campaign.
- Replace the `?? client.sessionId` fallback in `CampaignRoom.#playerIdOf` with
  the verified identity. The fallback must be *deleted*, not left unreachable.
- Client: a sign-in screen owned by a new `apps/client/src/auth/` module. The
  canvas does not mount until a session exists.
- Token lifecycle: storage, refresh before expiry, sign-out, and a clean
  reconnect when a token expires mid-session.
- Party invites: a room code or invite link, so friends can reach each other's
  sessions now that rooms are tied to accounts.

### Guard rails

- Identity is **only** ever derived from the verified JWT on the server. A
  `playerId` arriving in a join payload is ignored. Add a test that a forged
  identity in room options does not influence which save is loaded.
- Store the minimum: Google subject, display name, avatar URL. Nothing else.
- Keep `packages/sim` untouched. Authentication is a server adapter concern and
  must not reach the domain — `pnpm arch` will enforce this.

### Needs a human (cannot be AI-managed)

Create the OAuth client in Google Cloud Console: a project, an OAuth consent
screen, a Web Application client, and authorised redirect URIs for both
`http://localhost:2567` and the production domain. Then supply
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Coolify secrets.

### Done when

A player with a Google account can sign in, play, close the browser, sign in
again days later and resume at their own checkpoint. A player without one
cannot join at all, and the refusal is legible rather than a hang.

---

## Phase 2 — Durable progression

Identity is stable, so progress can finally outlive a process.

- Postgres via Drizzle; schema as plain TypeScript so migrations are reviewable
- `PostgresProgressionRepository` behind the existing
  `ProgressionRepository` port — the room does not change
- Save on checkpoint as well as on leave, so a crash costs one room rather than
  a session
- `mergeProgression` on reconnect, so a conflict resolves upward and never
  destroys progress
- Postgres service added to `docker-compose.yaml`

**Done when** killing the server mid-session loses no progress beyond the last
checkpoint, proven by an integration test rather than by inspection.

---

## Phase 3 — The combat loop

The first genuinely playable slice, and the first real exercise of the netcode.

- Attacks, enemies, damage, death and co-operative revival
- Hit resolution through `allowRewindState` lag compensation, so a hit that
  looked fair on the attacker's screen resolves as one
- Enemy behaviour in `packages/sim`, deterministic and seeded — never
  `Math.random`
- Dash on the existing `dash` intent, with a cooldown
- One complete chapter: arrival, checkpoint, encounter, reward, exit

**Done when** two players can clear a chapter together, and a new replay
fixture covering combat holds its digest.

---

## Phase 4 — The content pipeline

The phase that decides whether fifteen hours is achievable or merely intended.

- Chapters as **validated data**, not code, in `packages/content`
- Zod schemas for every content type, so malformed content fails at build time
- A graph validator run in CI: every chapter reachable, no soft-locks, every
  required unlock obtainable before it is required
- A pacing budget per chapter (estimated minutes), summed and asserted against
  the fifteen-hour target
- Content authoring documented well enough that adding a chapter touches no
  engine code

**Done when** a chapter can be added, validated and played without a single
change to `packages/sim`.

---

## Phase 5 — The campaign

Build out roughly twelve to fifteen chapters to the fifteen-hour target.

- Difficulty and ability unlocks paced across the campaign
- Instrumentation: time-to-complete and deaths per chapter, to find the
  chapters that are actually too hard rather than the ones that feel it
- Audio, synthesised through the Web Audio API to match the procedural art
  direction and keep the zero-asset pipeline
- Accessibility: full key rebinding (already a data change), colour-blind-safe
  palette, adjustable text size

**Done when** a playthrough lands within 13–17 hours and no chapter is a
measurable outlier for deaths.

---

## Phase 6 — Production

- Deploy to Coolify from `docker-compose.yaml`; `wss://` throughout
- Structured logging, error reporting, uptime and room-count metrics
- Load test: how many concurrent parties does one container actually hold?
- Add `RedisPresence` and `RedisDriver` **only** once that number is the
  binding constraint — it is a two-line change and costs nothing to defer
- Backups for the progression database, with a restore that has been rehearsed

---

## Cross-cutting, every phase

- Test first. In `packages/sim` the code is pure, so there is no excuse.
- Property-test anything that must hold for *all* inputs, not for three
  remembered examples.
- Add a replay fixture whenever a new system changes how the game plays.
- Never bless a replay digest to turn a build green without knowing why it
  moved.
- `pnpm verify` passes before anything is called done.

---

## Known blockers

| Blocker | Impact | Owner |
| --- | --- | --- |
| Coolify TLS chain incomplete on `coolify.leo-bessin.dev` (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) | Blocks phase 6. Browsers reject `wss://` over a broken chain, so this fails the game, not merely tooling. | human |
| Google Cloud OAuth client not yet created | Blocks phase 1 entirely. | human |
| Repository has no commits; HEAD unborn | No child Orca worktrees can be created from it. | either |
| Branch is `master`; CI triggers on `main` | CI will not run on push. | either |
