import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { magnitude } from '../math/vec2.ts';
import { FIXED_DT } from '../time/timestep.ts';
import { applyInput, DEFAULT_MOVE_TUNING, sanitizeCommand } from './applyInput.ts';
import type { MoveCommand, MoveState } from './applyInput.ts';

const resting = (): MoveState => ({ x: 0, y: 0, vx: 0, vy: 0 });

const run = (state: MoveState, command: MoveCommand, ticks: number): MoveState => {
  for (let i = 0; i < ticks; i++) applyInput(state, command, FIXED_DT);
  return state;
};

const anyCommand = fc.record({
  moveX: fc.double({ noDefaultInfinity: false, noNaN: false }),
  moveY: fc.double({ noDefaultInfinity: false, noNaN: false }),
});

describe('sanitizeCommand', () => {
  it('passes a unit direction through unchanged', () => {
    expect(sanitizeCommand({ moveX: 1, moveY: 0 })).toEqual({ x: 1, y: 0 });
  });

  it('clamps an over-long direction to the unit disc', () => {
    // The client is not trusted. A command of (1000, 0) must buy no more speed
    // than (1, 0), or prediction and authority disagree and cheating is free.
    expect(magnitude(sanitizeCommand({ moveX: 1000, moveY: 0 }))).toBeCloseTo(1, 12);
  });

  it('replaces non-finite components with zero', () => {
    expect(sanitizeCommand({ moveX: Number.NaN, moveY: Number.POSITIVE_INFINITY })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('never exceeds the unit disc, for any input whatsoever', () => {
    fc.assert(
      fc.property(anyCommand, (command) => {
        expect(magnitude(sanitizeCommand(command))).toBeLessThanOrEqual(1 + 1e-12);
      }),
    );
  });
});

describe('applyInput', () => {
  it('accelerates a resting player in the commanded direction', () => {
    const state = run(resting(), { moveX: 1, moveY: 0 }, 1);
    expect(state.vx).toBeGreaterThan(0);
    expect(state.vy).toBe(0);
    expect(state.x).toBeGreaterThan(0);
  });

  it('approaches but never exceeds the maximum speed', () => {
    const state = run(resting(), { moveX: 1, moveY: 0 }, 600);
    expect(state.vx).toBeCloseTo(DEFAULT_MOVE_TUNING.maxSpeed, 9);
  });

  it('comes to an exact stop when input ceases', () => {
    // Not "close to zero": a player who is standing still must read as standing
    // still, or idle animations flicker and replay hashes wander.
    const state = run(resting(), { moveX: 1, moveY: 1 }, 60);
    run(state, { moveX: 0, moveY: 0 }, 600);
    expect(state.vx).toBe(0);
    expect(state.vy).toBe(0);
  });

  it('does not reward diagonal movement', () => {
    // The oldest bug in top-down movement: moving on two axes at once grants
    // sqrt(2) times the intended speed.
    const cardinal = run(resting(), { moveX: 1, moveY: 0 }, 600);
    const diagonal = run(resting(), { moveX: 1, moveY: 1 }, 600);
    expect(magnitude({ x: diagonal.vx, y: diagonal.vy })).toBeCloseTo(
      magnitude({ x: cardinal.vx, y: cardinal.vy }),
      9,
    );
  });

  it('leaves the state untouched for a zero delta', () => {
    const state = run(resting(), { moveX: 1, moveY: 0 }, 10);
    const before = { ...state };
    applyInput(state, { moveX: 1, moveY: 0 }, 0);
    expect(state).toEqual(before);
  });

  it('is deterministic: identical states and commands diverge never', () => {
    const commands: MoveCommand[] = Array.from({ length: 200 }, (_, i) => ({
      moveX: Math.sin(i) > 0 ? 1 : -1,
      moveY: Math.cos(i) > 0 ? 1 : 0,
    }));
    const a = resting();
    const b = resting();
    for (const command of commands) {
      applyInput(a, command, FIXED_DT);
      applyInput(b, command, FIXED_DT);
    }
    expect(a).toEqual(b);
  });

  it('keeps speed within the limit for any command sequence', () => {
    fc.assert(
      fc.property(fc.array(anyCommand, { maxLength: 300 }), (commands) => {
        const state = resting();
        for (const command of commands) applyInput(state, command, FIXED_DT);
        expect(magnitude({ x: state.vx, y: state.vy })).toBeLessThanOrEqual(
          DEFAULT_MOVE_TUNING.maxSpeed + 1e-9,
        );
      }),
    );
  });

  it('never poisons the state with a non-finite value', () => {
    fc.assert(
      fc.property(fc.array(anyCommand, { maxLength: 300 }), (commands) => {
        const state = resting();
        for (const command of commands) applyInput(state, command, FIXED_DT);
        expect(
          [state.x, state.y, state.vx, state.vy].every((n) => Number.isFinite(n)),
        ).toBe(true);
      }),
    );
  });
});
