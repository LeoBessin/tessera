/**
 * A seeded pseudo-random number generator.
 *
 * The simulation never calls `Math.random()`. Every random draw comes from one
 * of these, so a seed plus an input log reproduces a run exactly — which is
 * what makes replay-based regression testing possible.
 */
export interface Prng {
  /** The seed this generator was created from. */
  readonly seed: number;
  /** Next raw 32-bit value. */
  nextUint32(): number;
  /** Next float in `[0, 1)`. */
  nextFloat(): number;
  /** Next integer in `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
  /** A new generator whose stream is independent of this one's. */
  fork(): Prng;
  /** A copy positioned exactly where this generator currently stands. */
  clone(): Prng;
  /** Opaque cursor, for snapshotting. */
  getState(): number;
  /** Rewinds (or fast-forwards) to a cursor from {@link getState}. */
  setState(state: number): void;
}

/**
 * Mulberry32: small, fast, and good enough for gameplay randomness. Chosen over
 * anything cryptographic because determinism and speed matter here and
 * unpredictability does not.
 */
export function createPrng(seed: number): Prng {
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  const prng: Prng = {
    seed,
    nextUint32,
    nextFloat: () => nextUint32() / 0x1_0000_0000,
    nextInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`nextInt requires a positive integer bound, got ${maxExclusive}`);
      }
      return Math.floor(prng.nextFloat() * maxExclusive);
    },
    fork: () => createPrng(nextUint32()),
    clone() {
      const copy = createPrng(seed);
      copy.setState(state);
      return copy;
    },
    getState: () => state,
    setState(next) {
      state = next >>> 0;
    },
  };

  return prng;
}
