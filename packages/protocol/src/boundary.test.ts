import { applyInput, FIXED_DT, type MoveCommand, type MoveState } from '@tessera/sim';
import { describe, expect, it } from 'vitest';
import { MoveInputSchema } from './input.ts';
import { GameStateSchema, PlayerSchema } from './state.ts';

/**
 * These tests guard the seam that the whole architecture rests on: a Colyseus
 * schema instance must be usable as a simulation value, with no adapter, no
 * copying, and no import of Colyseus by the simulation.
 *
 * If this file stops compiling, the server and the client have begun running
 * different code, and prediction will silently disagree with authority.
 */
describe('the simulation/transport seam', () => {
  it('accepts a PlayerSchema wherever a MoveState is required', () => {
    const player = new PlayerSchema();
    const asMoveState: MoveState = player;
    expect(asMoveState).toBe(player);
  });

  it('accepts a MoveInputSchema wherever a MoveCommand is required', () => {
    const input = new MoveInputSchema();
    const asCommand: MoveCommand = input;
    expect(asCommand).toBe(input);
  });

  it('runs the real applyInput directly against schema instances', () => {
    const player = new PlayerSchema();
    const input = new MoveInputSchema();
    input.moveX = 1;
    input.moveY = 0;

    for (let i = 0; i < 30; i++) applyInput(player, input, FIXED_DT);

    expect(player.x).toBeGreaterThan(0);
    expect(player.vx).toBeGreaterThan(0);
  });

  it('sanitises a hostile input exactly as the simulation would', () => {
    // The client controls these bytes. Authority lives in applyInput, so the
    // schema needs no validation of its own — this test says so out loud.
    const player = new PlayerSchema();
    const hostile = new MoveInputSchema();
    hostile.moveX = 10_000;

    for (let i = 0; i < 300; i++) applyInput(player, hostile, FIXED_DT);

    expect(Math.hypot(player.vx, player.vy)).toBeLessThanOrEqual(6 + 1e-3);
  });

  it('holds players in a synchronised map keyed by session', () => {
    const state = new GameStateSchema();
    const player = new PlayerSchema();
    player.id = 'alice';
    state.players.set('alice', player);

    expect(state.players.get('alice')?.id).toBe('alice');
  });
});
