import type { PadEvent } from './pads';
import type { Kind } from './types';

/** What one cascade round did, as far as a goal cares. */
export interface RoundOutcome {
  readonly points: number;
  readonly padEvents: readonly PadEvent[];
  /** The kinds of the koi it cleared, one entry per koi. */
  readonly cleared: readonly Kind[];
}

/** How far one goal has got; `koi` says which colour, for a koi goal. */
export interface GoalProgress {
  readonly kind: GoalDef['type'];
  readonly koi?: Kind;
  readonly done: number;
  readonly target: number;
}

/**
 * What the player must reach to win a level (Strategy). The scene feeds every cascade round in and asks whether it
 * is complete; it never knows which goal it runs, or how many (see AllGoals). A new goal type is one line here.
 */
export interface Goal {
  record(round: RoundOutcome): void;
  isComplete(): boolean;
  /** Each goal's progress, in the order the level lists them. */
  progress(): GoalProgress[];
  reset(): void;
}

/** How a level states a goal, in config: bloom lotuses, score points, or clear koi of one colour. */
export type GoalDef =
  | { readonly type: 'lotus'; readonly count: number }
  | { readonly type: 'score'; readonly target: number }
  | { readonly type: 'koi'; readonly kind: Kind; readonly count: number };

/** How many of these goals are met. O(goals). */
export function goalsMet(goals: readonly GoalProgress[]): number {
  return goals.filter((goal) => goal.done >= goal.target).length;
}

/** All of a level's goals as one: won when every one of them is. */
export function createGoals(defs: readonly GoalDef[]): Goal {
  return new AllGoals(defs.map((def) => createGoal(def)));
}

export function createGoal(def: GoalDef): Goal {
  switch (def.type) {
    case 'lotus':
      return new CountingGoal(
        { kind: 'lotus' },
        def.count,
        (round) => round.padEvents.filter((e) => e.type === 'bloom').length,
      );
    case 'score':
      return new CountingGoal({ kind: 'score' }, def.target, (round) => round.points);
    case 'koi':
      return new CountingGoal(
        { kind: 'koi', koi: def.kind },
        def.count,
        (round) => round.cleared.filter((kind) => kind === def.kind).length,
      );
  }
}

/** A goal reached when a running total hits a target; `gain` says how much each round adds. */
class CountingGoal implements Goal {
  private done = 0;

  constructor(
    private readonly label: Pick<GoalProgress, 'kind' | 'koi'>,
    private readonly target: number,
    private readonly gain: (round: RoundOutcome) => number,
  ) {}

  record(round: RoundOutcome): void {
    this.done += this.gain(round);
  }

  isComplete(): boolean {
    return this.done >= this.target;
  }

  progress(): GoalProgress[] {
    return [{ ...this.label, done: Math.min(this.done, this.target), target: this.target }];
  }

  reset(): void {
    this.done = 0;
  }
}

/** Several goals played as one (Composite): every round goes to each, and it's complete when all of them are. */
class AllGoals implements Goal {
  constructor(private readonly goals: readonly Goal[]) {}

  record(round: RoundOutcome): void {
    for (const goal of this.goals) goal.record(round);
  }

  isComplete(): boolean {
    return this.goals.every((goal) => goal.isComplete());
  }

  progress(): GoalProgress[] {
    return this.goals.flatMap((goal) => goal.progress());
  }

  reset(): void {
    for (const goal of this.goals) goal.reset();
  }
}
