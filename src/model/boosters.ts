import type { Board } from './Board';
import { distanceSq, sameCell, stepsApart } from './types';
import type { Cell, PieceColor, Piece, Special } from './types';

/**
 * The boosters, as in the prototype: free tools that change the board without spending a move. Each is a plan here
 * (pure board logic, no timing); the scene applies it and settles the board after (see settle).
 * - swap: any two koi trade places, however far apart, even two of one colour; a special it moves fires only if it
 *   lands in a match
 * - special: one koi becomes the special the player picks
 * - feed: every koi of one colour swims into lines of 3 by the food, so it always makes a match
 */
export type BoosterUse =
  | { readonly type: 'swap'; readonly a: Cell; readonly b: Cell }
  | { readonly type: 'special'; readonly at: Cell; readonly special: Special }
  | { readonly type: 'feed'; readonly at: Cell; readonly lines: number };

export type BoosterType = BoosterUse['type'];

/** A koi a booster moved: which, from where, to where. The view swims (or leaps) it there. */
export interface Moved {
  readonly piece: Piece;
  readonly from: Cell;
  readonly to: Cell;
}

/** What a booster did to the board before it settles: the koi it moved, the koi it made special, the colour fed. */
export interface BoosterChange {
  readonly moved: readonly Moved[];
  readonly made: readonly { readonly piece: Piece; readonly at: Cell }[];
  readonly fedColor?: PieceColor;
}

/** Which koi each booster can take (one per type: a new booster asks for its rule here). */
const TAKES: Readonly<Record<BoosterType, (board: Board, piece: Piece, at: Cell) => boolean>> = {
  swap: () => true,
  special: (_board, piece) => !piece.special,
  feed: (board, piece, at) => board.colorAt(at) !== null && board.cellsOf(piece.color).length >= 3,
};

/** Whether a booster can be used on this cell: a koi, and for the special booster a plain one. O(1), feed O(N). */
export function canTarget(board: Board, type: BoosterType, at: Cell): boolean {
  const piece = board.get(at);
  return piece !== null && TAKES[type](board, piece, at);
}

/** Applies a booster to the board (call canTarget first). Returns null when it has nothing to do. */
export function applyBooster(board: Board, use: BoosterUse): BoosterChange | null {
  switch (use.type) {
    case 'swap':
      return swapAny(board, use.a, use.b);
    case 'special':
      return makeSpecial(board, use.at, use.special);
    case 'feed':
      return feed(board, use.at, use.lines);
  }
}

/** Two koi trade places, however far apart. */
function swapAny(board: Board, a: Cell, b: Cell): BoosterChange | null {
  const first = board.get(a);
  const second = board.get(b);
  if (!first || !second || sameCell(a, b)) return null;
  board.swap(a, b);
  return {
    moved: [
      { piece: first, from: a, to: b },
      { piece: second, from: b, to: a },
    ],
    made: [],
  };
}

/** One plain koi becomes a special, keeping its id and colour. */
function makeSpecial(board: Board, at: Cell, special: Special): BoosterChange | null {
  const koi = board.get(at);
  if (!koi || koi.special) return null;
  const piece = { ...koi, special };
  board.set(at, piece);
  return { moved: [], made: [{ piece, at }] };
}

/**
 * Feeding at `at`: every koi of its colour is drawn to the food. Plans up to `lines` lines of 3 of that colour,
 * nearest the food first and a cell apart, so each is its own school; koi already in place stay, the nearest koi of
 * the colour fill the rest, and the koi they push out take the cells they left. Always makes a match.
 * O(N * L) for L candidate lines.
 */
function feed(board: Board, at: Cell, lines: number): BoosterChange | null {
  const color = board.colorAt(at);
  if (color === null) return null;
  const school = board.cellsOf(color);
  const count = Math.min(lines, Math.floor(school.length / 3));
  if (count === 0) return null;
  const targets = pickLines(board, at, count).flat();
  const moved = assign(board, targets, school);
  for (const move of moved) board.set(move.to, null);
  for (const move of moved) board.set(move.to, move.piece);
  return { moved, made: [], fedColor: color };
}

/** The nearest lines of 3 open cells to the food, a cell apart from each other. */
function pickLines(board: Board, food: Cell, count: number): Cell[][] {
  const candidates: Cell[][] = [];
  for (const cell of board.cells()) {
    for (const [dc, dr] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const line = [0, 1, 2].map((i) => ({ col: cell.col + dc * i, row: cell.row + dr * i }));
      if (line.every((c) => board.inBounds(c) && !board.isBlocked(c))) candidates.push(line);
    }
  }
  const distance = (line: Cell[]): number => distanceSq(line[1] ?? food, food);
  candidates.sort((a, b) => distance(a) - distance(b));
  const chosen: Cell[][] = [];
  for (const line of candidates) {
    if (chosen.length === count) break;
    if (chosen.every((other) => apart(line, other))) chosen.push(line);
  }
  return chosen;
}

/**
 * Who goes where: koi of the colour already on a target stay; each other target takes the nearest koi of the colour
 * not yet placed; the koi that were on the targets take the cells those left, nearest first.
 */
function assign(board: Board, targets: readonly Cell[], school: readonly Cell[]): Moved[] {
  const isTarget = (cell: Cell): boolean => targets.some((t) => sameCell(t, cell));
  const free = school.filter((cell) => !isTarget(cell));
  const swims: Moved[] = [];
  const pushed: { piece: Piece; from: Cell }[] = [];
  const left: Cell[] = [];
  for (const target of targets) {
    if (school.some((cell) => sameCell(cell, target))) continue; // already one of the colour: it stays
    const from = takeNearest(free, target);
    const swimmer = from ? board.get(from) : null;
    const inTheWay = board.get(target);
    if (!from || !swimmer || !inTheWay) continue;
    swims.push({ piece: swimmer, from, to: target });
    pushed.push({ piece: inTheWay, from: target });
    left.push(from);
  }
  // the koi pushed off the targets take the cells the school left, nearest first
  const shoves = pushed.map(({ piece, from }) => ({ piece, from, to: takeNearest(left, from) ?? from }));
  return [...swims, ...shoves];
}

/** Two lines with no cell of one touching a cell of the other (a cell apart), so each school stays its own. */
function apart(a: readonly Cell[], b: readonly Cell[]): boolean {
  return a.every((c) => b.every((o) => stepsApart(o, c) > 1));
}

/** Removes and returns the cell in `cells` nearest to `to`. */
function takeNearest(cells: Cell[], to: Cell): Cell | null {
  let best = -1;
  let bestDistance = Infinity;
  cells.forEach((cell, i) => {
    const d = distanceSq(cell, to);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best < 0 ? null : (cells.splice(best, 1)[0] ?? null);
}

/** One booster on the bar: which, its name, how many a level gives, and what the pill says while it's armed. */
export interface BoosterSlot {
  readonly type: BoosterType;
  readonly name: string;
  readonly count: number;
  readonly tip: string;
}
