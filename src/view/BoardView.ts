import { Container, Point, Rectangle, Sprite } from 'pixi.js';
import type { PointData } from 'pixi.js';
import type { Board } from '../model/Board';
import type { Cell } from '../model/types';
import type { KoiTextures } from './KoiTextures';

export interface BoardViewLayout {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly koiSize: number;
}

/** Draws the board: one sprite per piece, found by the piece id so a koi keeps its sprite while it moves. */
export class BoardView extends Container {
  private readonly sprites = new Map<number, Sprite>();

  constructor(
    private readonly textures: KoiTextures,
    private readonly layout: BoardViewLayout,
  ) {
    super();
    // the whole board area takes pointer input, including the gaps between koi
    this.hitArea = new Rectangle(0, 0, layout.cols * layout.cellSize, layout.rows * layout.cellSize);
  }

  /** Makes the sprites match the board: adds new pieces, moves existing ones, removes the ones that are gone. */
  render(board: Board): void {
    const seen = new Set<number>();
    for (const cell of board.cells()) {
      const piece = board.get(cell);
      if (!piece) continue;
      seen.add(piece.id);
      const sprite = this.sprites.get(piece.id) ?? this.createSprite(piece.id, piece.kind);
      sprite.position.copyFrom(this.cellToPoint(cell));
    }
    this.removeSpritesNotIn(seen);
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

  private createSprite(id: number, kind: number): Sprite {
    const sprite = new Sprite(this.textures.get(kind));
    sprite.anchor.set(0.5);
    sprite.setSize(this.layout.koiSize);
    this.sprites.set(id, sprite);
    this.addChild(sprite);
    return sprite;
  }

  private removeSpritesNotIn(ids: ReadonlySet<number>): void {
    for (const [id, sprite] of this.sprites) {
      if (ids.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }
  }
}
