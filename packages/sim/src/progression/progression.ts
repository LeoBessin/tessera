/**
 * Per-player campaign progress.
 *
 * Progress belongs to the *player*, not to the party. Two friends with
 * different schedules can play together without either of them losing a place
 * in the story, and a newcomer can join a session far ahead of their own
 * progress and be credited for what they actually play.
 *
 * Every operation returns a new value. Progression is small, changes rarely,
 * and is the last thing in the game that should be mutated by accident.
 */
export interface Progression {
  /** Furthest chapter reached. Monotonically non-decreasing, always. */
  readonly chapter: number;
  /** Where the player currently respawns; `null` before the first checkpoint. */
  readonly checkpointId: string | null;
  /** Permanently acquired abilities. Only ever grows. */
  readonly unlocks: ReadonlySet<string>;
  /** A tally, kept for pacing analysis. It costs the player nothing. */
  readonly deaths: number;
}

export function createProgression(): Progression {
  return Object.freeze({
    chapter: 0,
    checkpointId: null,
    unlocks: Object.freeze(new Set<string>()),
    deaths: 0,
  });
}

/**
 * Records arrival at a checkpoint.
 *
 * The chapter takes the maximum of the two values, never the newer one. That
 * single `Math.max` is what lets a player replay early content with a friend —
 * or drop into a session ahead of them — without the campaign rewinding.
 *
 * The respawn point, by contrast, always follows the player, because they have
 * to come back to life where they actually are.
 */
export function reachCheckpoint(
  progression: Progression,
  checkpointId: string,
  chapter: number,
): Progression {
  return Object.freeze({
    ...progression,
    chapter: Math.max(progression.chapter, chapter),
    checkpointId,
  });
}

export function grantUnlock(progression: Progression, unlockId: string): Progression {
  if (progression.unlocks.has(unlockId)) return progression;
  return Object.freeze({
    ...progression,
    unlocks: Object.freeze(new Set([...progression.unlocks, unlockId])),
  });
}

/**
 * Death costs a tally and nothing else.
 *
 * Expressed here rather than at the call site so that "death is not punitive"
 * is a property of the domain that a test can hold on to, instead of a promise
 * spread across whatever code happens to handle dying.
 */
export function recordDeath(progression: Progression): Progression {
  return Object.freeze({ ...progression, deaths: progression.deaths + 1 });
}

export function hasUnlock(progression: Progression, unlockId: string): boolean {
  return progression.unlocks.has(unlockId);
}

/**
 * Reconciles two views of one player's progress — a local save against the
 * server's, say, after playing offline or reconnecting. Takes the best of both,
 * on the principle that progress is never destroyed to resolve a conflict.
 */
export function mergeProgression(a: Progression, b: Progression): Progression {
  const furthest = a.chapter >= b.chapter ? a : b;
  return Object.freeze({
    chapter: furthest.chapter,
    checkpointId: furthest.checkpointId,
    unlocks: Object.freeze(new Set([...a.unlocks, ...b.unlocks])),
    deaths: Math.max(a.deaths, b.deaths),
  });
}
