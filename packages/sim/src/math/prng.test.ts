import { describe, expect, it } from 'vitest';
import { createPrng } from './prng.ts';

describe('createPrng', () => {
  it('produces an identical sequence for an identical seed', () => {
    // This is the single property the entire replay-testing strategy rests on.
    const a = createPrng(1234);
    const b = createPrng(1234);
    const seqA = Array.from({ length: 64 }, () => a.nextFloat());
    const seqB = Array.from({ length: 64 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = createPrng(1);
    const b = createPrng(2);
    expect(a.nextFloat()).not.toBe(b.nextFloat());
  });

  it('yields floats within [0, 1)', () => {
    const prng = createPrng(99);
    for (let i = 0; i < 1000; i++) {
      const value = prng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('yields integers within [0, maxExclusive)', () => {
    const prng = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const value = prng.nextInt(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('rejects a non-positive integer bound rather than returning NaN', () => {
    expect(() => createPrng(1).nextInt(0)).toThrow(RangeError);
  });

  it('clones independently of the original', () => {
    const original = createPrng(42);
    original.nextFloat();
    const clone = original.clone();
    expect(clone.nextFloat()).toBe(original.nextFloat());
  });

  it('forks into a stream that diverges from its parent', () => {
    // Forking lets independent systems draw randomness without consuming each
    // other's stream, which would couple them and destroy reproducibility.
    const parent = createPrng(5);
    const child = parent.fork();
    const childSeq = Array.from({ length: 8 }, () => child.nextFloat());
    const parentSeq = Array.from({ length: 8 }, () => parent.nextFloat());
    expect(childSeq).not.toEqual(parentSeq);
  });

  it('restores an captured state exactly', () => {
    const prng = createPrng(11);
    prng.nextFloat();
    const saved = prng.getState();
    const expected = prng.nextFloat();
    prng.setState(saved);
    expect(prng.nextFloat()).toBe(expected);
  });
});
