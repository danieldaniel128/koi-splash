import type { GoalProgress } from '../model/goals';

/** What the player needs to see about the level right now. Shown by the HUD and the end card. */
export interface GameStatus {
  readonly movesLeft: number;
  /** The level's moves in all, and the stars the score has earned so far (see starsFor; a win gets one at least). */
  readonly moves: number;
  readonly stars: number;
  readonly score: number;
  /** Each of the level's goals. */
  readonly goals: readonly GoalProgress[];
}
