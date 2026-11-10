import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../time/timestep.ts';
import {
  createWorld,
  damagePlayer,
  hashWorld,
  RESPAWN_SECONDS,
  restoreWorld,
  setCheckpoint,
  snapshotWorld,
  spawnPlayer,
  stepWorld,
} from './world.ts';
import type { MoveCommand } from '../player/applyInput.ts';

const noCommands = new Map<string, MoveCommand>();

const stepFor = (
  world: ReturnType<typeof createWorld>,
  seconds: number,
  commands = noCommands,
): void => {
  const ticks = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < ticks; i++) stepWorld(world, commands, FIXED_DT);
};

describe('spawnPlayer', () => {
  it('places a player at full health', () => {
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice', 2, 3);
    expect(player.health).toBe(player.maxHealth);
    expect(player.downed).toBe(false);
    expect({ x: player.x, y: player.y }).toEqual({ x: 2, y: 3 });
  });

  it('refuses a duplicate identifier', () => {
    const world = createWorld(1);
    spawnPlayer(world, 'alice');
    expect(() => spawnPlayer(world, 'alice')).toThrow(/alice/);
  });
});

describe('stepWorld', () => {
  it('advances the tick counter', () => {
    const world = createWorld(1);
    stepWorld(world, noCommands, FIXED_DT);
    expect(world.tick).toBe(1);
  });

  it('moves a player according to their command', () => {
    const world = createWorld(1);
    spawnPlayer(world, 'alice');
    stepFor(world, 1, new Map([['alice', { moveX: 1, moveY: 0 }]]));
    expect(world.players.get('alice')!.x).toBeGreaterThan(0);
  });

  it('treats a missing command as standing still', () => {
    const world = createWorld(1);
    spawnPlayer(world, 'alice');
    stepFor(world, 1);
    expect(world.players.get('alice')!.x).toBe(0);
  });
});

describe('damagePlayer', () => {
  it('reduces health', () => {
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice');
    damagePlayer(player, 30);
    expect(player.health).toBe(player.maxHealth - 30);
  });

  it('downs a player rather than deleting them', () => {
    // Death leaves the entity in the world: a downed ally is still present,
    // still visible, and still part of the party.
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice');
    damagePlayer(player, 999);
    expect(player.downed).toBe(true);
    expect(player.health).toBe(0);
    expect(world.players.has('alice')).toBe(true);
  });

  it('does not drive health below zero', () => {
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice');
    damagePlayer(player, 999);
    expect(player.health).toBe(0);
  });
});

describe('being downed', () => {
  it('ignores movement commands', () => {
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice');
    damagePlayer(player, 999);
    stepFor(world, 1, new Map([['alice', { moveX: 1, moveY: 0 }]]));
    expect(player.x).toBe(0);
  });

  it('revives at the checkpoint with full health', () => {
    // The whole cost of dying: a few seconds and a walk back.
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice', 0, 0);
    setCheckpoint(player, 10, 20);
    player.x = 50;
    player.y = 50;
    damagePlayer(player, 999);

    stepFor(world, RESPAWN_SECONDS + FIXED_DT);

    expect(player.downed).toBe(false);
    expect(player.health).toBe(player.maxHealth);
    expect({ x: player.x, y: player.y }).toEqual({ x: 10, y: 20 });
    expect({ vx: player.vx, vy: player.vy }).toEqual({ vx: 0, vy: 0 });
  });

  it('stays down until the timer elapses', () => {
    const world = createWorld(1);
    const player = spawnPlayer(world, 'alice');
    damagePlayer(player, 999);
    stepFor(world, RESPAWN_SECONDS / 2);
    expect(player.downed).toBe(true);
  });
});

describe('snapshotWorld and restoreWorld', () => {
  it('round-trips a world exactly', () => {
    const world = createWorld(7);
    spawnPlayer(world, 'alice', 1, 2);
    spawnPlayer(world, 'bob', 3, 4);
    stepFor(world, 1, new Map([['alice', { moveX: 1, moveY: 1 }]]));

    const snapshot = snapshotWorld(world);
    const before = hashWorld(world);

    stepFor(world, 2, new Map([['bob', { moveX: -1, moveY: 0 }]]));
    expect(hashWorld(world)).not.toBe(before);

    restoreWorld(world, snapshot);
    expect(hashWorld(world)).toBe(before);
  });

  it('takes a copy, not a view', () => {
    // A snapshot that aliases live state is a checkpoint that silently rots.
    const world = createWorld(7);
    const player = spawnPlayer(world, 'alice');
    const snapshot = snapshotWorld(world);
    player.x = 999;
    restoreWorld(world, snapshot);
    expect(world.players.get('alice')!.x).toBe(0);
  });

  it('removes players who did not exist at snapshot time', () => {
    const world = createWorld(7);
    spawnPlayer(world, 'alice');
    const snapshot = snapshotWorld(world);
    spawnPlayer(world, 'bob');
    restoreWorld(world, snapshot);
    expect([...world.players.keys()]).toEqual(['alice']);
  });
});

describe('hashWorld', () => {
  it('does not depend on the order players joined', () => {
    // Two servers that saw the same players arrive in a different order must
    // still agree, or the hash is measuring bookkeeping rather than the game.
    const first = createWorld(3);
    spawnPlayer(first, 'alice', 1, 1);
    spawnPlayer(first, 'bob', 2, 2);

    const second = createWorld(3);
    spawnPlayer(second, 'bob', 2, 2);
    spawnPlayer(second, 'alice', 1, 1);

    expect(hashWorld(first)).toBe(hashWorld(second));
  });

  it('changes when the world changes', () => {
    const world = createWorld(3);
    spawnPlayer(world, 'alice');
    const before = hashWorld(world);
    stepFor(world, 1, new Map([['alice', { moveX: 1, moveY: 0 }]]));
    expect(hashWorld(world)).not.toBe(before);
  });
});
