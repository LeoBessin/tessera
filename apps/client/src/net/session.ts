import { Client, Predict } from '@colyseus/sdk';
import { GameStateSchema, MoveInputSchema, ROOM_NAME } from '@tessera/protocol';
import { applyInput, type MoveCommand } from '@tessera/sim';

/**
 * The connection to an authoritative session, with local prediction on top.
 *
 * The important line in this file is the `step` passed to the reconciler: it is
 * the very same `applyInput` the server runs. The client is not approximating
 * the server, it is executing it. When a correction arrives, the reconciler
 * rewinds to the authoritative state and replays the inputs the server has not
 * acknowledged yet, so a correction costs a few pixels of smoothing rather than
 * a visible snap.
 *
 * Other players are smoothed instead of predicted — their inputs are not ours
 * to guess.
 */

export interface PlayerView {
  readonly sessionId: string;
  readonly x: number;
  readonly y: number;
  readonly downed: boolean;
  readonly isSelf: boolean;
}

export interface CampaignSession {
  readonly sessionId: string;
  /** Advances prediction; returns how many fixed steps to feed input for. */
  tick(nowMs: number): number;
  /** Queues one tick of intent and applies it locally at once. */
  sendCommand(command: MoveCommand): void;
  /** Current view of every player, self included, ready to render. */
  players(): PlayerView[];
  leave(): Promise<void>;
}

/**
 * How long we will wait for the roster to mention us before deciding the
 * server is not going to say so. Generous: this is a stall, not a budget.
 */
export const JOIN_STATE_TIMEOUT_MS = 5_000;

/** The one thing this needs from a room: notice when a state patch lands. */
interface PatchSource {
  readonly onStateChange: {
    (listener: () => void): unknown;
    remove(listener: () => void): unknown;
  };
}

/**
 * Resolves once a state patch makes `readSelf` answer — our own player.
 *
 * A resolved `joinOrCreate` only means the seat reservation went through. The
 * roster lives in the room state, and the first patch carrying it lands a round
 * trip later — about 50ms against a server on localhost, longer over a real
 * network. Reading `players.get(sessionId)` the moment the join settles is
 * therefore a race, and one the client loses essentially every time.
 *
 * It waits for the patch that actually answers rather than merely the first
 * one: joining a room that already has players in it synchronises the others
 * first, and that patch is no answer to the question being asked here.
 */
export function waitForLocalPlayer<Self>(
  room: PatchSource,
  readSelf: () => Self | undefined,
): Promise<Self> {
  const alreadyThere = readSelf();
  if (alreadyThere !== undefined) return Promise.resolve(alreadyThere);

  return new Promise<Self>((resolve, reject) => {
    const stopListening = (): void => {
      clearTimeout(timer);
      room.onStateChange.remove(onPatch);
    };

    function onPatch(): void {
      const self = readSelf();
      if (self === undefined) return;
      stopListening();
      resolve(self);
    }

    const timer = setTimeout(() => {
      stopListening();
      reject(new Error('this session never appeared in the room state'));
    }, JOIN_STATE_TIMEOUT_MS);

    room.onStateChange(onPatch);
  });
}

export async function joinCampaign(endpoint: string): Promise<CampaignSession> {
  const client = new Client(endpoint);
  const room = await client.joinOrCreate(ROOM_NAME, {}, GameStateSchema);

  const predict = Predict.get(room);
  const input = room.input({ type: MoveInputSchema });

  // Everyone else: interpolated towards the authoritative state.
  predict.attachAll('players', {
    fields: ['x', 'y'],
    mode: 'damped',
    exceptKey: room.sessionId,
  });

  const self = await waitForLocalPlayer(room, () => room.state.players.get(room.sessionId));

  const me = predict.reconciler(self, {
    input,
    fields: ['x', 'y', 'vx', 'vy'],
    // The authoritative rule, executed locally. Not a copy of it — the same one.
    step: (ctx, state, command) => applyInput(state, command, ctx.dt),
    smoothMs: 65,
  });

  return {
    sessionId: room.sessionId,

    tick: (nowMs) => predict.tick(nowMs),

    sendCommand(command) {
      input.data.moveX = command.moveX;
      input.data.moveY = command.moveY;
      input.send();
    },

    players() {
      const views: PlayerView[] = [];
      for (const [sessionId, player] of room.state.players) {
        const isSelf = sessionId === room.sessionId;
        views.push({
          sessionId,
          // The local player reads from the predictor so input feels immediate;
          // everyone else reads the smoothed authoritative state.
          x: isSelf ? me.value('x') : player.x,
          y: isSelf ? me.value('y') : player.y,
          downed: player.downed,
          isSelf,
        });
      }
      return views;
    },

    leave: async () => {
      await room.leave();
    },
  };
}
