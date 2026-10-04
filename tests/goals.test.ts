import { describe, expect, it } from 'vitest';
import { createGoal } from '../src/model/goals';
import type { PadEvent } from '../src/model/pads';

const bloom: PadEvent = {
  type: 'bloom',
  pad: { id: 1, at: { col: 0, row: 0 }, kind: 'bud', hitsLeft: 0, hitsNeeded: 2 },
};
const hit: PadEvent = { ...bloom, type: 'hit' };

describe('goals', () => {
  it('a lotus goal counts blooms only', () => {
    const goal = createGoal({ type: 'lotus', count: 2 });
    goal.record({ points: 500, padEvents: [hit] });
    expect(goal.isComplete()).toBe(false);
    goal.record({ points: 0, padEvents: [bloom, bloom] });
    expect(goal.isComplete()).toBe(true);
    expect(goal.progress()).toEqual({ kind: 'lotus', done: 2, target: 2 });
  });

  it('a score goal counts points', () => {
    const goal = createGoal({ type: 'score', target: 100 });
    goal.record({ points: 60, padEvents: [bloom] });
    goal.record({ points: 60, padEvents: [] });
    expect(goal.isComplete()).toBe(true);
  });

  it('reset starts over', () => {
    const goal = createGoal({ type: 'lotus', count: 1 });
    goal.record({ points: 0, padEvents: [bloom] });
    goal.reset();
    expect(goal.progress().done).toBe(0);
  });
});
