/** A board position. Column 0 is the left edge, row 0 is the top row. */
export interface Cell {
  readonly col: number;
  readonly row: number;
}

/** A board to play: its size, the koi colours in play, and the cells its shape doesn't have. */
export interface BoardSpec {
  readonly cols: number;
  readonly rows: number;
  /** How many koi colours are in play. */
  readonly kinds: number;
  /** The cells the board's shape doesn't have (see parseShape); none for a plain rectangle. */
  readonly holes?: readonly Cell[];
}

/** Which koi colour a piece is (an index into the koi set). */
export type Kind = number;

/**
 * A special koi's power: a striped koi sweeps its row or column, a whirlpool drains the cells round it, a rainbow koi
 * takes every koi of one colour. A new special is a variant here: the compiler then asks for its reach
 * (SPECIAL_REACH), its look on the board (SpecialLooks) and its birth sound (SoundBoard). Its blast effect
 * (SpecialFx.fire), the way koi leave round it (SpecialMotions), its baked koi (SpecialTextures) and its petal
 * (SPECIAL_MENU) are listed by hand.
 */
export type Special =
  | { readonly type: 'line'; readonly along: 'row' | 'col' }
  | { readonly type: 'whirl' }
  | { readonly type: 'rainbow' };

/** Which special a koi is: striped (line), whirlpool or rainbow. */
export type SpecialType = Special['type'];

/** One koi on the board. The id stays with the piece while it moves, so the view can follow its sprite. */
export interface Piece {
  readonly id: number;
  readonly kind: Kind;
  readonly special?: Special;
}

/** A piece and the cell it sits in when a move starts (read before the model changes the board). */
export interface PlacedPiece {
  readonly piece: Piece;
  readonly at: Cell;
}

/**
 * A lily pad on the board. A pad takes a whole cell: no koi can be in it, and koi fall past it. Matches right next
 * to it (up, down, left, right) hit it.
 */
export interface Pad {
  readonly id: number;
  readonly at: Cell;
  /** A bud is a lotus waiting to bloom; an empty pad is scenery that drifts off when splashed. */
  readonly kind: 'bud' | 'empty';
  /** Hits still needed: a bud blooms at 0, an empty pad drifts away at 0. */
  readonly hitsLeft: number;
  /** Hits it took in total, so the view can show how far a bud has opened. */
  readonly hitsNeeded: number;
}

/** What happened to a pad when a cascade round cleared koi next to it. */
export type PadEvent =
  | { readonly type: 'hit'; readonly pad: Pad }
  | { readonly type: 'bloom'; readonly pad: Pad }
  | { readonly type: 'drift'; readonly pad: Pad };

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
  | { readonly valid: false; readonly reason: 'not-adjacent' | 'blocked' | 'no-match' }
  | { readonly valid: true; readonly steps: readonly CascadeStep[]; readonly reshuffled: boolean };

export const sameCell = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

export const isAdjacent = (a: Cell, b: Cell): boolean =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
