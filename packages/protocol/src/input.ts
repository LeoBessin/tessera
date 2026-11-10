import { schema, t } from '@colyseus/schema';

/**
 * One frame of player intent, sent at the fixed tick rate.
 *
 * Must stay a flat schema of primitives: Colyseus buffers these per client and
 * replays them during reconciliation, which only works for flat records.
 *
 * Structurally a `MoveCommand` from @tessera/sim, so the server feeds it
 * straight into `applyInput` and the client predictor feeds in the very same
 * object. Values arrive untrusted and are sanitised inside `applyInput`.
 */
export const MoveInputSchema = schema(
  {
    moveX: t.float32().default(0),
    moveY: t.float32().default(0),
  },
  'MoveInput',
);

export type MoveInputSchema = InstanceType<typeof MoveInputSchema>;
