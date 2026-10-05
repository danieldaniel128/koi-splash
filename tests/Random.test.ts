import { describe, expect, it } from 'vitest';
import { Random, seedFromQuery } from '../src/core/Random';

const draws = (random: Random, count: number): number[] => Array.from({ length: count }, () => random.next());

describe('Random', () => {
  it('gives the same numbers for the same seed, and different ones for another', () => {
    expect(draws(new Random(42), 100)).toEqual(draws(new Random(42), 100));
    expect(draws(new Random(42), 100)).not.toEqual(draws(new Random(43), 100));
  });

  it('reads a seed as a 32-bit whole number, so a big one like the clock is reproducible too', () => {
    const clock = 1_790_000_000_123;
    expect(draws(new Random(clock), 20)).toEqual(draws(new Random(clock % 2 ** 32), 20));
    expect(draws(new Random(-1), 20)).toEqual(draws(new Random(2 ** 32 - 1), 20));
  });

  it('draws floats in [0, 1)', () => {
    for (const value of draws(new Random(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('draws whole numbers in [min, max], both ends included', () => {
    const random = new Random(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const value = random.int(-2, 2);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('draws floats in [min, max)', () => {
    const random = new Random(5);
    for (let i = 0; i < 2_000; i++) {
      const value = random.range(0.5, 1.5);
      expect(value).toBeGreaterThanOrEqual(0.5);
      expect(value).toBeLessThan(1.5);
    }
  });

  it('picks every item of a list in time, and refuses an empty list', () => {
    const random = new Random(9);
    const seen = new Set(Array.from({ length: 200 }, () => random.pick(['a', 'b', 'c', 'd'])));
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(() => random.pick([])).toThrow('pick() from an empty list');
  });
});

describe('seedFromQuery', () => {
  it('reads the seed a page address asks for', () => {
    expect(seedFromQuery('?seed=42', 7)).toBe(42);
    expect(seedFromQuery('?level=1&seed=-3', 7)).toBe(-3);
  });

  it('falls back when the address asks for no seed, or for one that is not a whole number', () => {
    for (const query of ['', '?', '?level=1', '?seed=', '?seed=abc', '?seed=1.5', '?seed=12px']) {
      expect(seedFromQuery(query, 7)).toBe(7);
    }
  });
});
