/** The rating: a star for each of these scores reached, lowest first. */
export interface StarRule {
  readonly scores: readonly [number, number, number];
}

/** How many stars this score has earned (0 to 3). O(1). */
export function starsFor(score: number, rule: StarRule): number {
  return rule.scores.filter((needed) => score >= needed).length;
}
