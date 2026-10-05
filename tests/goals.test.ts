import { describe, expect, it } from 'vitest';
import { BOARD } from '../src/config/board';
import { LEVEL } from '../src/config/level';
import { checkGoals, createGoal, createGoals, goalsMet, recordRound } from '../src/model/goals';
import type { RoundTally } from '../src/model/goals';
import type { PadEvent } from '../src/model/types';

const bloom: PadEvent = {
  type: 'bloom',
  pad: { id: 1, at: { col: 0, row: 0 }, kind: 'bud', hitsLeft: 0, hitsNeeded: 2 },
};
const hit: PadEvent = { ...bloom, type: 'hit' };
const round = (over: Partial<RoundTally>): RoundTally => ({
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
    expect(goal.progress()).toEqual([{ type: 'lotus', done: 2, target: 2 }]);
  });

  it('a score goal counts points', () => {
    const goal = createGoal({ type: 'score', target: 100 });
    goal.record(round({ points: 60, padEvents: [bloom] }));
    goal.record(round({ points: 60 }));
    expect(goal.isComplete()).toBe(true);
  });

  it('a koi goal counts the cleared koi of its colour only', () => {
    const goal = createGoal({ type: 'koi', color: 0, count: 4 });
    goal.record(round({ cleared: [0, 0, 0, 2, 2, 2] }));
    expect(goal.progress()).toEqual([{ type: 'koi', color: 0, done: 3, target: 4 }]);
    goal.record(round({ cleared: [1, 1, 1, 0] }));
    expect(goal.isComplete()).toBe(true);
  });

  it('several goals win only when every one is reached, and report each', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'koi', color: 3, count: 3 },
    ]);
    goal.record(round({ padEvents: [bloom] }));
    expect(goal.isComplete()).toBe(false);
    goal.record(round({ cleared: [3, 3, 3] }));
    expect(goal.isComplete()).toBe(true);
    expect(goal.progress().map((p) => p.type)).toEqual(['lotus', 'koi']);
  });

  it('counts the goals met, for their bonus', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'koi', color: 0, count: 2 },
    ]);
    expect(goalsMet(goal.progress())).toBe(0);
    goal.record(round({ padEvents: [bloom], cleared: [0] }));
    expect(goalsMet(goal.progress())).toBe(1);
  });

  it('pays a bonus for each goal a round meets, and a score goal counts the bonuses too', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'score', target: 600 },
    ]);
    expect(recordRound(goal, round({ points: 50 }), 500)).toBe(50);
    // the bloom meets the lotus goal; its bonus takes the score to 650, which meets the score goal and pays again
    expect(recordRound(goal, round({ points: 100, padEvents: [bloom] }), 500)).toBe(1100);
    expect(goal.isComplete()).toBe(true);
  });

  it('refuses goals the board cannot meet, and passes the shipped level', () => {
    const board = { buds: 2, colorCount: 5 };
    expect(() => {
      checkGoals([{ type: 'lotus', count: 3 }], board);
    }).toThrow(/3 lotuses/);
    expect(() => {
      checkGoals([{ type: 'koi', color: 5, count: 10 }], board);
    }).toThrow(/color 5/);
    expect(() => {
      checkGoals(LEVEL.goals, { buds: LEVEL.pads.buds, colorCount: BOARD.colorCount });
    }).not.toThrow();
  });

  it('reset starts every goal over', () => {
    const goal = createGoals([
      { type: 'lotus', count: 1 },
      { type: 'koi', color: 0, count: 3 },
    ]);
    goal.record(round({ padEvents: [bloom], cleared: [0] }));
    goal.reset();
    expect(goal.progress().map((p) => p.done)).toEqual([0, 0]);
  });
});
