/**
 * @tessera/sim — the game itself.
 *
 * Pure, deterministic, and dependency-free. It knows nothing of sockets,
 * canvases, Node or browsers; everything it needs arrives as an argument.
 *
 * That isolation is not purism. It is what lets the authoritative server and
 * the predicting client execute the identical rules, and what lets the whole
 * game be tested at thousands of ticks per second with no I/O in sight.
 */

export { clampMagnitude, magnitude, moveToward, normalize, ZERO } from './math/vec2.ts';
export type { Vec2 } from './math/vec2.ts';

export { createPrng } from './math/prng.ts';
export type { Prng } from './math/prng.ts';

export { createHasher, DEFAULT_QUANTUM } from './math/hash.ts';
export type { Hasher } from './math/hash.ts';

export { createAccumulator, FIXED_DT, MAX_CATCHUP_STEPS, TICK_RATE_HZ } from './time/timestep.ts';
export type { Accumulator } from './time/timestep.ts';

export { applyInput, DEFAULT_MOVE_TUNING, sanitizeCommand } from './player/applyInput.ts';
export type { MoveCommand, MoveState, MoveTuning } from './player/applyInput.ts';

export {
  createProgression,
  grantUnlock,
  hasUnlock,
  mergeProgression,
  reachCheckpoint,
  recordDeath,
  ROLES,
  unlocksFor,
} from './progression/progression.ts';
export type { Progression, Role } from './progression/progression.ts';

export {
  createWorld,
  damagePlayer,
  DEFAULT_MAX_HEALTH,
  hashWorld,
  removePlayer,
  RESPAWN_SECONDS,
  restoreWorld,
  setCheckpoint,
  snapshotWorld,
  spawnPlayer,
  stepWorld,
} from './world/world.ts';
export type { PlayerEntity, World, WorldSnapshot } from './world/world.ts';

export { runReplay } from './replay/replay.ts';
export type { Replay, ReplayFrame, ReplayPlayer, ReplayResult } from './replay/replay.ts';
