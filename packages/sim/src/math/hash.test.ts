import { describe, expect, it } from 'vitest';
import { createHasher } from './hash.ts';

describe('createHasher', () => {
  it('is stable for identical input', () => {
    const a = createHasher().number(1.5).string('player').bool(true).digest();
    const b = createHasher().number(1.5).string('player').bool(true).digest();
    expect(a).toBe(b);
  });

  it('differs when any value differs', () => {
    const a = createHasher().number(1.5).digest();
    const b = createHasher().number(1.6).digest();
    expect(a).not.toBe(b);
  });

  it('is order-sensitive', () => {
    const a = createHasher().number(1).number(2).digest();
    const b = createHasher().number(2).number(1).digest();
    expect(a).not.toBe(b);
  });

  it('ignores differences finer than the quantum', () => {
    // A replay hash should catch behavioural drift, not the last bit of a float.
    // Without quantisation, a harmless reordering of arithmetic breaks the test.
    const a = createHasher().number(1.0).digest();
    const b = createHasher().number(1.0 + 1e-9).digest();
    expect(a).toBe(b);
  });

  it('treats negative zero as zero', () => {
    expect(createHasher().number(-0).digest()).toBe(createHasher().number(0).digest());
  });

  it('encodes non-finite values distinctly instead of throwing', () => {
    const nan = createHasher().number(Number.NaN).digest();
    const inf = createHasher().number(Number.POSITIVE_INFINITY).digest();
    const zero = createHasher().number(0).digest();
    expect(new Set([nan, inf, zero]).size).toBe(3);
  });

  it('renders a fixed-width hexadecimal digest', () => {
    expect(createHasher().number(123).digest()).toMatch(/^[0-9a-f]{8}$/);
  });
});
