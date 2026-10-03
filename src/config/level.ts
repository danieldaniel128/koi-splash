/** The one level for now: reach the target score within the moves. Only valid swaps spend a move. */
export const LEVEL = {
  moves: 20,
  /** Tuned with a simulation of a weak player (always the first move found): about 1300 in 20 moves on average. */
  targetScore: 1500,
} as const;

export const SCORE = {
  pointsPerPiece: 10,
} as const;
