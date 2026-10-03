import type { Cell, Kind, Piece } from './types';

/** The grid of pieces. Only storage and bounds; the game rules live in rules.ts. */
export class Board {
  private readonly slots: (Piece | null)[];
  private nextId = 1;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.slots = new Array<Piece | null>(cols * rows).fill(null);
  }

  inBounds(cell: Cell): boolean {
    return cell.col >= 0 && cell.col < this.cols && cell.row >= 0 && cell.row < this.rows;
  }

  get(cell: Cell): Piece | null {
    if (!this.inBounds(cell)) return null;
    return this.slots[this.index(cell)] ?? null;
  }

  set(cell: Cell, piece: Piece | null): void {
    if (!this.inBounds(cell)) throw new RangeError(`cell ${cell.col},${cell.row} is off the board`);
    this.slots[this.index(cell)] = piece;
  }

  kindAt(cell: Cell): Kind | null {
    return this.get(cell)?.kind ?? null;
  }

  swap(a: Cell, b: Cell): void {
    const pa = this.get(a);
    this.set(a, this.get(b));
    this.set(b, pa);
  }

  /** Makes a new piece with a fresh id (not placed on the board). */
  createPiece(kind: Kind): Piece {
    return { id: this.nextId++, kind };
  }

  /** Every cell, row by row from the top-left. */
  *cells(): IterableIterator<Cell> {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) yield { col, row };
    }
  }

  private index(cell: Cell): number {
    return cell.row * this.cols + cell.col;
  }
}
