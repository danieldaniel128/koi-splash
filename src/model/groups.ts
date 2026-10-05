import { sameCell } from './types';
import type { Cell, PieceColor, Match } from './types';

/** Runs that share a cell, as one shape: a line, an L, a T or a cross. What special it makes depends on it. */
export interface MatchGroup {
  readonly color: PieceColor;
  readonly cells: readonly Cell[];
  readonly runs: readonly Match[];
  /** Its longest run: how long, which way, and its middle cell. */
  readonly longest: number;
  readonly along: Match['direction'];
  readonly middle: Cell;
  /** Where a row run and a column run cross (an L's corner, a T's joint), or null for a straight line. */
  readonly corner: Cell | null;
}

/**
 * Joins the runs that share a cell into groups, so an L or a T is one shape, not two matches. O(M^2 * L) for M runs
 * of up to L cells: a handful of runs per round.
 */
export function groupMatches(matches: readonly Match[]): MatchGroup[] {
  const groups: Match[][] = [];
  for (const match of matches) {
    const touching = groups.filter((group) => group.some((run) => sharesCell(run, match)));
    const merged = [...touching.flat(), match];
    for (const group of touching) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }
  return groups.map(describe);
}

function sharesCell(a: Match, b: Match): boolean {
  return a.cells.some((cell) => b.cells.some((other) => sameCell(cell, other)));
}

function describe(runs: readonly Match[]): MatchGroup {
  const cells: Cell[] = [];
  for (const run of runs)
    for (const cell of run.cells) if (!cells.some((c) => sameCell(c, cell))) cells.push(cell);
  const longestRun = runs.reduce((best, run) => (run.cells.length > best.cells.length ? run : best));
  const rows = runs.filter((run) => run.direction === 'row');
  const cols = runs.filter((run) => run.direction === 'col');
  const corner =
    rows
      .flatMap((row) => row.cells)
      .find((cell) => cols.some((col) => col.cells.some((c) => sameCell(c, cell)))) ?? null;
  return {
    color: longestRun.color,
    cells,
    runs,
    longest: longestRun.cells.length,
    along: longestRun.direction,
    middle: longestRun.cells[Math.floor(longestRun.cells.length / 2)] ?? cells[0] ?? { col: 0, row: 0 },
    corner,
  };
}
