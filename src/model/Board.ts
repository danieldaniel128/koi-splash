import type { Cell, PieceColor, Piece, Axis } from './types';
import { colorOf } from './types';

/**
 * The grid of pieces. Only storage and bounds; the game rules live in rules.ts. A cell can be blocked (a lily pad
 * sits there): it holds no piece, and pieces fall past it. A hole is a cell the board's shape doesn't have (the
 * bank comes in there): it never holds a piece, and it splits its column (see rules.ts).
 */
export class Board {
  private readonly slots: (Piece | null)[];
  private readonly blocked = new Set<number>();
  private readonly holes = new Set<number>();
  private nextId = 1;

  constructor(
    readonly cols: number,
    readonly rows: number,
    holes: readonly Cell[] = [],
  ) {
    this.slots = new Array<Piece | null>(cols * rows).fill(null);
    for (const hole of holes) {
      if (!this.inBounds(hole)) throw new RangeError(`hole ${hole.col},${hole.row} is off the board`);
      this.holes.add(this.index(hole));
    }
  }

  inBounds(cell: Cell): boolean {
    return cell.col >= 0 && cell.col < this.cols && cell.row >= 0 && cell.row < this.rows;
  }

  /** True where the board's shape has no cell. */
  isHole(cell: Cell): boolean {
    return this.inBounds(cell) && this.holes.has(this.index(cell));
  }

  /** True where a lily pad sits. */
  hasPad(cell: Cell): boolean {
    return this.inBounds(cell) && this.blocked.has(this.index(cell));
  }

  /** True where no piece can be: a lily pad, or a hole. */
  isBlocked(cell: Cell): boolean {
    return this.inBounds(cell) && (this.blocked.has(this.index(cell)) || this.holes.has(this.index(cell)));
  }

  /** Blocks a cell (removing any piece in it) or opens it again. A hole stays a hole. */
  setBlocked(cell: Cell, blocked: boolean): void {
    if (!this.inBounds(cell)) throw new RangeError(`cell ${cell.col},${cell.row} is off the board`);
    const index = this.index(cell);
    if (blocked && this.holes.has(index)) throw new RangeError(`cell ${cell.col},${cell.row} is a hole`);
    if (!blocked) {
      this.blocked.delete(index);
      return;
    }
    this.blocked.add(index);
    this.slots[index] = null;
  }

  get(cell: Cell): Piece | null {
    if (!this.inBounds(cell)) return null;
    return this.slots[this.index(cell)] ?? null;
  }

  set(cell: Cell, piece: Piece | null): void {
    this.checkFits(cell, piece);
    this.slots[this.index(cell)] = piece;
  }

  /** The colour a piece matches as: null for an empty cell, and for a rainbow koi (it matches nothing). */
  colorAt(cell: Cell): PieceColor | null {
    const piece = this.get(cell);
    return piece ? colorOf(piece) : null;
  }

  /** The cells whose koi match as this colour. O(N). */
  cellsOf(color: PieceColor): Cell[] {
    return [...this.cells()].filter((cell) => this.colorAt(cell) === color);
  }

  /** Every cell of one row or column (holes included), in order. */
  line(along: Axis, index: number): Cell[] {
    const length = along === 'row' ? this.cols : this.rows;
    return Array.from({ length }, (_, i) =>
      along === 'row' ? { col: i, row: index } : { col: index, row: i },
    );
  }

  /** Trades the pieces of two cells. Both are checked first, so a swap that can't happen changes nothing. */
  swap(a: Cell, b: Cell): void {
    const pa = this.get(a);
    const pb = this.get(b);
    this.checkFits(a, pb);
    this.checkFits(b, pa);
    this.set(a, pb);
    this.set(b, pa);
  }

  /** Makes a new piece with a fresh id (not placed on the board). */
  createPiece(color: PieceColor): Piece {
    return { id: this.nextId++, color: color };
  }

  /** Every cell, row by row from the top-left. */
  *cells(): IterableIterator<Cell> {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) yield { col, row };
    }
  }

  /** Throws unless `cell` is on the board and can take `piece` (an empty cell anywhere on it can). */
  private checkFits(cell: Cell, piece: Piece | null): void {
    if (!this.inBounds(cell)) throw new RangeError(`cell ${cell.col},${cell.row} is off the board`);
    if (piece && this.isBlocked(cell)) throw new RangeError(`cell ${cell.col},${cell.row} is blocked`);
  }

  private index(cell: Cell): number {
    return cell.row * this.cols + cell.col;
  }
}
