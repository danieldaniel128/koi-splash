import { describe, expect, it } from 'vitest';
import { starsFor, starsForWin } from '../src/model/stars';

const RULE = { scores: [1000, 2000, 3000] } as const;

describe('starsFor', () => {
  it('earns a star at each score reached', () => {
    expect(starsFor(0, RULE)).toBe(0);
    expect(starsFor(999, RULE)).toBe(0);
    expect(starsFor(1000, RULE)).toBe(1);
    expect(starsFor(2500, RULE)).toBe(2);
    expect(starsFor(3000, RULE)).toBe(3);
    expect(starsFor(9000, RULE)).toBe(3);
  });
});

describe('starsForWin', () => {
  it('rates a win one star at least, however low its score', () => {
    expect(starsForWin(0, RULE)).toBe(1);
    expect(starsForWin(1000, RULE)).toBe(1);
    expect(starsForWin(2500, RULE)).toBe(2);
    expect(starsForWin(3000, RULE)).toBe(3);
  });
});
