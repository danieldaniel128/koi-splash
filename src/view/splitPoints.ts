import { sameCell } from '../model/types';
import type { CascadeStep, Cell } from '../model/types';

/**
 * One popup of a round's points: the cells it shows over (it pops up at their centre), its share, how many koi it
 * counts (a bigger match shows bigger points) and, for a special's blast, which one (its index in the round's fired).
 */
export interface PointsShare {
  readonly over: readonly Cell[];
  readonly amount: number;
  readonly size: number;
  readonly blast?: number;
}

/** A cell the round took: a koi cleared (by a blast, or not), or a koi turned into a new special. */
interface Taken {
  readonly at: Cell;
  readonly id: number;
  readonly blast?: number | undefined;
}

/**
 * Splits a round's points, as the scene scored them, into its popups: one over each match and one over each special
 * that fired. Every cell the round took carries an equal share, rounded so the popups add up to exactly `points`
 * (the score counter climbs by what they show). Pure. O(T * M) for T cells taken and M matches.
 */
export function splitPoints(step: CascadeStep, points: number): PointsShare[] {
  const groups: { over: readonly Cell[]; cells: number; blast?: number }[] = [
    ...step.matches.map((match) => ({ over: match.cells, cells: 0 })),
    ...step.fired.map((fired, blast) => ({ over: [fired.at], cells: 0, blast })),
  ];
  const taken: Taken[] = [
    ...step.cleared.map(({ at, piece, blast }) => ({ at, id: piece.id, blast })),
    ...step.created.map(({ at, piece }) => ({ at, id: piece.id })),
  ];
  if (taken.length === 0) return [];
  for (const cell of taken) {
    const group = groups[groupOf(step, cell)];
    if (group) group.cells++;
    else groups.push({ over: [cell.at], cells: 1 });
  }
  let before = 0;
  const shares = groups.map(({ over, cells, blast }) => {
    const start = Math.round((points * before) / taken.length);
    before += cells;
    const amount = Math.round((points * before) / taken.length) - start;
    return blast === undefined ? { over, amount, size: cells } : { over, amount, size: cells, blast };
  });
  return shares.filter((share) => share.amount > 0);
}

/**
 * The popup a taken cell counts toward (an index into the matches, then the blasts): the blast that took it, else
 * the first match it's in, else the blast it set off itself (a special swapped without a match). -1 for none.
 */
function groupOf(step: CascadeStep, cell: Taken): number {
  const blasts = step.matches.length;
  if (cell.blast !== undefined) return blasts + cell.blast;
  const match = step.matches.findIndex((m) => m.cells.some((c) => sameCell(c, cell.at)));
  if (match >= 0) return match;
  const fired = step.fired.findIndex((f) => f.piece.id === cell.id);
  return fired >= 0 ? blasts + fired : -1;
}
