import type { Board } from './Board';
import { groupMatches } from './groups';
import type { MatchGroup } from './groups';
import { alongOf, cellKey, colorOf, distanceSq, sameCell } from './types';
import type { Cell, Cleared, Created, Fired, PieceColor, Match, Piece, Special } from './types';

/**
 * The special koi, as in the prototype. A shape makes one (specialFor), it appears on one of the shape's cells
 * (spawnCellFor), and when it is matched, swapped or caught in another special's blast it fires: each special type
 * reaches its own cells (SPECIAL_REACH, one entry per type). Pure board logic, no timing.
 */

/** A special about to fire, and for a rainbow koi the colour it was swapped with ('all' for another rainbow). */
export interface Trigger {
  readonly at: Cell;
  readonly target?: PieceColor | 'all';
}

/** What one round of a cascade did with matches and specials, before the koi fall. */
export interface RoundResolution {
  readonly created: Created[];
  readonly fired: Fired[];
  readonly cleared: Cleared[];
  /** Lily pad cells a blast passed over: those pads are hit too. */
  readonly struckPads: Cell[];
}

/** The special a matched shape makes: a run of 5 a rainbow koi, an L or T of 5+ a whirlpool, a run of 4 a striped koi. */
export function specialFor(group: MatchGroup): Special | null {
  if (group.longest >= 5) return { type: 'rainbow' };
  if (group.corner && group.cells.length >= 5) return { type: 'whirlpool' };
  if (group.longest === 4) return { type: 'striped', along: group.along };
  return null;
}

/**
 * Where a shape's special appears: a whirlpool at its corner; otherwise the cell the player swapped into, then the
 * one swapped from (in the swap's own round), then the middle of its longest run. Never on a koi already special.
 */
export function spawnCellFor(
  group: MatchGroup,
  special: Special,
  board: Board,
  swap: readonly Cell[],
): Cell | null {
  const free = (cell: Cell | null | undefined): cell is Cell =>
    !!cell && group.cells.some((c) => sameCell(c, cell)) && !board.get(cell)?.special;
  const preferred = [special.type === 'whirlpool' ? group.corner : null, ...swap, group.middle];
  return preferred.find(free) ?? group.cells.find(free) ?? null;
}

/** The specials a swap fires on its own: any special swapped, a rainbow koi aimed at the colour it swapped with. */
export function swapTriggers(board: Board, a: Cell, b: Cell): Trigger[] {
  const triggers: Trigger[] = [];
  for (const [at, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const piece = board.get(at);
    if (!piece?.special) continue;
    const partner = board.get(other);
    const target = partner?.special?.type === 'rainbow' ? 'all' : partner?.color;
    triggers.push(target === undefined ? { at } : { at, target });
  }
  return triggers;
}

/**
 * One round: makes the specials of this round's shapes, clears the matched koi, then fires every special that was
 * matched, swapped or caught in a blast, in order (a queue: each blast can catch more). Cells are cleared once; a
 * special just made is kept. O(cells reached) per special fired.
 */
export function resolveRound(
  board: Board,
  matches: readonly Match[],
  swap: readonly Cell[],
  triggers: readonly Trigger[],
): RoundResolution {
  const resolution: RoundResolution = { created: [], fired: [], cleared: [], struckPads: [] };
  const kept = new Set<string>();
  const queue: Trigger[] = [...triggers];
  for (const group of groupMatches(matches)) {
    const made = makeSpecial(board, group, swap);
    if (made) {
      resolution.created.push(made);
      kept.add(cellKey(made.at));
    }
    for (const at of group.cells) if (!kept.has(cellKey(at))) clearCell(board, at, resolution, queue, null);
  }
  for (let next = queue.shift(); next; next = queue.shift()) fire(board, next, resolution, queue, kept);
  return resolution;
}

/** Turns the shape's chosen koi into its special, keeping its id so the view can follow its sprite. */
function makeSpecial(board: Board, group: MatchGroup, swap: readonly Cell[]): Created | null {
  const special = specialFor(group);
  const at = special ? spawnCellFor(group, special, board, swap) : null;
  const koi = at ? board.get(at) : null;
  if (!special || !at || !koi) return null;
  const piece: Piece = { ...koi, special };
  board.set(at, piece);
  return { piece, at, from: group.cells.filter((cell) => !sameCell(cell, at)) };
}

/** Clears one cell (if it still has a piece); a special cleared this way is queued to fire. */
function clearCell(
  board: Board,
  at: Cell,
  resolution: RoundResolution,
  queue: Trigger[],
  by: { blast: number; order: number } | null,
): void {
  const piece = board.get(at);
  if (!piece) return;
  resolution.cleared.push(by ? { piece, at, blast: by.blast, order: by.order } : { piece, at });
  board.set(at, null);
  if (piece.special) queue.push({ at }); // caught: it fires in turn, from where it was
}

/** Fires one special: everything it reaches is cleared, in reach order, and the specials it catches fire after it. */
function fire(
  board: Board,
  trigger: Trigger,
  resolution: RoundResolution,
  queue: Trigger[],
  kept: Set<string>,
): void {
  const piece = takeFiringPiece(board, resolution, trigger.at);
  if (!piece?.special) return;
  const { special } = piece;
  const target = special.type === 'rainbow' ? (trigger.target ?? mostCommonColor(board)) : undefined;
  const reach = SPECIAL_REACH[special.type](board, trigger.at, special, target);
  const blast = resolution.fired.length;
  resolution.fired.push({ piece, at: trigger.at, reach, ...(target === undefined ? {} : { target }) });
  reach.forEach((at, order) => {
    if (kept.has(cellKey(at))) return;
    if (board.hasPad(at)) resolution.struckPads.push(at);
    else clearCell(board, at, resolution, queue, { blast, order });
  });
}

/**
 * The special at `at` about to fire, taken off the board if it's still on it (a swapped one is; a matched or caught
 * one was cleared already). Null if it has fired this round.
 */
function takeFiringPiece(board: Board, resolution: RoundResolution, at: Cell): Piece | null {
  const onBoard = board.get(at);
  if (onBoard?.special) {
    resolution.cleared.push({ piece: onBoard, at });
    board.set(at, null);
  }
  const piece = onBoard?.special ? onBoard : resolution.cleared.find((c) => sameCell(c.at, at))?.piece;
  return piece && !resolution.fired.some((f) => f.piece.id === piece.id) ? piece : null;
}

/** A cell and the eight round it, as column and row steps. */
const AROUND = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dc, dr] as const));

/** The cells a special reaches from its cell, nearest first (`target`: the colour a rainbow koi takes). */
type Reach = (board: Board, at: Cell, special: Special, target?: PieceColor | 'all') => Cell[];

/** What each special type reaches (Strategy, one entry per type; the full list for a new special is at Special). */
const SPECIAL_REACH: Readonly<Record<Special['type'], Reach>> = {
  // a striped koi sweeps its whole row or column, outward from itself
  striped: (board, at, special) => {
    const along = alongOf(special);
    const cells = board.line(along, along === 'row' ? at.row : at.col);
    return byDistance(
      cells.filter((cell) => !sameCell(cell, at) && !board.isHole(cell)),
      at,
    );
  },
  // a whirlpool drains the eight cells round it
  whirlpool: (board, at) => {
    const cells = AROUND.map(([dc, dr]) => ({ col: at.col + dc, row: at.row + dr }));
    return byDistance(
      cells.filter((cell) => board.inBounds(cell) && !sameCell(cell, at) && !board.isHole(cell)),
      at,
    );
  },
  // a rainbow koi takes every koi of one colour ('all': every koi), nearest first
  rainbow: (board, at, _special, target) => {
    const cells = [...board.cells()].filter((cell) => {
      const piece = board.get(cell);
      return !!piece && !sameCell(cell, at) && (target === 'all' || colorOf(piece) === target);
    });
    return byDistance(cells, at);
  },
};

/** The color most koi on the board have (lowest color on a tie): what a rainbow koi caught in a blast takes. */
function mostCommonColor(board: Board): PieceColor {
  const counts: number[] = [];
  for (const cell of board.cells()) {
    const color = board.colorAt(cell); // null for a rainbow koi
    if (color !== null) counts[color] = (counts[color] ?? 0) + 1;
  }
  return counts.reduce<PieceColor>((best, count, color) => (count > (counts[best] ?? 0) ? color : best), 0);
}

function byDistance(cells: Cell[], from: Cell): Cell[] {
  return cells.sort((a, b) => distanceSq(a, from) - distanceSq(b, from));
}
