import type { Progression } from '@tessera/sim';

/**
 * Where a player's campaign progress is kept.
 *
 * Declared as a port so the room never learns whether that is a Postgres table,
 * a Redis hash or a Map. The walking skeleton ships the in-memory adapter; the
 * durable one slots in behind this interface without the room changing a line.
 */
export interface ProgressionRepository {
  /** Progress for `playerId`, or a fresh start if they have never played. */
  load(playerId: string): Promise<Progression>;
  save(playerId: string, progression: Progression): Promise<void>;
}
