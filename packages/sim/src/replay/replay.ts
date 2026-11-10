import type { MoveCommand } from '../player/applyInput.ts';
import { FIXED_DT } from '../time/timestep.ts';
import { createWorld, hashWorld, spawnPlayer, stepWorld, type World } from '../world/world.ts';

/**
 * Replay testing.
 *
 * A replay is a seed plus a log of what everybody pressed. Running it produces
 * a digest of the resulting world, which is committed alongside the replay.
 *
 * This is the safety net that makes autonomous iteration tolerable: a change
 * that quietly alters how the game *feels* — acceleration, friction, respawn
 * timing, tick order — cannot pass review unnoticed, because the digest moves.
 * Unit tests check rules in isolation; a replay checks the whole machine.
 *
 * When a digest changes, that is not automatically a bug. It is a prompt:
 * either the change was intended, and the digest is updated deliberately in the
 * same commit, or it was not, and something broke.
 */

/** Commands take effect at `tick` and are held until the next frame supersedes them. */
export interface ReplayFrame {
  readonly tick: number;
  readonly commands: Readonly<Record<string, MoveCommand>>;
}

export interface ReplayPlayer {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface Replay {
  readonly name: string;
  readonly seed: number;
  readonly players: readonly ReplayPlayer[];
  /** Total fixed steps to run. */
  readonly ticks: number;
  /** Sparse, ascending by tick. */
  readonly frames: readonly ReplayFrame[];
  /** The digest this replay is expected to produce. */
  readonly expectedHash: string;
}

export interface ReplayResult {
  readonly world: World;
  readonly hash: string;
}

const EMPTY_COMMANDS: ReadonlyMap<string, MoveCommand> = new Map();

function toCommandMap(
  commands: Readonly<Record<string, MoveCommand>>,
): ReadonlyMap<string, MoveCommand> {
  return new Map(Object.entries(commands));
}

export function runReplay(replay: Replay): ReplayResult {
  const world = createWorld(replay.seed);
  for (const player of replay.players) {
    spawnPlayer(world, player.id, player.x, player.y);
  }

  const frames = [...replay.frames].sort((a, b) => a.tick - b.tick);
  let next = 0;
  let held = EMPTY_COMMANDS;

  for (let tick = 1; tick <= replay.ticks; tick++) {
    while (next < frames.length && frames[next]!.tick <= tick) {
      held = toCommandMap(frames[next]!.commands);
      next += 1;
    }
    stepWorld(world, held, FIXED_DT);
  }

  return { world, hash: hashWorld(world) };
}
