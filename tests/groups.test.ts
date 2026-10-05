import { describe, expect, it } from 'vitest';
import { groupMatches } from '../src/model/groups';
import type { Match } from '../src/model/types';

const row = (row: number, from: number, length: number, color = 1): Match => ({
  color,
  direction: 'row',
  cells: Array.from({ length }, (_, i) => ({ col: from + i, row })),
});
const col = (col: number, from: number, length: number, color = 1): Match => ({
  color,
  direction: 'col',
  cells: Array.from({ length }, (_, i) => ({ col, row: from + i })),
});

describe('groupMatches', () => {
  it('a straight run of 4 is one straight group, its middle where a special would go', () => {
    const [group] = groupMatches([row(2, 1, 4)]);
    expect(group?.longest).toBe(4);
    expect(group?.along).toBe('row');
    expect(group?.corner).toBeNull();
    expect(group?.middle).toEqual({ col: 3, row: 2 });
  });

  it('an L joins its two runs, with the corner where they meet', () => {
    const groups = groupMatches([row(4, 0, 3), col(0, 2, 3)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cells).toHaveLength(5);
    expect(groups[0]?.corner).toEqual({ col: 0, row: 4 });
  });

  it('a T joins at its joint, and two runs apart stay two groups', () => {
    const [t] = groupMatches([row(1, 2, 3), col(3, 1, 3)]);
    expect(t?.corner).toEqual({ col: 3, row: 1 });
    expect(groupMatches([row(0, 0, 3), row(5, 0, 3, 2)])).toHaveLength(2);
  });

  it('a run of 5 crossing a run of 3 is one group with a longest of 5', () => {
    const [group] = groupMatches([row(3, 0, 5), col(2, 1, 3)]);
    expect(group?.longest).toBe(5);
    expect(group?.cells).toHaveLength(7);
  });
});
