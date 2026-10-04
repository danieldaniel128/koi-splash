import type { Random } from '../core/Random';
import type { BoardSpec } from './rules';
import type { Cell } from './types';

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

export interface PadSpec {
  /** Lotus buds on the board (the lotus goal counts their blooms). */
  readonly buds: number;
  readonly emptyPads: number;
  /** Matches next to a bud before it blooms. */
  readonly hitsToBloom: number;
  /** Matches next to an empty pad before it drifts away. */
  readonly hitsToDrift: number;
  /** Pads are at least this many cells apart (in any direction), so they never cluster. */
  readonly spacing: number;
}

/** The pad's own cell (a special's blast passing over it) and the four cells right next to it. */
const AROUND: readonly Cell[] = [
  { col: 0, row: 0 },
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
];

/**
 * The lily pads on the board. A cascade round "hits" a pad when it clears a koi right next to it; a pad takes at
 * most one hit per round, however many of its neighbours cleared. A bloomed or drifted pad frees its cell.
 */
export class PadField {
  private readonly field = new Map<number, Pad>();

  constructor(pads: readonly Pad[]) {
    for (const pad of pads) this.field.set(pad.id, pad);
  }

  /**
   * Scatters the buds and empty pads over random cells at least `spacing` apart. O(N * P) for N cells, P pads.
   * Throws when they don't fit.
   */
  static scatter(spec: PadSpec, board: BoardSpec, rng: Random): PadField {
    const total = spec.buds + spec.emptyPads;
    const cells = spacedCells(shuffledCells(board, rng), spec.spacing, total);
    if (cells.length < total) throw new RangeError(`${total} pads do not fit ${spec.spacing} cells apart`);
    const pads = cells.map((at, i): Pad => {
      const kind = i < spec.buds ? 'bud' : 'empty';
      const hitsNeeded = kind === 'bud' ? spec.hitsToBloom : spec.hitsToDrift;
      return { id: i + 1, at, kind, hitsLeft: hitsNeeded, hitsNeeded };
    });
    return new PadField(pads);
  }

  /** The cells the pads take, to block on the board. */
  get cells(): Cell[] {
    return this.pads.map((pad) => pad.at);
  }

  /** The pads still on the board. */
  get pads(): readonly Pad[] {
    return [...this.field.values()];
  }

  /**
   * Applies one cascade round's cleared cells to the pads and returns what happened, in pad order.
   * Bloomed buds and drifted pads leave the field (the caller frees their cells). O(P * 4) lookups, P = pads.
   */
  hit(cleared: readonly Cell[]): PadEvent[] {
    const hitCells = new Set(cleared.map(key));
    const events: PadEvent[] = [];
    for (const pad of this.field.values()) {
      const touched = AROUND.some((d) =>
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

/** Picks cells in order, skipping any closer than `spacing` (in either direction) to one already picked. */
function spacedCells(cells: readonly Cell[], spacing: number, count: number): Cell[] {
  const picked: Cell[] = [];
  for (const cell of cells) {
    if (picked.length === count) break;
    const clear = picked.every(
      (p) => Math.max(Math.abs(p.col - cell.col), Math.abs(p.row - cell.row)) >= spacing,
    );
    if (clear) picked.push(cell);
  }
  return picked;
}

/** Every cell of the board in random order (Fisher-Yates). */
function shuffledCells(board: BoardSpec, rng: Random): Cell[] {
  const holes = new Set((board.holes ?? []).map(key));
  const cells: Cell[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) if (!holes.has(key({ col, row }))) cells.push({ col, row });
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const swap = cells[i];
    const other = cells[j];
    if (swap && other) [cells[i], cells[j]] = [other, swap];
  }
  return cells;
}
