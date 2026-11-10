/**
 * Hashing for replay verification.
 *
 * A replay test runs a recorded input log and compares a digest of the final
 * world against a committed value. Floats are quantised first so the digest
 * tracks *behaviour* rather than bit patterns — otherwise a harmless
 * reassociation of arithmetic would fail the test and teach everyone to ignore
 * it.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Positions are in world units; a ten-thousandth of one is far below perception. */
export const DEFAULT_QUANTUM = 1e-4;

const NAN_SENTINEL = 0x7f80_0001;
const POSITIVE_INFINITY_SENTINEL = 0x7f80_0002;
const NEGATIVE_INFINITY_SENTINEL = 0x7f80_0003;

export interface Hasher {
  /** Folds in a float, rounded to `quantum`. */
  number(value: number, quantum?: number): Hasher;
  /** Folds in an integer exactly, with no quantisation. */
  int(value: number): Hasher;
  string(value: string): Hasher;
  bool(value: boolean): Hasher;
  /** Eight lowercase hex characters. */
  digest(): string;
}

export function createHasher(): Hasher {
  let hash = FNV_OFFSET_BASIS;

  const foldByte = (byte: number): void => {
    hash = Math.imul(hash ^ (byte & 0xff), FNV_PRIME) >>> 0;
  };

  const foldInt32 = (value: number): void => {
    const v = value | 0;
    foldByte(v);
    foldByte(v >>> 8);
    foldByte(v >>> 16);
    foldByte(v >>> 24);
  };

  const hasher: Hasher = {
    number(value, quantum = DEFAULT_QUANTUM) {
      if (Number.isNaN(value)) {
        foldInt32(NAN_SENTINEL);
      } else if (value === Number.POSITIVE_INFINITY) {
        foldInt32(POSITIVE_INFINITY_SENTINEL);
      } else if (value === Number.NEGATIVE_INFINITY) {
        foldInt32(NEGATIVE_INFINITY_SENTINEL);
      } else {
        // `+ 0` normalises -0, which would otherwise hash apart from 0.
        const quantised = Math.round(value / quantum) + 0;
        foldInt32(quantised);
        // Fold the high word too, so values beyond 2^31 quanta stay distinct.
        foldInt32(Math.floor(quantised / 0x1_0000_0000));
      }
      return hasher;
    },
    int(value) {
      foldInt32(value);
      return hasher;
    },
    string(value) {
      for (let i = 0; i < value.length; i++) foldInt32(value.charCodeAt(i));
      return hasher;
    },
    bool(value) {
      foldByte(value ? 1 : 0);
      return hasher;
    },
    digest: () => (hash >>> 0).toString(16).padStart(8, '0'),
  };

  return hasher;
}
