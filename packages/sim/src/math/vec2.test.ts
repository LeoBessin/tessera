import { describe, expect, it } from 'vitest';
import { clampMagnitude, magnitude, moveToward, normalize, ZERO } from './vec2.ts';

describe('magnitude', () => {
  it('measures a 3-4-5 triangle', () => {
    expect(magnitude({ x: 3, y: 4 })).toBe(5);
  });

  it('is zero for the zero vector', () => {
    expect(magnitude(ZERO)).toBe(0);
  });
});

describe('normalize', () => {
  it('produces a unit vector', () => {
    expect(magnitude(normalize({ x: 3, y: 4 }))).toBeCloseTo(1, 12);
  });

  it('returns zero for the zero vector instead of NaN', () => {
    // Dividing by a zero magnitude is the classic source of NaN poisoning that
    // silently corrupts an entire simulation.
    expect(normalize(ZERO)).toEqual({ x: 0, y: 0 });
  });
});

describe('clampMagnitude', () => {
  it('leaves a vector shorter than the limit untouched', () => {
    expect(clampMagnitude({ x: 1, y: 0 }, 5)).toEqual({ x: 1, y: 0 });
  });

  it('shortens a vector longer than the limit, preserving direction', () => {
    const clamped = clampMagnitude({ x: 30, y: 40 }, 5);
    expect(magnitude(clamped)).toBeCloseTo(5, 12);
    expect(clamped.x / clamped.y).toBeCloseTo(30 / 40, 12);
  });

  it('collapses to zero for a non-positive limit', () => {
    expect(clampMagnitude({ x: 3, y: 4 }, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('moveToward', () => {
  it('steps towards the target by at most maxDelta', () => {
    expect(moveToward(0, 10, 3)).toBe(3);
    expect(moveToward(0, -10, 3)).toBe(-3);
  });

  it('lands exactly on the target rather than overshooting', () => {
    // Exactness matters: a value that merely approaches zero leaves entities
    // drifting forever and makes "is the player stopped?" unanswerable.
    expect(moveToward(2, 0, 5)).toBe(0);
    expect(moveToward(-2, 0, 5)).toBe(0);
  });

  it('is a no-op when already at the target', () => {
    expect(moveToward(7, 7, 1)).toBe(7);
  });
});
