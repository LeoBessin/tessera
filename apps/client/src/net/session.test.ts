import { afterEach, describe, expect, it, vi } from 'vitest';
import { JOIN_STATE_TIMEOUT_MS, waitForLocalPlayer } from './session.ts';

/**
 * Joining is two events, not one.
 *
 * `joinOrCreate` settles on the seat reservation; the roster arrives in the
 * first state patch, a round trip later. Everything here is about the gap
 * between the two — measured at ~50ms against a local server, which is to say
 * it is never not there.
 */

interface FakePlayer {
  readonly id: string;
}

/** The shape of `room.onStateChange`: callable to register, with `remove`. */
function createPatchSignal() {
  let listeners: Array<() => void> = [];

  const signal = (listener: () => void) => {
    listeners.push(listener);
    return signal;
  };
  signal.remove = (listener: () => void) => {
    listeners = listeners.filter((candidate) => candidate !== listener);
  };
  signal.emit = () => {
    for (const listener of [...listeners]) listener();
  };
  signal.listenerCount = () => listeners.length;

  return signal;
}

function fakeRoom(sessionId = 'us') {
  const players = new Map<string, FakePlayer>();
  const onStateChange = createPatchSignal();

  return {
    sessionId,
    players,
    onStateChange,
    /** How the client reads its own entry out of the synchronised roster. */
    readSelf: () => players.get(sessionId),
    /** One state patch landing, carrying whichever players it carries. */
    patch(...sessionIds: string[]) {
      for (const id of sessionIds) players.set(id, { id });
      onStateChange.emit();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('waiting for the local player to appear', () => {
  it('waits for the first state patch rather than reading an empty roster', async () => {
    const room = fakeRoom();
    const pending = waitForLocalPlayer(room, room.readSelf);

    // The roster is empty at this instant — the old code read it here and threw.
    expect(room.players.size).toBe(0);

    room.patch('us');
    await expect(pending).resolves.toEqual({ id: 'us' });
  });

  it('keeps waiting through a patch that carries other players but not us', async () => {
    const room = fakeRoom();
    const pending = waitForLocalPlayer(room, room.readSelf);

    room.patch('someone-else');
    room.patch('us');

    await expect(pending).resolves.toEqual({ id: 'us' });
  });

  it('takes an entry that is already there without waiting for another patch', async () => {
    // Reconnecting into a session that is already synchronised must not stall
    // for a tick that may be 16ms away.
    const room = fakeRoom();
    room.patch('us');

    await expect(waitForLocalPlayer(room, room.readSelf)).resolves.toEqual({ id: 'us' });
    expect(room.onStateChange.listenerCount()).toBe(0);
  });

  it('stops listening once it has us, so patches cost nothing afterwards', async () => {
    const room = fakeRoom();
    const pending = waitForLocalPlayer(room, room.readSelf);
    room.patch('us');
    await pending;

    expect(room.onStateChange.listenerCount()).toBe(0);
  });

  it('gives up rather than hanging when the roster never mentions us', async () => {
    vi.useFakeTimers();
    const room = fakeRoom();
    const pending = waitForLocalPlayer(room, room.readSelf);
    // Something is wrong on the server; a player who waits forever is told
    // nothing, and a blank screen is the worst failure mode there is.
    const assertion = expect(pending).rejects.toThrow(/never appeared/);

    await vi.advanceTimersByTimeAsync(JOIN_STATE_TIMEOUT_MS);
    await assertion;
    expect(room.onStateChange.listenerCount()).toBe(0);
  });

  it('does not give up early while patches are still arriving without us', async () => {
    vi.useFakeTimers();
    const room = fakeRoom();
    const pending = waitForLocalPlayer(room, room.readSelf);

    await vi.advanceTimersByTimeAsync(JOIN_STATE_TIMEOUT_MS - 1);
    room.patch('us');

    await expect(pending).resolves.toEqual({ id: 'us' });
  });
});
