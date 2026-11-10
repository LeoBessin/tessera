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

/**
 * The three trades a restorer can work as, chosen per session.
 *
 * They are separated by how they act on the world rather than by damage
 * numbers: the cutter removes what is in the way, the setter puts the mosaic
 * back, the keeper holds a place steady while the other two work.
 */
export const ROLES = ['cutter', 'setter', 'keeper'] as const;

export type Role = (typeof ROLES)[number];

export interface Progression {
  /** Furthest panel reached. Monotonically non-decreasing, always. */
  readonly chapter: number;
  /** Where the player currently respawns; `null` before the first checkpoint. */
  readonly checkpointId: string | null;
  /**
   * Permanently acquired abilities, kept per trade.
   *
   * A record rather than a map, so every role always has a set and no caller
   * has to decide what an absent one means. Each set only ever grows.
   */
  readonly unlocks: Readonly<Record<Role, ReadonlySet<string>>>;
  /** A tally, kept for pacing analysis. It costs the player nothing. */
  readonly deaths: number;
}

function emptyUnlocks(): Readonly<Record<Role, ReadonlySet<string>>> {
  return Object.freeze({
    cutter: Object.freeze(new Set<string>()),
    setter: Object.freeze(new Set<string>()),
    keeper: Object.freeze(new Set<string>()),
  });
}

export function createProgression(): Progression {
  return Object.freeze({
    chapter: 0,
    checkpointId: null,
    unlocks: emptyUnlocks(),
    deaths: 0,
  });
}

/**
 * Records arrival at a checkpoint.
 *
 * The panel takes the maximum of the two values, never the newer one. That
 * single `Math.max` is what lets a restorer re-lay an earlier panel with a
 * friend — or drop into a session ahead of them — without the campaign
 * rewinding.
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

/** What a player has earned in one trade. Never `undefined`. */
export function unlocksFor(progression: Progression, role: Role): ReadonlySet<string> {
  return progression.unlocks[role];
}

/**
 * Teaches one trade one ability.
 *
 * Unlocks branch by role because roles are chosen per session: a player who
 * works as a setter this evening and a cutter next week keeps both records, and
 * neither can reach into the other. The monotonicity guarantee is unchanged —
 * it simply holds once per trade now instead of once overall.
 */
export function grantUnlock(progression: Progression, role: Role, unlockId: string): Progression {
  if (progression.unlocks[role].has(unlockId)) return progression;

  return Object.freeze({
    ...progression,
    unlocks: Object.freeze({
      ...progression.unlocks,
      [role]: Object.freeze(new Set([...progression.unlocks[role], unlockId])),
    }),
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

export function hasUnlock(progression: Progression, role: Role, unlockId: string): boolean {
  return progression.unlocks[role].has(unlockId);
}

/**
 * Reconciles two views of one player's progress — a local save against the
 * server's, say, after playing offline or reconnecting. Takes the best of both,
 * on the principle that progress is never destroyed to resolve a conflict.
 *
 * Unlocks union *within* each trade rather than picking a winning side, so two
 * devices that each learned something different lose neither.
 */
export function mergeProgression(a: Progression, b: Progression): Progression {
  const furthest = a.chapter >= b.chapter ? a : b;

  const unlocks = {} as Record<Role, ReadonlySet<string>>;
  for (const role of ROLES) {
    unlocks[role] = Object.freeze(new Set([...a.unlocks[role], ...b.unlocks[role]]));
  }

  return Object.freeze({
    chapter: furthest.chapter,
    checkpointId: furthest.checkpointId,
    unlocks: Object.freeze(unlocks),
    deaths: Math.max(a.deaths, b.deaths),
  });
}
