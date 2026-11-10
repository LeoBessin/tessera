# 5. The world is a mosaic, and restoring it is the story

- Status: accepted
- Date: 2026-11-10

## Context

Until now the project had no fiction at all. Not a thin one — none. No setting,
no characters, nothing the campaign depicted. Four ADRs, a README and a roadmap
described a fifteen-hour co-operative campaign without once saying what it was
about.

That was defensible while phase 0 was a walking skeleton; none of the
architecture needed a theme to be decided correctly. It stops being defensible
at phase 4, which turns chapters into validated data authored by someone other
than the engine. You cannot author a chapter without knowing what a chapter
depicts, and you cannot write a content schema for a subject you have not
chosen. The fiction becomes load-bearing one phase before it is needed.

## Decision

**The world was a single mosaic, and it has been broken apart.**

- **Players are restorers** — craftspeople sent to re-lay it. They are
  outsiders with a trade, not natives of the place and not its survivors. They
  were not here when it broke; they arrived to repair it.
- **A chapter is a panel of the mosaic**, and restoring a panel reveals what it
  depicts. The work and the narrative are the same act.
- **The opposition is scavengers**, pulling the mosaic apart for their own
  purposes. Not weather, not entropy, not a spreading decay — people, with
  intent.

The register is quiet, melancholy and contemplative throughout.

## Consequences

**The story is told by the art you repair.** No dialogue trees, no cutscenes,
no codex entries. A panel restored is a panel legible, and what it shows is
what you learn. This is the only narrative delivery mechanism the game has, so
if a thing cannot be depicted in a panel, the game cannot say it.

**"Advance the campaign" and "restore the mosaic" are one action**, which is
what makes a fifteen-hour linear structure feel like a single piece of work
rather than a sequence of levels.

**The name is now earned.** A tessera is one tile in a mosaic. It was a pretty
word before this decision and is a statement of subject after it.

**Choosing scavengers spends some of the melancholy, deliberately.** An
opposition with intent gives the ability-led combat of phase 3 something to be
about, and gives every panel built-in stakes — you arrive in time or you do
not. The alternative considered was erosion: a spreading unmaking with no
author, which holds the contemplative tone more purely but gives combat nothing
to mean. Conflict won. The tone is now carried by the palette, the pacing and
the audio rather than by the absence of an antagonist, and that is a heavier
load on the art direction than it would otherwise have been — see ADR 6.

**Restorers-as-outsiders is what makes three distinct trades coherent.** People
who arrive with a job have tools and specialisms; natives or animate fragments
would not obviously divide that way. The roles in ADR 7 follow from this
choice, not the other way round.

**Content authors now have a vocabulary**: panel, tessera, restorer, scavenger,
trade. Phase 4's Zod schemas should use these words, because a schema that
names things the way the fiction does is one fewer translation layer for
whoever writes the twelfth chapter.

**One thread is deliberately left open.** The player is currently rendered as
an octahedron, justified in `scene.ts` as reading "facing nowhere in
particular" while the simulation has no facing. Restorers are people with a
trade, and this decision does not explain why they look like that. Either the
form changes when facing exists, or the fiction grows a reason. Not resolved
here.
