import type { CascadeStep } from './types';

/**
 * Points for one cascade round: the pieces it cleared, multiplied by the round number (0-based `round`), so a chain
 * reaction is worth more than the same pieces cleared at once.
 */
export function scoreRound(step: CascadeStep, round: number, pointsPerPiece: number): number {
  return step.cleared.length * pointsPerPiece * (round + 1);
}

/** Points for a whole swap: the sum of its cascade rounds. */
export function scoreSwap(steps: readonly CascadeStep[], pointsPerPiece: number): number {
  return steps.reduce((total, step, round) => total + scoreRound(step, round, pointsPerPiece), 0);
}
