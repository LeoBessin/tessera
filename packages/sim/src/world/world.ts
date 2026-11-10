import { createHasher } from '../math/hash.ts';
import { createPrng, type Prng } from '../math/prng.ts';
import { applyInput, type MoveCommand, type MoveState } from '../player/applyInput.ts';

/** Seconds a downed player waits before returning. Short on purpose. */
export const RESPAWN_SECONDS = 3;

export const DEFAULT_MAX_HEALTH = 100;

export interface PlayerEntity extends MoveState {
  readonly id: string;
  health: number;
  maxHealth: number;
  /** Out of action and awaiting revival — still present in the world. */
  downed: boolean;
  /** Seconds remaining before revival. Meaningless unless `downed`. */
  respawnTimer: number;
  /** Where revival puts this player: the last checkpoint they touched. */
  spawnX: number;
  spawnY: number;
}

export interface World {
  tick: number;
  readonly players: Map<string, PlayerEntity>;
  readonly prng: Prng;
}

export interface WorldSnapshot {
  readonly tick: number;
  readonly prngState: number;
  readonly players: readonly PlayerEntity[];
}

export function createWorld(seed: number): World {
  return { tick: 0, players: new Map(), prng: createPrng(seed) };
}

export function spawnPlayer(world: World, id: string, x = 0, y = 0): PlayerEntity {
  if (world.players.has(id)) {
    throw new Error(`player ${id} is already in the world`);
  }
  const player: PlayerEntity = {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    health: DEFAULT_MAX_HEALTH,
    maxHealth: DEFAULT_MAX_HEALTH,
    downed: false,
    respawnTimer: 0,
    spawnX: x,
    spawnY: y,
  };
  world.players.set(id, player);
  return player;
}

export function removePlayer(world: World, id: string): void {
  world.players.delete(id);
}

/** Moves the point this player returns to after being downed. */
export function setCheckpoint(player: PlayerEntity, x: number, y: number): void {
  player.spawnX = x;
  player.spawnY = y;
}

/**
 * Applies damage, downing the player if it is lethal.
 *
 * Returns whether this call is what downed them, so callers can react once
 * rather than every tick.
 */
export function damagePlayer(player: PlayerEntity, amount: number): boolean {
  if (player.downed || amount <= 0) return false;

  player.health = Math.max(0, player.health - amount);
  if (player.health > 0) return false;

  player.downed = true;
  player.respawnTimer = RESPAWN_SECONDS;
  player.vx = 0;
  player.vy = 0;
  return true;
}

function revive(player: PlayerEntity): void {
  player.downed = false;
  player.respawnTimer = 0;
  player.health = player.maxHealth;
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
}

/**
 * Advances the world by one fixed step.
 *
 * Players are stepped in sorted identifier order rather than insertion order,
 * so two peers that saw the same players arrive in a different sequence still
 * compute the same result.
 */
export function stepWorld(
  world: World,
  commands: ReadonlyMap<string, MoveCommand>,
  dt: number,
): void {
  world.tick += 1;

  for (const id of [...world.players.keys()].sort()) {
    const player = world.players.get(id)!;

    if (player.downed) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) revive(player);
      continue;
    }

    applyInput(player, commands.get(id) ?? { moveX: 0, moveY: 0 }, dt);
  }
}

export function snapshotWorld(world: World): WorldSnapshot {
  return {
    tick: world.tick,
    prngState: world.prng.getState(),
    players: [...world.players.values()].map((player) => ({ ...player })),
  };
}

export function restoreWorld(world: World, snapshot: WorldSnapshot): void {
  world.tick = snapshot.tick;
  world.prng.setState(snapshot.prngState);
  world.players.clear();
  for (const player of snapshot.players) {
    world.players.set(player.id, { ...player });
  }
}

/**
 * A digest of everything that makes this world what it is.
 *
 * Used by replay tests to assert that a recorded session still plays out the
 * same way. Players are folded in sorted order so the digest describes the
 * game rather than the order people happened to connect.
 */
export function hashWorld(world: World): string {
  const hasher = createHasher().int(world.tick);

  for (const id of [...world.players.keys()].sort()) {
    const player = world.players.get(id)!;
    hasher
      .string(id)
      .number(player.x)
      .number(player.y)
      .number(player.vx)
      .number(player.vy)
      .number(player.health)
      .bool(player.downed)
      .number(player.respawnTimer)
      .number(player.spawnX)
      .number(player.spawnY);
  }

  return hasher.digest();
}
