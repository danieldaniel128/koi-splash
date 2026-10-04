import { describe, expect, it } from 'vitest';
import { createGoal, createGoals } from '../src/model/goals';
import type { RoundOutcome } from '../src/model/goals';
import type { PadEvent } from '../src/model/pads';

const bloom: PadEvent = {
  type: 'bloom',
  pad: { id: 1, at: { col: 0, row: 0 }, kind: 'bud', hitsLeft: 0, hitsNeeded: 2 },
};
const hit: PadEvent = { ...bloom, type: 'hit' };
const round = (over: Partial<RoundOutcome>): RoundOutcome => ({
  points: 0,
  padEvents: [],
  cleared: [],
  ...over,
});

describe('goals', () => {
  it('a lotus goal counts blooms only', () => {
    const goal = createGoal({ type: 'lotus', count: 2 });
    goal.record(round({ points: 500, padEvents: [hit] }));
    expect(goal.isComplete()).toBe(false);
    goal.record(round({ padEvents: [bloom, bloom] }));
    expect(goal.isComplete()).toBe(true);
    expect(goal.progress()).toEqual([{ kind: 'lotus', done: 2, target: 2 }]);
  });

  it('a score goal counts points', () => {
    const goal = createGoal({ type: 'score', target: 100 });
    goal.record(round({ points: 60, padEvents: [bloom] }));
    goal.record(round({ points: 60 }));
    expect(goal.isComplete()).toBe(true);
  });

  it('a koi goal counts the cleared koi of its colour only', () => {
    const goal = createGoal({ type: 'koi', kind: 0, count: 4 });
    goal.record(round({ cleared: [0, 0, 0, 2, 2, 2] }));
    expect(goal.progress()).toEqual([{ kind: 'koi', koi: 0, done: 3, target: 4 }]);
    goal.record(round({ cleared: [1, 1, 1, 0] }));
    expect(goal.isComplete()).toBe(true);
  });

  it('several goals win only when every one is reached, and report each', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'koi', kind: 3, count: 3 },
    ]);
    goal.record(round({ padEvents: [bloom] }));
    expect(goal.isComplete()).toBe(false);
    goal.record(round({ cleared: [3, 3, 3] }));
    expect(goal.isComplete()).toBe(true);
    expect(goal.progress().map((p) => p.kind)).toEqual(['lotus', 'koi']);
  });

  it('reset starts every goal over', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'koi', kind: 0, count: 3 },
    ]);
    goal.record(round({ padEvents: [bloom], cleared: [0] }));
    goal.reset();
    expect(goal.progress().map((p) => p.done)).toEqual([0, 0]);
  });
});
