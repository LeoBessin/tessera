import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createProgression,
  grantUnlock,
  hasUnlock,
  mergeProgression,
  reachCheckpoint,
  recordDeath,
  ROLES,
  unlocksFor,
} from './progression.ts';
import type { Progression, Role } from './progression.ts';

describe('createProgression', () => {
  it('starts at the beginning with nothing unlocked, in any trade', () => {
    const progression = createProgression();
    expect(progression.chapter).toBe(0);
    expect(progression.checkpointId).toBeNull();
    expect(progression.deaths).toBe(0);
    for (const role of ROLES) expect(unlocksFor(progression, role).size).toBe(0);
  });
});

describe('reachCheckpoint', () => {
  it('advances the panel and records the checkpoint', () => {
    const progression = reachCheckpoint(createProgression(), 'p1-threshold', 1);
    expect(progression.chapter).toBe(1);
    expect(progression.checkpointId).toBe('p1-threshold');
  });

  it('never moves the panel backwards', () => {
    // A restorer on panel 5 who joins a friend's panel 2 session keeps their
    // own progress. Per-player progression is only safe if it cannot regress.
    const ahead = reachCheckpoint(createProgression(), 'p5-cistern', 5);
    const replayed = reachCheckpoint(ahead, 'p2-kiln', 2);
    expect(replayed.chapter).toBe(5);
  });

  it('still updates the respawn point when re-laying an earlier panel', () => {
    // The panel does not regress, but the player must respawn where they are.
    const ahead = reachCheckpoint(createProgression(), 'p5-cistern', 5);
    const replayed = reachCheckpoint(ahead, 'p2-kiln', 2);
    expect(replayed.checkpointId).toBe('p2-kiln');
  });

  it('credits a restorer who joins a session ahead of their own progress', () => {
    const behind = reachCheckpoint(createProgression(), 'p2-kiln', 2);
    const credited = reachCheckpoint(behind, 'p5-cistern', 5);
    expect(credited.chapter).toBe(5);
  });
});

describe('recordDeath', () => {
  it('costs nothing but a tally', () => {
    // The design contract: dying is a setback in time, never in progress.
    const before = grantUnlock(
      reachCheckpoint(createProgression(), 'p3-span', 3),
      'cutter',
      'cleave',
    );
    const after = recordDeath(before);
    expect(after.chapter).toBe(before.chapter);
    expect(after.checkpointId).toBe(before.checkpointId);
    expect([...unlocksFor(after, 'cutter')]).toEqual([...unlocksFor(before, 'cutter')]);
    expect(after.deaths).toBe(before.deaths + 1);
  });
});

describe('unlocks belonging to a trade', () => {
  it('grants an ability to the trade that learned it', () => {
    const progression = grantUnlock(createProgression(), 'setter', 'mend');
    expect(hasUnlock(progression, 'setter', 'mend')).toBe(true);
  });

  it('does not teach one trade what another has learned', () => {
    // Roles are picked per session, so a player carries a separate record for
    // each. Earning a setter's ability must not arm the cutter they play next.
    const progression = grantUnlock(createProgression(), 'setter', 'mend');
    expect(hasUnlock(progression, 'cutter', 'mend')).toBe(false);
    expect(hasUnlock(progression, 'keeper', 'mend')).toBe(false);
  });

  it('keeps what every trade has earned, whichever one is played next', () => {
    // Switching role between sessions costs a player nothing they earned.
    let progression = grantUnlock(createProgression(), 'cutter', 'cleave');
    progression = grantUnlock(progression, 'setter', 'mend');
    progression = grantUnlock(progression, 'keeper', 'anchor');

    expect(hasUnlock(progression, 'cutter', 'cleave')).toBe(true);
    expect(hasUnlock(progression, 'setter', 'mend')).toBe(true);
    expect(hasUnlock(progression, 'keeper', 'anchor')).toBe(true);
  });

  it('is idempotent', () => {
    const once = grantUnlock(createProgression(), 'cutter', 'cleave');
    expect(unlocksFor(grantUnlock(once, 'cutter', 'cleave'), 'cutter').size).toBe(1);
  });

  it('leaves the original untouched', () => {
    const original = createProgression();
    grantUnlock(original, 'cutter', 'cleave');
    expect(unlocksFor(original, 'cutter').size).toBe(0);
  });
});

describe('mergeProgression', () => {
  it('keeps the furthest panel and the union of every trade’s unlocks', () => {
    const a = grantUnlock(reachCheckpoint(createProgression(), 'p4-fen', 4), 'cutter', 'cleave');
    const b = grantUnlock(reachCheckpoint(createProgression(), 'p2-kiln', 2), 'setter', 'mend');
    const merged = mergeProgression(a, b);

    expect(merged.chapter).toBe(4);
    expect(hasUnlock(merged, 'cutter', 'cleave')).toBe(true);
    expect(hasUnlock(merged, 'setter', 'mend')).toBe(true);
  });

  it('unions within a trade rather than taking one side’s set', () => {
    // Two devices, same trade, different abilities earned on each. Resolving
    // the conflict must not cost the player either of them.
    const a = grantUnlock(createProgression(), 'cutter', 'cleave');
    const b = grantUnlock(createProgression(), 'cutter', 'split');
    expect([...unlocksFor(mergeProgression(a, b), 'cutter')].sort()).toEqual(['cleave', 'split']);
  });

  it('is commutative in everything that matters', () => {
    const a = grantUnlock(reachCheckpoint(createProgression(), 'p4-fen', 4), 'cutter', 'cleave');
    const b = grantUnlock(reachCheckpoint(createProgression(), 'p2-kiln', 2), 'setter', 'mend');
    const ab = mergeProgression(a, b);
    const ba = mergeProgression(b, a);

    expect(ab.chapter).toBe(ba.chapter);
    for (const role of ROLES) {
      expect([...unlocksFor(ab, role)].sort()).toEqual([...unlocksFor(ba, role)].sort());
    }
  });
});

describe('the monotonicity invariant', () => {
  type Operation =
    | { kind: 'checkpoint'; id: string; chapter: number }
    | { kind: 'unlock'; role: Role; id: string }
    | { kind: 'death' };

  const anyRole: fc.Arbitrary<Role> = fc.constantFrom(...ROLES);

  const anyOperation: fc.Arbitrary<Operation> = fc.oneof(
    fc.record({
      kind: fc.constant('checkpoint' as const),
      id: fc.string({ minLength: 1, maxLength: 8 }),
      chapter: fc.integer({ min: 0, max: 20 }),
    }),
    fc.record({
      kind: fc.constant('unlock' as const),
      role: anyRole,
      id: fc.string({ minLength: 1, maxLength: 8 }),
    }),
    fc.record({ kind: fc.constant('death' as const) }),
  );

  const apply = (progression: Progression, operation: Operation): Progression => {
    switch (operation.kind) {
      case 'checkpoint':
        return reachCheckpoint(progression, operation.id, operation.chapter);
      case 'unlock':
        return grantUnlock(progression, operation.role, operation.id);
      case 'death':
        return recordDeath(progression);
    }
  };

  it('never loses progress in any trade, whatever the player does', () => {
    // The guarantee that makes a 15-hour campaign survivable: no sequence of
    // events, in any order, can take something away from a player — and the
    // guarantee now holds once per role rather than once overall.
    fc.assert(
      fc.property(fc.array(anyOperation, { maxLength: 200 }), (operations) => {
        let current = createProgression();
        for (const operation of operations) {
          const next = apply(current, operation);
          expect(next.chapter).toBeGreaterThanOrEqual(current.chapter);
          for (const role of ROLES) {
            for (const unlock of unlocksFor(current, role)) {
              expect(hasUnlock(next, role, unlock)).toBe(true);
            }
          }
          current = next;
        }
      }),
    );
  });

  it('never lets work in one trade disturb another', () => {
    // Stronger than monotonicity: an operation on one role leaves the other two
    // byte-for-byte as they were. This is what makes "pick a role per session"
    // safe to offer at all.
    fc.assert(
      fc.property(anyRole, fc.string({ minLength: 1, maxLength: 8 }), (role, unlockId) => {
        let seeded = createProgression();
        for (const other of ROLES) seeded = grantUnlock(seeded, other, `${other}-seed`);

        const after = grantUnlock(seeded, role, unlockId);
        for (const other of ROLES) {
          if (other === role) continue;
          expect([...unlocksFor(after, other)].sort()).toEqual([...unlocksFor(seeded, other)].sort());
        }
      }),
    );
  });
});
