import { clampMagnitude, moveToward, type Vec2 } from '../math/vec2.ts';

/**
 * The mutable movement fields of an entity.
 *
 * Declared structurally and mutated in place so that a Colyseus `Schema`
 * instance satisfies it without the simulation ever knowing that Colyseus
 * exists. This is what lets the authoritative server and the predicting client
 * run literally the same function.
 */
export interface MoveState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** One frame of intent. Produced by an input device, never trusted as-is. */
export interface MoveCommand {
  readonly moveX: number;
  readonly moveY: number;
}

export interface MoveTuning {
  /** World units per second. */
  readonly maxSpeed: number;
  /** World units per second², while a direction is held. */
  readonly acceleration: number;
  /** World units per second², while no direction is held. */
  readonly friction: number;
}

export const DEFAULT_MOVE_TUNING: MoveTuning = Object.freeze({
  maxSpeed: 6,
  acceleration: 45,
  friction: 60,
});

/** Squared length below which a command counts as "no direction held". */
const DEAD_ZONE = 1e-6;

const finiteOrZero = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * Reduces a raw command to a direction within the unit disc.
 *
 * Two jobs, both load-bearing:
 *
 * 1. **Authority.** A command arriving over the wire is attacker-controlled.
 *    Clamping to the unit disc means no packet can purchase extra speed.
 * 2. **Fairness.** Holding two axes yields a length of √2; normalising it is
 *    what stops diagonal movement from being 41% faster than cardinal.
 */
export function sanitizeCommand(command: MoveCommand): Vec2 {
  return clampMagnitude({ x: finiteOrZero(command.moveX), y: finiteOrZero(command.moveY) }, 1);
}

/**
 * Advances one entity by one fixed step.
 *
 * Mutates `state` in place and returns nothing: Colyseus synchronises schema
 * instances by observing mutation, so returning a fresh object would strand the
 * change. Purity is preserved where it counts — the result depends only on the
 * arguments.
 */
export function applyInput(
  state: MoveState,
  command: MoveCommand,
  dt: number,
  tuning: MoveTuning = DEFAULT_MOVE_TUNING,
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;

  const direction = sanitizeCommand(command);
  const holding = direction.x * direction.x + direction.y * direction.y > DEAD_ZONE;

  const targetVx = direction.x * tuning.maxSpeed;
  const targetVy = direction.y * tuning.maxSpeed;
  const rate = (holding ? tuning.acceleration : tuning.friction) * dt;

  state.vx = moveToward(state.vx, targetVx, rate);
  state.vy = moveToward(state.vy, targetVy, rate);

  state.x += state.vx * dt;
  state.y += state.vy * dt;
}
