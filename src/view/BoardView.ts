import { Container, Point, Rectangle } from 'pixi.js';
import type { PointData } from 'pixi.js';
import type { Board } from '../model/Board';
import type { Cell, Piece } from '../model/types';
import { Koi } from './Koi';
import type { KoiTextures } from './KoiTextures';
import { KoiWaterline } from './KoiWaterline';

export interface BoardViewLayout {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly koiSize: number;
}

/**
 * Draws the board: one koi per piece, found by the piece id so a koi keeps its sprite while it moves. What the koi
 * cast into the water (shadows on the bottom, ripples from their tails, their shape at the waterline for the pond's
 * foam) follows them in a KoiWaterline; the shadows and ripples sit in their own layers under all the koi.
 */
export class BoardView extends Container {
  private readonly pieces = new Map<number, Koi>();
  private readonly waterline: KoiWaterline;
  private readonly koiLayer = new Container();

  constructor(
    private readonly textures: KoiTextures,
    private readonly layout: BoardViewLayout,
    private readonly random: () => number = Math.random,
  ) {
    super();
    // the whole board area takes pointer input, including the gaps between koi
    this.hitArea = new Rectangle(0, 0, layout.cols * layout.cellSize, layout.rows * layout.cellSize);
    this.waterline = new KoiWaterline(textures);
    this.addChild(this.waterline.shadows, this.waterline.ripples, this.koiLayer);
  }

  /** Where each koi meets the water, in the board's space: drawn by the pond into its mask, never shown. */
  get contacts(): Container {
    return this.waterline.contacts;
  }

  /**
   * Makes the sprites match the board: adds new pieces, moves existing ones, removes the ones that are gone.
   * O(N) over the cells plus O(S) over the sprites; each sprite is found by id in O(1). Runs once per turn.
   */
  render(board: Board): void {
    const seen = new Set<number>();
    for (const cell of board.cells()) {
      const piece = board.get(cell);
      if (!piece) continue;
      seen.add(piece.id);
      const koi = this.pieces.get(piece.id) ?? this.createKoi(piece.id, piece.kind);
      koi.position.copyFrom(this.cellToPoint(cell));
    }
    this.removeSpritesNotIn(seen);
  }

  /** The koi showing a piece. Throws when the piece has no koi, which means the view fell out of sync. */
  spriteOf(id: number): Koi {
    const koi = this.pieces.get(id);
    if (!koi) throw new Error(`no sprite for piece ${id}`);
    return koi;
  }

  /** Every koi on the board, for the effects that follow the fish (swimming, wakes). O(K) to walk. */
  *koi(): IterableIterator<Koi> {
    yield* this.pieces.values();
  }

  /** What the koi cast into the water follows them. Call once per frame after the koi moved, before the pond draws. */
  follow(deltaSeconds: number): void {
    this.waterline.follow(deltaSeconds);
  }

  /** Adds a koi for a new piece at a cell. */
  addPiece(piece: Piece, at: Cell): Koi {
    const koi = this.createKoi(piece.id, piece.kind);
    koi.position.copyFrom(this.cellToPoint(at));
    return koi;
  }

  removePiece(id: number): void {
    const koi = this.pieces.get(id);
    if (!koi) return;
    this.waterline.remove(koi);
    koi.destroy();
    this.pieces.delete(id);
  }

  /** Draws a koi above all the others (the one the player drags passes over the one it swaps with). */
  bringToFront(koi: Koi): void {
    this.koiLayer.addChild(koi);
  }

  /** Centre of a cell, in this container's space. */
  cellToPoint(cell: Cell): Point {
    const half = this.layout.cellSize / 2;
    return new Point(cell.col * this.layout.cellSize + half, cell.row * this.layout.cellSize + half);
  }

  /** The cell under a point in this container's space, or null when the point is off the board. */
  pointToCell(point: PointData): Cell | null {
    const col = Math.floor(point.x / this.layout.cellSize);
    const row = Math.floor(point.y / this.layout.cellSize);
    const onBoard = col >= 0 && col < this.layout.cols && row >= 0 && row < this.layout.rows;
    return onBoard ? { col, row } : null;
  }

  /** Creates a piece's koi, which the animations move, and sets it in the water. */
  private createKoi(id: number, kind: number): Koi {
    const koi = new Koi(kind, this.textures.swim(kind), this.layout.koiSize, this.random);
    this.pieces.set(id, koi);
    this.koiLayer.addChild(koi);
    this.waterline.add(koi);
    return koi;
  }

  private removeSpritesNotIn(ids: ReadonlySet<number>): void {
    for (const id of this.pieces.keys()) {
      if (!ids.has(id)) this.removePiece(id);
    }
  }
}

