import type { GoalProgress } from '../model/goals';

/** What the player needs to see about the level right now. Shown by the HUD and the end card. */
export interface GameStatus {
  readonly movesLeft: number;
  readonly score: number;
  readonly goal: GoalProgress;
}
