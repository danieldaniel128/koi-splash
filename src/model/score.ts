import type { CascadeStep } from './types';

/**
 * Points for one swap. Each cascade round pays for the pieces it cleared, multiplied by the round number, so a chain
 * reaction is worth more than the same pieces cleared at once.
 */
export function scoreSwap(steps: readonly CascadeStep[], pointsPerPiece: number): number {
  return steps.reduce((total, step, round) => total + step.cleared.length * pointsPerPiece * (round + 1), 0);
}
