import { magnitude } from '@tessera/sim';
import { describe, expect, it } from 'vitest';
import { IntentState, screenToWorld } from './intents.ts';

const vec = (command: { moveX: number; moveY: number }) => ({ x: command.moveX, y: command.moveY });

describe('IntentState', () => {
  it('holds an intent between press and release', () => {
    const state = new IntentState();
    state.press('KeyW');
    expect(state.isActive('up')).toBe(true);
    state.release('KeyW');
    expect(state.isActive('up')).toBe(false);
  });

  it('accepts either of two keys bound to the same intent', () => {
    const state = new IntentState();
    state.press('ArrowUp');
    expect(state.isActive('up')).toBe(true);
  });

  it('reports an unbound key so the caller can leave it to the browser', () => {
    const state = new IntentState();
    expect(state.press('F5')).toBe(false);
  });

  it('cancels opposing directions', () => {
    const state = new IntentState();
    state.press('KeyA');
    state.press('KeyD');
    expect(state.screenDirection()).toEqual({ moveX: 0, moveY: 0 });
  });

  it('forgets everything on releaseAll', () => {
    // Alt-tab delivers no keyup. Without this the character walks off alone.
    const state = new IntentState();
    state.press('KeyW');
    state.press('KeyD');
    state.releaseAll();
    expect(state.screenDirection()).toEqual({ moveX: 0, moveY: 0 });
  });

  it('reads screen directions with +y upward', () => {
    const state = new IntentState();
    state.press('KeyW');
    expect(state.screenDirection()).toEqual({ moveX: 0, moveY: 1 });
  });
});

describe('screenToWorld', () => {
  it('sends "up" away from the camera, not along the world axis', () => {
    // The player presses up; the character must travel up the screen. In an
    // isometric view that is the world diagonal, not world +Y.
    const world = screenToWorld({ moveX: 0, moveY: 1 });
    expect(world.moveX).toBeCloseTo(Math.SQRT1_2, 9);
    expect(world.moveY).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it('sends "right" to the right of the screen', () => {
    const world = screenToWorld({ moveX: 1, moveY: 0 });
    expect(world.moveX).toBeCloseTo(Math.SQRT1_2, 9);
    expect(world.moveY).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it('turns a screen diagonal into a world cardinal', () => {
    // Up-and-right on the keyboard should track one world axis exactly, which
    // is what makes an isometric grid feel aligned rather than skewed.
    const world = screenToWorld({ moveX: 1, moveY: 1 });
    expect(world.moveY).toBeCloseTo(0, 9);
    expect(world.moveX).toBeGreaterThan(0);
  });

  it('is a rotation, so it preserves length', () => {
    for (const command of [
      { moveX: 1, moveY: 0 },
      { moveX: 0, moveY: 1 },
      { moveX: 1, moveY: 1 },
      { moveX: -1, moveY: 0.5 },
    ]) {
      expect(magnitude(vec(screenToWorld(command)))).toBeCloseTo(magnitude(vec(command)), 9);
    }
  });

  it('leaves a resting player at rest', () => {
    expect(screenToWorld({ moveX: 0, moveY: 0 })).toEqual({ moveX: 0, moveY: 0 });
  });
});

describe('IntentState.toCommand', () => {
  it('delivers a world-space command ready for applyInput', () => {
    const state = new IntentState();
    state.press('KeyW');
    state.press('KeyD');
    const command = state.toCommand();
    expect(command.moveY).toBeCloseTo(0, 9);
    expect(command.moveX).toBeCloseTo(Math.SQRT2, 9);
  });
});
