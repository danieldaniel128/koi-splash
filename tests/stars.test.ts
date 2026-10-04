import { describe, expect, it } from 'vitest';
import { starsFor } from '../src/model/stars';

const RULE = { two: 0.15, three: 0.35 };

describe('starsFor', () => {
  it('gives three stars with plenty of moves left, two with a few, one on the last moves', () => {
    expect(starsFor(15, 20, RULE)).toBe(3);
    expect(starsFor(7, 20, RULE)).toBe(3); // exactly 35%
    expect(starsFor(6, 20, RULE)).toBe(2);
    expect(starsFor(3, 20, RULE)).toBe(2); // exactly 15%
    expect(starsFor(2, 20, RULE)).toBe(1);
    expect(starsFor(0, 20, RULE)).toBe(1);
  });
});
