import { Container, Point, Rectangle, Sprite } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { WATER } from '../config/water';
import type { Board } from '../model/Board';
import type { Cell, Piece } from '../model/types';
import { Koi } from './Koi';
import type { KoiTextures } from './KoiTextures';

export interface BoardViewLayout {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly koiSize: number;
}

/** A koi on screen and its shadow on the pond bottom. */
interface PieceSprites {
  readonly koi: Koi;
  readonly shadow: Sprite;
}

/**
 * Draws the board: one koi per piece, found by the piece id so a koi keeps its sprite while it moves. Every koi
 * casts a soft shadow onto the pond bottom; the shadows sit in their own layer under all the koi.
 */
export class BoardView extends Container {
  private readonly pieces = new Map<number, PieceSprites>();
  private readonly shadowLayer = new Container();
  private readonly koiLayer = new Container();

  constructor(
    private readonly textures: KoiTextures,
    private readonly layout: BoardViewLayout,
    private readonly random: () => number = Math.random,
  ) {
    super();
    // the whole board area takes pointer input, including the gaps between koi
    this.hitArea = new Rectangle(0, 0, layout.cols * layout.cellSize, layout.rows * layout.cellSize);
    this.addChild(this.shadowLayer, this.koiLayer);
    this.onRender = () => {
      this.syncShadows();
    };
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
      const koi = this.pieces.get(piece.id)?.koi ?? this.createSprites(piece.id, piece.kind);
      koi.position.copyFrom(this.cellToPoint(cell));
    }
    this.removeSpritesNotIn(seen);
  }

  /** The koi showing a piece. Throws when the piece has no koi, which means the view fell out of sync. */
  spriteOf(id: number): Koi {
    const sprites = this.pieces.get(id);
    if (!sprites) throw new Error(`no sprite for piece ${id}`);
    return sprites.koi;
  }

  /** Every koi on the board, for the effects that follow the fish (swimming, wakes). O(K) to walk. */
  *koi(): IterableIterator<Koi> {
    for (const { koi } of this.pieces.values()) yield koi;
  }

  /** Adds a koi for a new piece at a cell. */
  addPiece(piece: Piece, at: Cell): Koi {
    const koi = this.createSprites(piece.id, piece.kind);
    koi.position.copyFrom(this.cellToPoint(at));
    return koi;
  }

  removePiece(id: number): void {
    const sprites = this.pieces.get(id);
    sprites?.koi.destroy();
    sprites?.shadow.destroy();
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

  /** Creates a piece's koi and shadow sprites and returns the koi, which the animations move. */
  private createSprites(id: number, kind: number): Koi {
    const koi = new Koi(kind, this.textures.swim(kind), this.layout.koiSize, this.random);
    const shadow = new Sprite(this.textures.shadow(kind));
    shadow.anchor.set(0.5);
    shadow.tint = WATER.shadowColor;
    this.pieces.set(id, { koi, shadow });
    this.koiLayer.addChild(koi);
    this.shadowLayer.addChild(shadow);
    return koi;
  }

  /**
   * Shadows follow their koi every frame: same position (offset away from the moon), turn, scale and fade. A koi
   * lifted toward the surface (scaled up) casts its shadow further away. O(S), S = koi.
   */
  private syncShadows(): void {
    const [offsetX, offsetY] = WATER.shadowOffset;
    for (const { koi, shadow } of this.pieces.values()) {
      const lift = Math.max(1, koi.scale.x / koi.restScale);
      const reach = 1 + (lift - 1) * 6;
      shadow.position.set(koi.x + offsetX * reach, koi.y + offsetY * reach);
      shadow.scale.copyFrom(koi.scale); // same pixel density as the koi texture, the extra canvas is blur room
      shadow.rotation = koi.rotation;
      shadow.alpha = koi.alpha * WATER.shadowAlpha;
    }
  }

  private removeSpritesNotIn(ids: ReadonlySet<number>): void {
    for (const id of this.pieces.keys()) {
      if (!ids.has(id)) this.removePiece(id);
    }
  }
}
