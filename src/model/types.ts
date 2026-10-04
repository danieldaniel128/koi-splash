import type { PadEvent } from './pads';

/** A board position. Column 0 is the left edge, row 0 is the top row. */
export interface Cell {
  readonly col: number;
  readonly row: number;
}

/** Which koi colour a piece is (an index into the koi set). */
export type Kind = number;

/**
 * A special koi's power: a striped koi sweeps its row or column, a whirlpool drains the cells round it, a rainbow koi
 * takes every koi of one colour.
 */
export type Special =
  | { readonly type: 'line'; readonly along: 'row' | 'col' }
  | { readonly type: 'whirl' }
  | { readonly type: 'rainbow' };

/** One koi on the board. The id stays with the piece while it moves, so the view can follow its sprite. */
export interface Piece {
  readonly id: number;
  readonly kind: Kind;
  readonly special?: Special;
}

/** A straight run of 3+ same-kind pieces. */
export interface Match {
  readonly kind: Kind;
  readonly cells: readonly Cell[];
  readonly direction: 'row' | 'col';
}

/** A piece that was removed: matched, or caught in a special's blast (`blast` indexes the round's `fired`). */
export interface Cleared {
  readonly piece: Piece;
  readonly at: Cell;
  readonly blast?: number;
  /** Its place in that blast's reach, nearest first: the view times the blast by it. */
  readonly order?: number;
}

/** A special made this round: the koi at `at` became it, and the rest of its shape (`from`) swam into it. */
export interface Created {
  readonly piece: Piece;
  readonly at: Cell;
  readonly from: readonly Cell[];
}

/** A special that fired this round: everything it reached, nearest first, and for a rainbow koi the colour it took. */
export interface Fired {
  readonly piece: Piece;
  readonly at: Cell;
  readonly reach: readonly Cell[];
  readonly target?: Kind | 'all';
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
  readonly to: Cell;
  /** Its place in the queue of new koi rising in its stretch of water: 0 is the lowest, which rises first. */
  readonly order: number;
}

/** One round of a cascade: what matched, what was removed, what fell and what came in. */
export interface CascadeStep {
  readonly matches: readonly Match[];
  /** Specials made this round, and specials that fired (matched, swapped or caught in a blast). */
  readonly created: readonly Created[];
  readonly fired: readonly Fired[];
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
