import type { PadEvent } from './pads';

/** What one cascade round did, as far as a goal cares. */
export interface RoundOutcome {
  readonly points: number;
  readonly padEvents: readonly PadEvent[];
}

export interface GoalProgress {
  readonly kind: GoalDef['type'];
  readonly done: number;
  readonly target: number;
}

/**
 * What the player must reach to win a level (Strategy). The scene feeds every cascade round in and asks whether it
 * is complete; it never knows which goal it runs. A new goal type is one class here plus one line in createGoal.
 */
export interface Goal {
  record(round: RoundOutcome): void;
  isComplete(): boolean;
  progress(): GoalProgress;
  reset(): void;
}

/** How a level states its goal, in config. */
export type GoalDef =
  { readonly type: 'lotus'; readonly count: number } | { readonly type: 'score'; readonly target: number };

export function createGoal(def: GoalDef): Goal {
  switch (def.type) {
    case 'lotus':
      return new CountingGoal(
        'lotus',
        def.count,
        (round) => round.padEvents.filter((e) => e.type === 'bloom').length,
      );
    case 'score':
      return new CountingGoal('score', def.target, (round) => round.points);
  }
}

/** A goal reached when a running total hits a target; `gain` says how much each round adds. */
class CountingGoal implements Goal {
  private done = 0;

  constructor(
    private readonly kind: GoalDef['type'],
    private readonly target: number,
    private readonly gain: (round: RoundOutcome) => number,
  ) {}

  record(round: RoundOutcome): void {
    this.done += this.gain(round);
  }

  isComplete(): boolean {
    return this.done >= this.target;
  }

  progress(): GoalProgress {
    return { kind: this.kind, done: Math.min(this.done, this.target), target: this.target };
  }

  reset(): void {
    this.done = 0;
  }
}
