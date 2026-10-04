import type { Random } from '../core/Random';
import { Board } from './Board';
import type { PadEvent, PadField } from './pads';
import type { CascadeStep, Cell, Fall, Kind, Match, Piece, Spawn, SwapResult } from './types';
import { isAdjacent, sameCell } from './types';
import { resolveRound, swapTriggers } from './specials';
import type { Trigger } from './specials';

export interface BoardSpec {
  readonly cols: number;
  readonly rows: number;
  /** How many koi colours are in play. */
  readonly kinds: number;
  /** The cells the board's shape doesn't have (see parseShape); none for a plain rectangle. */
  readonly holes?: readonly Cell[];
}

const MIN_RUN = 3;
/** Safety net: a cascade this long means a bug, not a lucky player. */
const MAX_CASCADE = 50;

// Run times below use N = cols * rows (63 cells on the 7 x 9 board).

/**
 * A full board with no ready-made matches and at least one valid move. Blocked cells (the lily pads) are placed
 * first, so the koi only ever fill the free cells around them. O(N) per try, see fillSafely.
 */
export function createBoard(spec: BoardSpec, rng: Random, blocked: readonly Cell[] = []): Board {
  const board = new Board(spec.cols, spec.rows, spec.holes);
  for (const cell of blocked) board.setBlocked(cell, true);
  fillSafely(board, spec.kinds, rng);
  return board;
}

/**
 * Gives an existing board a fresh layout (for playing the level again), with the new blocked cells placed first.
 * Piece ids keep counting up from where they were, so the view never mistakes a new koi for an old sprite.
 */
export function resetBoard(board: Board, spec: BoardSpec, rng: Random, blocked: readonly Cell[] = []): void {
  for (const cell of board.cells()) board.setBlocked(cell, false);
  for (const cell of blocked) board.setBlocked(cell, true);
  fillSafely(board, spec.kinds, rng);
}

/**
 * Every straight run of 3 or more same-kind pieces (a T or L shape gives one row match and one column match).
 * O(N): one pass over the rows and one over the columns.
 */
export function findMatches(board: Board): Match[] {
  return [...scanRuns(board, 'row'), ...scanRuns(board, 'col')];
}

/**
 * True when swapping these two cells would make at least one match. Leaves the board unchanged.
 * O(cols + rows): only the lines through the two cells are checked, not the whole board.
 */
export function swapMakesMatch(board: Board, a: Cell, b: Cell): boolean {
  if (!isAdjacent(a, b) || !board.get(a) || !board.get(b)) return false;
  board.swap(a, b);
  const result = runThrough(board, a) || runThrough(board, b);
  board.swap(a, b);
  return result;
}

/**
 * One valid swap, or null when the board is stuck. Also feeds the idle hint.
 * O(N * (cols + rows)) worst case: tries every right and down swap. About 63 x 16 checks, fine after each turn.
 */
export function findMove(board: Board): [Cell, Cell] | null {
  for (const cell of board.cells()) {
    const right = { col: cell.col + 1, row: cell.row };
    const down = { col: cell.col, row: cell.row + 1 };
    if (board.inBounds(right) && swapMakesMatch(board, cell, right)) return [cell, right];
    if (board.inBounds(down) && swapMakesMatch(board, cell, down)) return [cell, down];
  }
  return null;
}

/** True when the player can move: a swap makes a match, or a special is on the board (swapping it fires it). */
export function hasAnyMove(board: Board): boolean {
  for (const cell of board.cells()) if (board.get(cell)?.special) return true;
  return findMove(board) !== null;
}

/**
 * Plays a swap. An invalid swap leaves the board untouched. A valid one swaps, then settles the board (see settle)
 * and returns every round as data so the view can animate it step by step.
 * O(S * N), S = cascade rounds (usually 1 to 3, capped at MAX_CASCADE).
 */
export function trySwap(
  board: Board,
  a: Cell,
  b: Cell,
  spec: BoardSpec,
  rng: Random,
  pads?: PadField,
): SwapResult {
  if (!isAdjacent(a, b)) return { valid: false, reason: 'not-adjacent' };
  const triggers = swapTriggers(board, a, b); // a swapped special fires even without a match
  if (!swapMakesMatch(board, a, b) && triggers.length === 0) return { valid: false, reason: 'no-match' };

  board.swap(a, b);
  const firing = triggers.map((t) => ({ ...t, at: sameCell(t.at, a) ? b : a })); // they moved with the swap
  return { valid: true, ...settle(board, spec, rng, { pads, swap: [b, a], firing }) };
}

/** What starts a cascade: the cells just swapped (a special appears there first), and specials set to fire. */
export interface SettleStart {
  readonly pads?: PadField | undefined;
  readonly swap?: readonly Cell[];
  readonly firing?: readonly Trigger[];
}

/**
 * Clears, fires, drops and refills until nothing matches and nothing is left to fire, one round at a time, and
 * reshuffles a board left with no move. Each round hits the pads next to the cleared koi (and under a blast); a pad
 * that blooms or drifts away opens its cell, and the koi above fall into it in that same round. Shared by swaps and
 * boosters. O(S * N).
 */
export function settle(
  board: Board,
  spec: BoardSpec,
  rng: Random,
  start: SettleStart = {},
): { steps: CascadeStep[]; reshuffled: boolean } {
  const steps: CascadeStep[] = [];
  let firing: readonly Trigger[] = start.firing ?? [];
  for (
    let matches = findMatches(board);
    matches.length > 0 || firing.length > 0;
    matches = findMatches(board)
  ) {
    if (steps.length >= MAX_CASCADE) throw new Error('cascade did not settle');
    // the first round puts its special where the player swapped; later rounds in the middle of the shape
    const round = resolveRound(board, matches, steps.length === 0 ? (start.swap ?? []) : [], firing);
    firing = [];
    const struck = [...round.cleared.map((c) => c.at), ...round.struckPads];
    const padEvents = hitPads(board, start.pads, struck);
    const falls = applyGravity(board);
    const spawns = refill(board, spec.kinds, rng);
    const { created, fired, cleared } = round;
    steps.push({ matches, created, fired, cleared, padEvents, falls, spawns });
  }
  const reshuffled = !hasAnyMove(board);
  if (reshuffled) fillSafely(board, spec.kinds, rng);
  return { steps, reshuffled };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Fills every cell with new pieces, avoiding ready-made matches, until the board has at least one move.
 * O(N) per try plus a findMove check. Almost always one try, but there is no fixed upper bound on retries.
 */
function fillSafely(board: Board, kinds: number, rng: Random): void {
  do {
    for (const cell of board.cells()) {
      if (!board.isBlocked(cell)) board.set(cell, board.createPiece(safeKind(board, cell, kinds, rng)));
    }
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
  const lineCount = direction === 'row' ? board.rows : board.cols;
  const matches: Match[] = [];
  for (let line = 0; line < lineCount; line++) {
    matches.push(...runsInLine(board, lineCells(board, direction, line), direction));
  }
  return matches;
}

/** The cells of one row or column, in order. */
function lineCells(board: Board, direction: Match['direction'], line: number): Cell[] {
  const length = direction === 'row' ? board.cols : board.rows;
  return Array.from({ length }, (_, i) =>
    direction === 'row' ? { col: i, row: line } : { col: line, row: i },
  );
}

/** Runs of 3+ same-kind pieces along one line, given its cells in order. */
function runsInLine(board: Board, cells: readonly Cell[], direction: Match['direction']): Match[] {
  const kinds = cells.map((cell) => board.kindAt(cell));
  const matches: Match[] = [];
  let start = 0;
  for (let i = 1; i <= cells.length; i++) {
    const runKind = kinds[start] ?? null;
    const runContinues = i < cells.length && runKind !== null && kinds[i] === runKind;
    if (runContinues) continue;

    const runLength = i - start;
    if (runKind !== null && runLength >= MIN_RUN) {
      matches.push({ kind: runKind, cells: cells.slice(start, i), direction });
    }
    start = i;
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

/** Hits the pads next to (or under) the struck cells and opens the cells of those that bloomed or drifted away. */
function hitPads(board: Board, pads: PadField | undefined, struck: readonly Cell[]): PadEvent[] {
  if (!pads) return [];
  const events = pads.hit(struck);
  for (const event of events) if (event.type !== 'hit') board.setBlocked(event.pad.at, false);
  return events;
}

// applyGravity and refill are each O(N).

/**
 * Drops every piece straight down into the gaps below it, past lily pads, within its stretch of water: a koi never
 * crosses a hole (that would be swimming over the bank).
 */
function applyGravity(board: Board): Fall[] {
  const falls: Fall[] = [];
  for (let col = 0; col < board.cols; col++) {
    for (const slots of stretches(board, col)) {
      const pieces = slots
        .map((row) => ({ piece: board.get({ col, row }), row }))
        .filter((entry): entry is { piece: Piece; row: number } => entry.piece !== null);
      slots.forEach((row, i) => {
        const entry = pieces[i];
        board.set({ col, row }, entry?.piece ?? null);
        if (entry && entry.row !== row)
          falls.push({ piece: entry.piece, from: { col, row: entry.row }, to: { col, row } });
      });
    }
  }
  return falls;
}

/**
 * A column's stretches of water, split by the holes: in each, the rows a piece can be in (not under a pad), from
 * the bottom up. A plain column is one stretch.
 */
function stretches(board: Board, col: number): number[][] {
  const result: number[][] = [];
  let current: number[] = [];
  for (let row = board.rows - 1; row >= 0; row--) {
    const cell = { col, row };
    if (board.isHole(cell)) {
      if (current.length > 0) result.push(current);
      current = [];
    } else if (!board.isBlocked(cell)) current.push(row);
  }
  if (current.length > 0) result.push(current);
  return result;
}

/** Fills the empty cells at the top of each stretch of water with new koi rising from the deep, the lowest first. */
function refill(board: Board, kinds: number, rng: Random): Spawn[] {
  const spawns: Spawn[] = [];
  for (let col = 0; col < board.cols; col++) {
    for (const slots of stretches(board, col)) {
      const empty = slots.filter((row) => !board.get({ col, row })); // bottom to top
      empty.forEach((row, order) => {
        const piece = board.createPiece(rng.int(0, kinds - 1));
        const to = { col, row };
        board.set(to, piece);
        spawns.push({ piece, to, order });
      });
    }
  }
  return spawns;
}
