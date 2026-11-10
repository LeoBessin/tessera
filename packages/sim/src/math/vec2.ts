/** A point or direction on the simulation's ground plane. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });

export function magnitude(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Unit vector in the same direction, or {@link ZERO} if there is no direction. */
export function normalize(v: Vec2): Vec2 {
  const m = magnitude(v);
  return m === 0 ? ZERO : { x: v.x / m, y: v.y / m };
}

/** The same direction, shortened so its length never exceeds `max`. */
export function clampMagnitude(v: Vec2, max: number): Vec2 {
  if (max <= 0) return ZERO;
  const m = magnitude(v);
  if (m <= max) return { x: v.x, y: v.y };
  return { x: (v.x / m) * max, y: (v.y / m) * max };
}

/**
 * Moves `current` towards `target` by at most `maxDelta`, landing exactly on
 * the target when it is within reach.
 *
 * The exactness is the point: velocities that only asymptotically approach zero
 * leave entities imperceptibly sliding, which breaks both resting-state checks
 * and replay hashes.
 */
export function moveToward(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}
