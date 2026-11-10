# 4. Progression belongs to the player, not the party

- Status: accepted, amended by [ADR 7](0007-three-trades-and-per-role-unlocks.md)
- Date: 2026-11-10

## Context

A fifteen-hour linear campaign played co-operatively by two to four friends
raises an unavoidable question: when the party advances, whose progress moved?

A shared party save is simpler, and wrong for how people actually play. It
means you cannot play without your friend, and that one person's schedule
dictates everyone's.

## Decision

Each player owns their own progression. The party plays at the host's point in
the campaign, and everyone present is credited for what they actually play.

Modelled in `packages/sim/src/progression/progression.ts` as an immutable value
with a single governing invariant: **progress never decreases**.

- `reachCheckpoint` takes `Math.max(current, reached)` for the chapter, never
  the newer value
- the respawn point, by contrast, always follows the player, because they have
  to come back to life where they actually are
- `grantUnlock` only ever adds
- `mergeProgression` resolves two views by taking the best of both

ADR 7 later split unlocks by trade. Every invariant below still holds — the
monotonicity guarantee simply applies once per role now rather than once
overall, and the `Math.max` on the chapter, which is the part this ADR argues
hardest for, is untouched.

## Consequences

**Replaying early content with a friend cannot rewind your campaign.** A player
at chapter 5 who joins a chapter 2 session stays at chapter 5. That single
`Math.max` is the whole mechanism.

**Dropping into a session ahead of you credits what you play.** A player at
chapter 2 who reaches a chapter 5 checkpoint advances to 5. This is the Deep
Rock Galactic model: credit follows participation. It does mean skipping
content you have not seen — a deliberate trade in favour of playing with your
friends when they are free.

**Death cannot cost progress.** `recordDeath` touches only a counter. Combined
with the monotonicity invariant, "death is not punitive" is a property the
domain guarantees rather than a promise spread across whatever code handles
dying.

**The invariant is property-tested**, not merely asserted: arbitrary sequences
of up to two hundred operations are checked to never reduce the chapter or
remove an unlock.

**Persistence is a port.** `ProgressionRepository` has an in-memory adapter
today; a Postgres one slots in behind it without the room changing. Progress is
saved on leave, so a disconnect keeps what was earned.
