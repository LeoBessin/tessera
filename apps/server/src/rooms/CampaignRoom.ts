import { Room, type Client } from '@colyseus/core';
import {
  GameStateSchema,
  INPUT_BUFFER_SIZE,
  MAX_PARTY_SIZE,
  MoveInputSchema,
  PlayerSchema,
  TICK_RATE_HZ,
} from '@tessera/protocol';
import { applyInput, createProgression, recordDeath, type Progression } from '@tessera/sim';
import type { ProgressionRepository } from '../ports/ProgressionRepository.ts';

/**
 * One co-operative session: two to four players sharing a world.
 *
 * The room is an adapter and nothing more. It owns sockets, sessions and
 * persistence; it owns no rules. Every decision about how the game behaves is
 * delegated to `@tessera/sim`, and the very same `applyInput` runs inside each
 * connected client's predictor.
 *
 * Authority is real but unparanoid. This is co-op, not competitive play: a
 * cheater can only spoil their own party, so the server validates what keeps
 * the simulation coherent (input magnitude, who may move) and does not spend
 * effort on an adversary who is only cheating themselves.
 */
export class CampaignRoom extends Room<{
  state: GameStateSchema;
  input: MoveInputSchema;
}> {
  /**
   * Injected at the composition root rather than constructed here, so tests can
   * run a room against a repository that does not touch a database.
   */
  static repository: ProgressionRepository;

  override maxClients = MAX_PARTY_SIZE;

  override state = new GameStateSchema();

  /** Per-client ring of inputs, consumed one per tick. */
  override inputs = this.defineInput(MoveInputSchema, { bufferMaxSize: INPUT_BUFFER_SIZE });

  /**
   * Positions recorded every patch so hit tests can be resolved against the
   * world as the shooting client actually saw it, half a second ago at worst.
   */
  rewind = this.allowRewindState({ maxRewindMs: 500 });

  /** Live progression per session, flushed back to storage on leave. */
  readonly #progression = new Map<string, Progression>();

  override onCreate(): void {
    this.rewind.attachAll(this.state.players, { fields: ['x', 'y'] });

    // Advertises the rate to predicting clients, which is what keeps their
    // local integration in step with ours.
    this.setFixedTimestep((ctx) => this.#step(ctx.dt), TICK_RATE_HZ);
  }

  #step(dt: number): void {
    this.state.tick += 1;

    for (const [sessionId, player] of this.state.players) {
      if (player.downed) continue;

      const command = this.inputs.get(sessionId).next();
      if (command) applyInput(player, command, dt);
    }
  }

  override async onJoin(client: Client): Promise<void> {
    const playerId = this.#playerIdOf(client);
    const progression = await CampaignRoom.repository.load(playerId);
    this.#progression.set(client.sessionId, progression);

    const player = new PlayerSchema();
    player.id = playerId;
    player.chapter = progression.chapter;
    player.deaths = progression.deaths;
    this.state.players.set(client.sessionId, player);
  }

  override async onLeave(client: Client): Promise<void> {
    const progression = this.#progression.get(client.sessionId);
    if (progression) {
      // Persist before forgetting: a player who disconnects mid-session keeps
      // everything they earned.
      await CampaignRoom.repository.save(this.#playerIdOf(client), progression);
      this.#progression.delete(client.sessionId);
    }
    this.state.players.delete(client.sessionId);
  }

  /**
   * Notes a death against the player's own record.
   *
   * It costs them a tally and a few seconds, never a step backwards — the
   * guarantee is enforced in `recordDeath`, not restated here.
   */
  noteDeath(sessionId: string): void {
    const progression = this.#progression.get(sessionId);
    if (!progression) return;

    const updated = recordDeath(progression);
    this.#progression.set(sessionId, updated);

    const player = this.state.players.get(sessionId);
    if (player) player.deaths = updated.deaths;
  }

  /**
   * Identity for persistence. Anonymous sessions get their own throwaway
   * progression; a real account replaces this once authentication lands.
   */
  #playerIdOf(client: Client): string {
    return (client.auth as { playerId?: string } | undefined)?.playerId ?? client.sessionId;
  }
}

export const createInitialProgression = createProgression;
