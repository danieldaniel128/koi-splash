import type { Random } from '../core/Random';
import type { BoardSpec } from './rules';
import type { Cell } from './types';

/**
 * A lily pad on the board. Pads are not pieces and sit on the CORNERS between cells, so a pad never hides a koi:
 * `at` names the corner at the top-left of cell `at` (cols 1..cols-1, rows 1..rows-1, never on the board's edge).
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

export interface PadSpec {
  /** Lotus buds on the board (the lotus goal counts their blooms). */
  readonly buds: number;
  readonly emptyPads: number;
  /** Matches next to a bud before it blooms. */
  readonly hitsToBloom: number;
  /** Matches next to an empty pad before it drifts away. */
  readonly hitsToDrift: number;
}

/** The four cells that meet at a corner, relative to the corner's `at`. */
const AROUND_CORNER: readonly Cell[] = [
  { col: -1, row: -1 },
  { col: 0, row: -1 },
  { col: -1, row: 0 },
  { col: 0, row: 0 },
];

/**
 * The lily pads on the board. A cascade round "hits" a pad when it clears any of the four koi around the pad's
 * corner; a pad takes at most one hit per round, however many of them cleared.
 */
export class PadField {
  private readonly field = new Map<number, Pad>();

  constructor(pads: readonly Pad[]) {
    for (const pad of pads) this.field.set(pad.id, pad);
  }

  /**
   * Scatters the buds and empty pads over distinct random inner corners. O(cols * rows) for the shuffle.
   * Throws when the board has fewer inner corners than pads.
   */
  static scatter(spec: PadSpec, board: BoardSpec, rng: Random): PadField {
    const total = spec.buds + spec.emptyPads;
    const corners = shuffledCorners(board, rng);
    if (total > corners.length) throw new RangeError(`${total} pads do not fit on the board`);
    const pads = corners.slice(0, total).map((at, i): Pad => {
      const kind = i < spec.buds ? 'bud' : 'empty';
      const hitsNeeded = kind === 'bud' ? spec.hitsToBloom : spec.hitsToDrift;
      return { id: i + 1, at, kind, hitsLeft: hitsNeeded, hitsNeeded };
    });
    return new PadField(pads);
  }

  /** The pads still on the board. */
  get pads(): readonly Pad[] {
    return [...this.field.values()];
  }

  /**
   * Applies one cascade round's cleared cells to the pads and returns what happened, in pad order.
   * Bloomed buds and drifted pads leave the board. O(P * 4) set lookups, P = pads.
   */
  hit(cleared: readonly Cell[]): PadEvent[] {
    const hitCells = new Set(cleared.map(key));
    const events: PadEvent[] = [];
    for (const pad of this.field.values()) {
      const touched = AROUND_CORNER.some((d) =>
        hitCells.has(key({ col: pad.at.col + d.col, row: pad.at.row + d.row })),
      );
      if (touched) events.push(this.applyHit(pad));
    }
    return events;
  }

  private applyHit(pad: Pad): PadEvent {
    const next: Pad = { ...pad, hitsLeft: pad.hitsLeft - 1 };
    if (next.hitsLeft > 0) {
      this.field.set(pad.id, next);
      return { type: 'hit', pad: next };
    }
    this.field.delete(pad.id);
    return { type: next.kind === 'bud' ? 'bloom' : 'drift', pad: next };
  }
}

function key(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

/** Every inner corner of the board (where four cells meet) in random order (Fisher-Yates). */
function shuffledCorners(board: BoardSpec, rng: Random): Cell[] {
  const cells: Cell[] = [];
  for (let row = 1; row < board.rows; row++) {
    for (let col = 1; col < board.cols; col++) cells.push({ col, row });
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const swap = cells[i];
    const other = cells[j];
    if (swap && other) [cells[i], cells[j]] = [other, swap];
  }
  return cells;
}
