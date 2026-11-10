import { describe, expect, it } from 'vitest';
import { hashWorld } from '../world/world.ts';
import { allReplays, twoPlayerStroll } from './fixtures.ts';
import { runReplay } from './replay.ts';
import type { Replay } from './replay.ts';

describe('runReplay', () => {
  it('produces the same result every time', () => {
    expect(runReplay(twoPlayerStroll).hash).toBe(runReplay(twoPlayerStroll).hash);
  });

  it('runs exactly the requested number of ticks', () => {
    expect(runReplay(twoPlayerStroll).world.tick).toBe(twoPlayerStroll.ticks);
  });

  it('holds a command until a later frame supersedes it', () => {
    const held: Replay = {
      name: 'held',
      seed: 1,
      players: [{ id: 'alice', x: 0, y: 0 }],
      ticks: 30,
      frames: [{ tick: 1, commands: { alice: { moveX: 1, moveY: 0 } } }],
      expectedHash: '',
    };
    // One frame, thirty ticks: the player should have travelled the whole way.
    expect(runReplay(held).world.players.get('alice')!.x).toBeGreaterThan(1);
  });

  it('applies frames in tick order even when the log is unsorted', () => {
    const base = { name: 'order', seed: 1, players: [{ id: 'alice', x: 0, y: 0 }], ticks: 40 };
    const frames = [
      { tick: 1, commands: { alice: { moveX: 1, moveY: 0 } } },
      { tick: 20, commands: { alice: { moveX: -1, moveY: 0 } } },
    ];
    const sorted = runReplay({ ...base, frames, expectedHash: '' });
    const shuffled = runReplay({ ...base, frames: [...frames].reverse(), expectedHash: '' });
    expect(shuffled.hash).toBe(sorted.hash);
  });

  it('is unaffected by the order players are listed in', () => {
    const reversed: Replay = { ...twoPlayerStroll, players: [...twoPlayerStroll.players].reverse() };
    expect(runReplay(reversed).hash).toBe(runReplay(twoPlayerStroll).hash);
  });

  it('reports a digest matching the world it produced', () => {
    const { world, hash } = runReplay(twoPlayerStroll);
    expect(hashWorld(world)).toBe(hash);
  });
});

describe('committed replay digests', () => {
  // The regression gate. If one of these fails, the change under review altered
  // how the game plays. Decide whether that was the intent, then either fix the
  // change or run `pnpm replay:bless` and commit the new digest alongside it.
  it.each(allReplays.map((replay) => [replay.name, replay] as const))(
    'replay %s still plays out identically',
    (_name, replay) => {
      expect(runReplay(replay).hash).toBe(replay.expectedHash);
    },
  );
});
