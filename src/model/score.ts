import type { CascadeRound } from './types';

/**
 * Points for one cascade round: the pieces it cleared, multiplied by the round number (0-based `roundIndex`), so a chain
 * reaction is worth more than the same pieces cleared at once; plus, as in the prototype, three pieces' worth for every
 * koi a special's shape had past three (a striped koi from a 4 adds 3, a rainbow koi from a 5 adds 6).
 */
export function scoreRound(round: CascadeRound, roundIndex: number, pointsPerPiece: number): number {
  const shapes = round.created.reduce((total, made) => total + Math.max(0, made.from.length + 1 - 3) * 3, 0);
  return (round.cleared.length + shapes) * pointsPerPiece * (roundIndex + 1);
}

/** Points for a whole swap: the sum of its cascade rounds. */
export function scoreSwap(rounds: readonly CascadeRound[], pointsPerPiece: number): number {
  return rounds.reduce(
    (total, round, roundIndex) => total + scoreRound(round, roundIndex, pointsPerPiece),
    0,
  );
}
