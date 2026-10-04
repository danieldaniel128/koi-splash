/**
 * The win rating, as in the prototype: one star for completing the goal, two or three when at least this share of the
 * level's moves is still left at that moment.
 */
export interface StarRule {
  readonly two: number;
  readonly three: number;
}

/** The stars a win right now would earn (1 to 3). O(1). */
export function starsFor(movesLeft: number, moves: number, rule: StarRule): number {
  const left = moves > 0 ? movesLeft / moves : 0;
  if (left >= rule.three) return 3;
  return left >= rule.two ? 2 : 1;
}
