import { describe, expect, it } from 'vitest';
import { starMeter } from '../src/ui/StarBar';

const RULE = { two: 0.15, three: 0.35 };

describe('starMeter', () => {
  it('gives each star a third of the bar, whatever the thresholds', () => {
    expect(starMeter(1, RULE)).toBeCloseTo(1);
    expect(starMeter(RULE.three, RULE)).toBeCloseTo(2 / 3);
    expect(starMeter(RULE.two, RULE)).toBeCloseTo(1 / 3);
    expect(starMeter(0, RULE)).toBeCloseTo(0);
  });

  it('only ever drains as moves are spent', () => {
    let last = Infinity;
    for (let left = 1; left >= 0; left -= 0.01) {
      const at = starMeter(left, RULE);
      expect(at).toBeLessThanOrEqual(last + 1e-9);
      last = at;
    }
  });
});
