import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createProgression,
  grantUnlock,
  hasUnlock,
  mergeProgression,
  reachCheckpoint,
  recordDeath,
} from './progression.ts';
import type { Progression } from './progression.ts';

describe('createProgression', () => {
  it('starts at the beginning with nothing unlocked', () => {
    const progression = createProgression();
    expect(progression.chapter).toBe(0);
    expect(progression.checkpointId).toBeNull();
    expect(progression.unlocks.size).toBe(0);
    expect(progression.deaths).toBe(0);
  });
});

describe('reachCheckpoint', () => {
  it('advances the chapter and records the checkpoint', () => {
    const progression = reachCheckpoint(createProgression(), 'c1-gate', 1);
    expect(progression.chapter).toBe(1);
    expect(progression.checkpointId).toBe('c1-gate');
  });

  it('never moves the chapter backwards', () => {
    // A player at chapter 5 who joins a friend's chapter 2 session keeps their
    // own progress. Per-player progression is only safe if it cannot regress.
    const ahead = reachCheckpoint(createProgression(), 'c5-keep', 5);
    const replayed = reachCheckpoint(ahead, 'c2-mill', 2);
    expect(replayed.chapter).toBe(5);
  });

  it('still updates the respawn point when replaying earlier content', () => {
    // The chapter does not regress, but the player must respawn where they are.
    const ahead = reachCheckpoint(createProgression(), 'c5-keep', 5);
    const replayed = reachCheckpoint(ahead, 'c2-mill', 2);
    expect(replayed.checkpointId).toBe('c2-mill');
  });

  it('credits a player who joins a session ahead of their own progress', () => {
    const behind = reachCheckpoint(createProgression(), 'c2-mill', 2);
    const credited = reachCheckpoint(behind, 'c5-keep', 5);
    expect(credited.chapter).toBe(5);
  });
});

describe('recordDeath', () => {
  it('costs nothing but a tally', () => {
    // The design contract: dying is a setback in time, never in progress.
    const before = grantUnlock(reachCheckpoint(createProgression(), 'c3-span', 3), 'dash');
    const after = recordDeath(before);
    expect(after.chapter).toBe(before.chapter);
    expect(after.checkpointId).toBe(before.checkpointId);
    expect([...after.unlocks]).toEqual([...before.unlocks]);
    expect(after.deaths).toBe(before.deaths + 1);
  });
});

describe('grantUnlock', () => {
  it('adds an ability', () => {
    expect(hasUnlock(grantUnlock(createProgression(), 'dash'), 'dash')).toBe(true);
  });

  it('is idempotent', () => {
    const once = grantUnlock(createProgression(), 'dash');
    expect(grantUnlock(once, 'dash').unlocks.size).toBe(1);
  });

  it('leaves the original untouched', () => {
    const original = createProgression();
    grantUnlock(original, 'dash');
    expect(original.unlocks.size).toBe(0);
  });
});

describe('mergeProgression', () => {
  it('keeps the furthest chapter and the union of unlocks', () => {
    const a = grantUnlock(reachCheckpoint(createProgression(), 'c4-fen', 4), 'dash');
    const b = grantUnlock(reachCheckpoint(createProgression(), 'c2-mill', 2), 'grapple');
    const merged = mergeProgression(a, b);
    expect(merged.chapter).toBe(4);
    expect([...merged.unlocks].sort()).toEqual(['dash', 'grapple']);
  });

  it('is commutative in everything that matters', () => {
    const a = grantUnlock(reachCheckpoint(createProgression(), 'c4-fen', 4), 'dash');
    const b = grantUnlock(reachCheckpoint(createProgression(), 'c2-mill', 2), 'grapple');
    const ab = mergeProgression(a, b);
    const ba = mergeProgression(b, a);
    expect(ab.chapter).toBe(ba.chapter);
    expect([...ab.unlocks].sort()).toEqual([...ba.unlocks].sort());
  });
});

describe('the monotonicity invariant', () => {
  type Operation =
    | { kind: 'checkpoint'; id: string; chapter: number }
    | { kind: 'unlock'; id: string }
    | { kind: 'death' };

  const anyOperation: fc.Arbitrary<Operation> = fc.oneof(
    fc.record({
      kind: fc.constant('checkpoint' as const),
      id: fc.string({ minLength: 1, maxLength: 8 }),
      chapter: fc.integer({ min: 0, max: 20 }),
    }),
    fc.record({ kind: fc.constant('unlock' as const), id: fc.string({ minLength: 1, maxLength: 8 }) }),
    fc.record({ kind: fc.constant('death' as const) }),
  );

  const apply = (progression: Progression, operation: Operation): Progression => {
    switch (operation.kind) {
      case 'checkpoint':
        return reachCheckpoint(progression, operation.id, operation.chapter);
      case 'unlock':
        return grantUnlock(progression, operation.id);
      case 'death':
        return recordDeath(progression);
    }
  };

  it('never loses progress, whatever the player does', () => {
    // The guarantee that makes a 15-hour campaign survivable: no sequence of
    // events, in any order, can take something away from a player.
    fc.assert(
      fc.property(fc.array(anyOperation, { maxLength: 200 }), (operations) => {
        let current = createProgression();
        for (const operation of operations) {
          const next = apply(current, operation);
          expect(next.chapter).toBeGreaterThanOrEqual(current.chapter);
          for (const unlock of current.unlocks) expect(next.unlocks.has(unlock)).toBe(true);
          current = next;
        }
      }),
    );
  });
});
