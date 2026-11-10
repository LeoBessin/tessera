# 7. Three trades, and unlocks that branch per role

- Status: accepted
- Date: 2026-11-10
- Amends: [ADR 4](0004-per-player-progression.md)

## Context

Combat is ability-led and built around players combining with each other: few
basic attacks, several cooldown abilities, one restorer setting up what another
completes. That design wants players to bring *different* things, which means
roles.

ADR 4 modelled unlocks as a single flat `ReadonlySet<string>` per player. That
is exactly right for a game where everyone has the same kit and wrong for one
where they do not — a setter's ability appearing in a cutter's hands is not a
feature, it is the model failing to represent the game.

The constraint worth preserving is the one ADR 4 argues hardest for: progress
never decreases, and that guarantee is property-tested rather than asserted.

## Decision

**Three trades, chosen per session**, separated by how they act on the world
rather than by damage numbers:

| Trade | Acts on the world by |
| --- | --- |
| `cutter` | removing what is in the way |
| `setter` | putting the mosaic back |
| `keeper` | holding a place steady while the other two work |

**Unlocks branch per trade.** Each role carries its own never-decreasing set.
**The panel does not branch** — campaign position stays one number per player
under the existing `Math.max` rule.

Modelled as `Readonly<Record<Role, ReadonlySet<string>>>` rather than a map, so
every role always has a set and no caller has to decide what an absent one
means.

## Consequences

**ADR 4's invariant survives intact — it now holds once per trade instead of
once overall.** The property test generalised rather than being replaced: the
same arbitrary 200-operation sequences now assert that nothing is lost in any
of the three sets.

**A second, stronger property is now tested**: work in one trade cannot disturb
another. Granting a cutter ability leaves the setter's and keeper's sets
exactly as they were. This is what makes "pick a role per session" safe to
offer at all — without it, role choice would be a thing players could regret.

**Switching trade between sessions costs nothing earned.** A player who works
as a setter on Tuesday and a cutter on Thursday keeps both records and resumes
each where they left it.

**Three, not four.** Four roles would let a maximum party hold one of each,
which is tidy — but a party is two to four players, so a four-role design makes
a two-player session feel like it is missing half the game. With three, roles
repeat without awkwardness at every party size, and no party can be blocked by
an absent specialism.

**The unlock space is now three times larger, and content must pace three
tracks rather than one.** This is the real cost, and it lands on phase 4: the
graph validator has to prove every required ability is obtainable before it is
required *in each trade*, not once. Accepted because asymmetric roles are the
co-operative fantasy the combat design rests on; a shared kit would have kept
the domain simpler and made the parties duller.

**The repository port is unchanged.** `ProgressionRepository` stores a
`Progression`; that it now contains three sets rather than one is not the
adapter's business. The Postgres schema in phase 2 will need to represent them,
which is the one place this decision reaches outside the domain.
