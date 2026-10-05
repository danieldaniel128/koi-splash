import type { PieceColor, PadEvent } from './types';

/** What one cascade round did, as far as a goal cares. */
export interface RoundOutcome {
  readonly points: number;
  readonly padEvents: readonly PadEvent[];
  /** The colors of the koi it cleared, one entry per koi. */
  readonly cleared: readonly PieceColor[];
}

/** How far one goal has got; `koi` says which colour, for a koi goal. */
export interface GoalProgress {
  readonly type: GoalDef['type'];
  readonly color?: PieceColor;
  readonly done: number;
  readonly target: number;
}

/**
 * What the player must reach to win a level (Strategy). The scene feeds every cascade round in and asks whether it
 * is complete; it never knows which goal it runs, or how many (see AllGoals). A new goal type is a variant of GoalDef:
 * the compiler then asks for it in createGoal, the goal chip's icon (GoalTray) and the end card's line (ResultCard).
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
  | { readonly type: 'koi'; readonly color: PieceColor; readonly count: number };

/** How many of these goals are met. O(goals). */
export function goalsMet(goals: readonly GoalProgress[]): number {
  return goals.filter((goal) => goal.done >= goal.target).length;
}

/**
 * Feeds a round to the goals and pays `bonus` for each goal it meets. The bonus is fed to the goals too, so a score
 * goal counts every point the player sees (and may be met by another goal's bonus). Returns the round's points with
 * the bonuses. O(goals) per goal met.
 */
export function recordRound(goal: Goal, round: RoundOutcome, bonus: number): number {
  const metBefore = goalsMet(goal.progress());
  goal.record(round);
  const met = goalsMet(goal.progress()) - metBefore;
  if (met === 0) return round.points;
  return round.points + recordRound(goal, { points: met * bonus, padEvents: [], cleared: [] }, bonus);
}

/** Which type of goal: bloom lotuses, score points or clear koi of a color. */
export type GoalType = GoalDef['type'];

/**
 * Throws when a level's goals can't all be reached on its board: more lotuses to bloom than buds, or koi of a colour
 * that isn't in play. Checked at startup, so a slip in the config fails there, not as a level nobody can win. O(goals).
 */
export function checkGoals(
  defs: readonly GoalDef[],
  board: { readonly buds: number; readonly colorCount: number },
): void {
  for (const def of defs) {
    if (def.type === 'lotus' && def.count > board.buds)
      throw new RangeError(`goals: ${def.count} lotuses to bloom, but only ${board.buds} buds on the board`);
    if (
      def.type === 'koi' &&
      !(Number.isInteger(def.color) && def.color >= 0 && def.color < board.colorCount)
    )
      throw new RangeError(`goals: koi color ${def.color} is not in play (0 to ${board.colorCount - 1})`);
  }
}

/** All of a level's goals as one: won when every one of them is. */
export function createGoals(defs: readonly GoalDef[]): Goal {
  return new AllGoals(defs.map((def) => createGoal(def)));
}

export function createGoal(def: GoalDef): Goal {
  switch (def.type) {
    case 'lotus':
      return new CountingGoal(
        { type: 'lotus' },
        def.count,
        (round) => round.padEvents.filter((e) => e.type === 'bloom').length,
      );
    case 'score':
      return new CountingGoal({ type: 'score' }, def.target, (round) => round.points);
    case 'koi':
      return new CountingGoal(
        { type: 'koi', color: def.color },
        def.count,
        (round) => round.cleared.filter((color) => color === def.color).length,
      );
  }
}

/** A goal reached when a running total hits a target; `gain` says how much each round adds. */
class CountingGoal implements Goal {
  private done = 0;

  constructor(
    private readonly label: Pick<GoalProgress, 'type' | 'color'>,
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
