import { TICK_RATE_HZ } from '@tessera/sim';

/** Re-exported so the transport layer and the simulation cannot drift apart. */
export { TICK_RATE_HZ };

export const ROOM_NAME = 'campaign';

/** A party is small by design: the campaign is tuned for two to four players. */
export const MAX_PARTY_SIZE = 4;

/**
 * Inputs held per client awaiting consumption. Roughly two seconds at the tick
 * rate — enough to ride out a network hiccup, short enough that a client cannot
 * bank inputs and spend them in a burst.
 */
export const INPUT_BUFFER_SIZE = 64;
