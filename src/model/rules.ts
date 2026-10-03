import type { Random } from '../core/Random';
import { Board } from './Board';
import type { CascadeStep, Cell, Cleared, Fall, Kind, Match, Spawn, SwapResult } from './types';
import { isAdjacent } from './types';

export interface BoardSpec {
  readonly cols: number;
  readonly rows: number;
  /** How many koi colours are in play. */
  readonly kinds: number;
}

const MIN_RUN = 3;
/** Safety net: a cascade this long means a bug, not a lucky player. */
const MAX_CASCADE = 50;

/** A full board with no ready-made matches and at least one valid move. */
export function createBoard(spec: BoardSpec, rng: Random): Board {
  const board = new Board(spec.cols, spec.rows);
  fillSafely(board, spec.kinds, rng);
  return board;
}

/** Every straight run of 3 or more same-kind pieces (a T or L shape gives one row match and one column match). */
export function findMatches(board: Board): Match[] {
  return [...scanRuns(board, 'row'), ...scanRuns(board, 'col')];
}

/** True when swapping these two cells would make at least one match. Leaves the board unchanged. */
export function swapMakesMatch(board: Board, a: Cell, b: Cell): boolean {
  if (!isAdjacent(a, b) || !board.get(a) || !board.get(b)) return false;
  board.swap(a, b);
  const result = runThrough(board, a) || runThrough(board, b);
  board.swap(a, b);
  return result;
}

/** One valid swap, or null when the board is stuck. Also feeds the idle hint. */
export function findMove(board: Board): [Cell, Cell] | null {
  for (const cell of board.cells()) {
    const right = { col: cell.col + 1, row: cell.row };
    const down = { col: cell.col, row: cell.row + 1 };
    if (board.inBounds(right) && swapMakesMatch(board, cell, right)) return [cell, right];
    if (board.inBounds(down) && swapMakesMatch(board, cell, down)) return [cell, down];
  }
  return null;
}

export function hasAnyMove(board: Board): boolean {
  return findMove(board) !== null;
}

/**
 * Plays a swap. An invalid swap leaves the board untouched. A valid one swaps, then clears, drops and refills
 * until nothing matches, and returns every round as data so the view can animate it step by step.
 */
export function trySwap(board: Board, a: Cell, b: Cell, spec: BoardSpec, rng: Random): SwapResult {
  if (!isAdjacent(a, b)) return { valid: false, reason: 'not-adjacent' };
  if (!swapMakesMatch(board, a, b)) return { valid: false, reason: 'no-match' };

  board.swap(a, b);
  const steps: CascadeStep[] = [];
  for (let matches = findMatches(board); matches.length > 0; matches = findMatches(board)) {
    if (steps.length >= MAX_CASCADE) throw new Error('cascade did not settle');
    const cleared = clearMatches(board, matches);
    const falls = applyGravity(board);
    const spawns = refill(board, spec.kinds, rng);
    steps.push({ matches, cleared, falls, spawns });
  }

  const reshuffled = !hasAnyMove(board);
  if (reshuffled) fillSafely(board, spec.kinds, rng);
  return { valid: true, steps, reshuffled };
}

// ---------------------------------------------------------------------------------------------------------------

/** Fills every cell with new pieces, avoiding ready-made matches, until the board has at least one move. */
function fillSafely(board: Board, kinds: number, rng: Random): void {
  do {
    for (const cell of board.cells()) board.set(cell, board.createPiece(safeKind(board, cell, kinds, rng)));
  } while (!hasAnyMove(board));
}

/** A kind for `cell` that does not complete a run with the two pieces to its left or the two above. */
function safeKind(board: Board, cell: Cell, kinds: number, rng: Random): Kind {
  const banned = new Set<Kind>();
  const left = board.kindAt({ col: cell.col - 1, row: cell.row });
  if (left !== null && left === board.kindAt({ col: cell.col - 2, row: cell.row })) banned.add(left);
  const up = board.kindAt({ col: cell.col, row: cell.row - 1 });
  if (up !== null && up === board.kindAt({ col: cell.col, row: cell.row - 2 })) banned.add(up);

  const allowed: Kind[] = [];
  for (let k = 0; k < kinds; k++) if (!banned.has(k)) allowed.push(k);
  return rng.pick(allowed);
}

/** Runs of 3+ along every row ('row') or every column ('col'). */
function scanRuns(board: Board, direction: Match['direction']): Match[] {
  const lines = direction === 'row' ? board.rows : board.cols;
  const length = direction === 'row' ? board.cols : board.rows;
  const at = (line: number, i: number): Cell =>
    direction === 'row' ? { col: i, row: line } : { col: line, row: i };

  const matches: Match[] = [];
  for (let line = 0; line < lines; line++) {
    let start = 0;
    for (let i = 1; i <= length; i++) {
      const kind = board.kindAt(at(line, start));
      if (i < length && kind !== null && board.kindAt(at(line, i)) === kind) continue;
      if (kind !== null && i - start >= MIN_RUN) {
        const cells: Cell[] = [];
        for (let k = start; k < i; k++) cells.push(at(line, k));
        matches.push({ kind, cells, direction });
      }
      start = i;
    }
  }
  return matches;
}

/** True when the piece at `cell` is part of a horizontal or vertical run of 3+. */
function runThrough(board: Board, cell: Cell): boolean {
  const kind = board.kindAt(cell);
  if (kind === null) return false;
  const reach = (dc: number, dr: number): number => {
    let n = 0;
    while (board.kindAt({ col: cell.col + dc * (n + 1), row: cell.row + dr * (n + 1) }) === kind) n++;
    return n;
  };
  return reach(-1, 0) + reach(1, 0) + 1 >= MIN_RUN || reach(0, -1) + reach(0, 1) + 1 >= MIN_RUN;
}

function clearMatches(board: Board, matches: readonly Match[]): Cleared[] {
  const cleared: Cleared[] = [];
  for (const match of matches) {
    for (const at of match.cells) {
      const piece = board.get(at);
      if (!piece) continue; // shared by a row and a column match: already cleared
      cleared.push({ piece, at });
      board.set(at, null);
    }
  }
  return cleared;
}

/** Drops every piece straight down into the gaps below it. */
function applyGravity(board: Board): Fall[] {
  const falls: Fall[] = [];
  for (let col = 0; col < board.cols; col++) {
    let target = board.rows - 1;
    for (let row = board.rows - 1; row >= 0; row--) {
      const piece = board.get({ col, row });
      if (!piece) continue;
      if (row !== target) {
        board.set({ col, row: target }, piece);
        board.set({ col, row }, null);
        falls.push({ piece, from: { col, row }, to: { col, row: target } });
      }
      target--;
    }
  }
  return falls;
}

/** Fills the empty cells at the top of each column with new pieces that drop in from above the board. */
function refill(board: Board, kinds: number, rng: Random): Spawn[] {
  const spawns: Spawn[] = [];
  for (let col = 0; col < board.cols; col++) {
    let empty = 0;
    while (empty < board.rows && !board.get({ col, row: empty })) empty++;
    for (let row = empty - 1; row >= 0; row--) {
      const piece = board.createPiece(rng.int(0, kinds - 1));
      const to = { col, row };
      board.set(to, piece);
      spawns.push({ piece, from: { col, row: row - empty }, to });
    }
  }
  return spawns;
}
