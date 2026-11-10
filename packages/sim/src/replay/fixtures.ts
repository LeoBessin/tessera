import type { Replay } from './replay.ts';

/**
 * A short two-player session exercising acceleration, diagonal movement,
 * coming to a stop, and reversing. Deliberately boring: a regression fixture
 * should cover ordinary play, because that is what breaks.
 */
export const twoPlayerStroll: Replay = {
  name: 'two-player-stroll',
  seed: 20261110,
  players: [
    { id: 'alice', x: 0, y: 0 },
    { id: 'bob', x: 4, y: -2 },
  ],
  ticks: 180,
  frames: [
    { tick: 1, commands: { alice: { moveX: 1, moveY: 0 }, bob: { moveX: 0, moveY: 1 } } },
    { tick: 30, commands: { alice: { moveX: 1, moveY: 1 }, bob: { moveX: -1, moveY: 1 } } },
    { tick: 75, commands: { alice: { moveX: 0, moveY: 0 }, bob: { moveX: -1, moveY: 0 } } },
    { tick: 120, commands: { alice: { moveX: -1, moveY: 0 }, bob: { moveX: 0, moveY: 0 } } },
  ],
  expectedHash: '594c7c90',
};

export const allReplays: readonly Replay[] = [twoPlayerStroll];
