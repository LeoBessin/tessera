import { createProgression, grantUnlock, reachCheckpoint } from '@tessera/sim';
import { describe, expect, it } from 'vitest';
import { InMemoryProgressionRepository } from './InMemoryProgressionRepository.ts';

describe('InMemoryProgressionRepository', () => {
  it('starts a player who has never played at the beginning', async () => {
    const repository = new InMemoryProgressionRepository();
    expect(await repository.load('newcomer')).toEqual(createProgression());
  });

  it('round-trips saved progress', async () => {
    const repository = new InMemoryProgressionRepository();
    const saved = grantUnlock(reachCheckpoint(createProgression(), 'c3-span', 3), 'dash');
    await repository.save('alice', saved);
    expect(await repository.load('alice')).toEqual(saved);
  });

  it('keeps the progress of different players separate', async () => {
    // Progression is per player, not per party: one player's advance must never
    // appear in another's save.
    const repository = new InMemoryProgressionRepository();
    await repository.save('alice', reachCheckpoint(createProgression(), 'c5-keep', 5));
    expect((await repository.load('bob')).chapter).toBe(0);
  });
});
