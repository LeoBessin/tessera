import { schema, t } from '@colyseus/schema';

/**
 * The synchronised world.
 *
 * Field types are chosen for the wire, not for convenience: `float32` for
 * continuous values the client interpolates, small integers for counters.
 *
 * These classes are deliberately dumb. They carry no behaviour, because every
 * rule lives in `@tessera/sim` and is executed identically by the server and by
 * the predicting client. A method here would be a rule that only one side knows.
 */

export const PlayerSchema = schema(
  {
    id: t.string().default(''),

    /* Structurally a `MoveState` from @tessera/sim, which is what allows
     * `applyInput` to be handed a schema instance directly. The coupling is
     * one-way and checked by a test, not by an import. */
    x: t.float32().default(0),
    y: t.float32().default(0),
    vx: t.float32().default(0),
    vy: t.float32().default(0),

    health: t.uint16().default(100),
    maxHealth: t.uint16().default(100),
    downed: t.boolean().default(false),

    /** Mirrored from this player's own saved progression, for display. */
    chapter: t.uint16().default(0),
    deaths: t.uint16().default(0),
  },
  'Player',
);

export type PlayerSchema = InstanceType<typeof PlayerSchema>;

export const GameStateSchema = schema(
  {
    tick: t.uint32().default(0),
    players: t.map(PlayerSchema),
  },
  'GameState',
);

export type GameStateSchema = InstanceType<typeof GameStateSchema>;
