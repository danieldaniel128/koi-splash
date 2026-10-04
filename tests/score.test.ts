import { describe, expect, it } from 'vitest';
import { scoreSwap } from '../src/model/score';
import type { CascadeStep, Cleared } from '../src/model/types';

/** A cascade round that cleared `count` pieces (only the count matters for scoring). */
function round(count: number): CascadeStep {
  const cleared: Cleared[] = Array.from({ length: count }, (_, i) => ({
    piece: { id: i, kind: 0 },
    at: { col: i, row: 0 },
  }));
  return { matches: [], created: [], fired: [], cleared, padEvents: [], falls: [], spawns: [] };
}

describe('scoreSwap', () => {
  it('pays per cleared piece', () => {
    expect(scoreSwap([round(3)], 10)).toBe(30);
  });

  it('pays more for later rounds of a cascade', () => {
    // 3 pieces in round 1, then 4 pieces in round 2 at double value
    expect(scoreSwap([round(3), round(4)], 10)).toBe(30 + 80);
  });

  it('gives nothing for no rounds', () => {
    expect(scoreSwap([], 10)).toBe(0);
  });
});
