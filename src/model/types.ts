import type { PadEvent } from './pads';

/** A board position. Column 0 is the left edge, row 0 is the top row. */
export interface Cell {
  readonly col: number;
  readonly row: number;
}

/** Which koi colour a piece is (an index into the koi set). */
export type Kind = number;

/** One koi on the board. The id stays with the piece while it moves, so the view can follow its sprite. */
export interface Piece {
  readonly id: number;
  readonly kind: Kind;
}

/** A straight run of 3+ same-kind pieces. */
export interface Match {
  readonly kind: Kind;
  readonly cells: readonly Cell[];
  readonly direction: 'row' | 'col';
}

/** A piece that was matched and removed. */
export interface Cleared {
  readonly piece: Piece;
  readonly at: Cell;
}

/** A piece that fell straight down to fill a gap. */
export interface Fall {
  readonly piece: Piece;
  readonly from: Cell;
  readonly to: Cell;
}

/** A new piece that entered from above the board. `from.row` is negative (above the top edge). */
export interface Spawn {
  readonly piece: Piece;
  readonly from: Cell;
  readonly to: Cell;
}

/** One round of a cascade: what matched, what was removed, what fell and what came in. */
export interface CascadeStep {
  readonly matches: readonly Match[];
  readonly cleared: readonly Cleared[];
  /** What the round did to the lily pads; a bloomed or drifted pad's cell is open again before the koi fall. */
  readonly padEvents: readonly PadEvent[];
  readonly falls: readonly Fall[];
  readonly spawns: readonly Spawn[];
}

export type SwapResult =
  | { readonly valid: false; readonly reason: 'not-adjacent' | 'no-match' }
  | { readonly valid: true; readonly steps: readonly CascadeStep[]; readonly reshuffled: boolean };

export const sameCell = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

export const isAdjacent = (a: Cell, b: Cell): boolean =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
