import { describe, expect, it } from 'vitest';
import { createAccumulator, FIXED_DT, MAX_CATCHUP_STEPS, TICK_RATE_HZ } from './timestep.ts';

describe('timestep constants', () => {
  it('derives the fixed delta from the tick rate', () => {
    expect(FIXED_DT).toBeCloseTo(1 / TICK_RATE_HZ, 12);
  });
});

describe('createAccumulator', () => {
  it('yields no step before a full tick has elapsed', () => {
    const accumulator = createAccumulator();
    expect(accumulator.advance(FIXED_DT / 2)).toBe(0);
  });

  it('yields exactly one step for exactly one tick', () => {
    expect(createAccumulator().advance(FIXED_DT)).toBe(1);
  });

  it('yields several steps for a long frame', () => {
    expect(createAccumulator().advance(FIXED_DT * 3)).toBe(3);
  });

  it('carries the remainder into the next frame', () => {
    // Dropping the remainder would make the simulation run slightly slow,
    // a drift that only becomes visible after many minutes of play.
    const accumulator = createAccumulator();
    expect(accumulator.advance(FIXED_DT * 1.5)).toBe(1);
    expect(accumulator.advance(FIXED_DT * 0.5)).toBe(1);
  });

  it('caps catch-up and discards the backlog', () => {
    // After a stall (a backgrounded tab, a breakpoint) the honest choice is to
    // lose time rather than to run hundreds of steps and stall even harder.
    const accumulator = createAccumulator();
    expect(accumulator.advance(FIXED_DT * 1000)).toBe(MAX_CATCHUP_STEPS);
    expect(accumulator.advance(0)).toBe(0);
  });

  it('ignores a non-positive or non-finite frame delta', () => {
    const accumulator = createAccumulator();
    expect(accumulator.advance(-1)).toBe(0);
    expect(accumulator.advance(Number.NaN)).toBe(0);
    expect(accumulator.advance(FIXED_DT)).toBe(1);
  });

  it('exposes the unconsumed remainder for render interpolation', () => {
    const accumulator = createAccumulator();
    accumulator.advance(FIXED_DT * 1.25);
    expect(accumulator.alpha).toBeCloseTo(0.25, 6);
  });
});
