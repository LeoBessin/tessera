import { createProgression, type Progression } from '@tessera/sim';
import type { ProgressionRepository } from '../ports/ProgressionRepository.ts';

/**
 * Progress kept in process memory.
 *
 * Correct, fast, and forgets everything when the server restarts — which is
 * exactly right for development and for tests, and exactly wrong for
 * production. Swapping in a durable adapter is a one-line change at the
 * composition root.
 */
export class InMemoryProgressionRepository implements ProgressionRepository {
  readonly #byPlayer = new Map<string, Progression>();

  async load(playerId: string): Promise<Progression> {
    return this.#byPlayer.get(playerId) ?? createProgression();
  }

  async save(playerId: string, progression: Progression): Promise<void> {
    this.#byPlayer.set(playerId, progression);
  }
}
