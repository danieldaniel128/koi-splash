import { Container, Point, Sprite } from 'pixi.js';
import type { Board } from '../model/Board';
import type { Cell } from '../model/types';
import type { KoiTextures } from './KoiTextures';

/** Draws the board: one sprite per piece, found by the piece id so a koi keeps its sprite while it moves. */
export class BoardView extends Container {
  private readonly sprites = new Map<number, Sprite>();

  constructor(
    private readonly textures: KoiTextures,
    private readonly cellSize: number,
    private readonly koiSize: number,
  ) {
    super();
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
    const half = this.cellSize / 2;
    return new Point(cell.col * this.cellSize + half, cell.row * this.cellSize + half);
  }

  private createSprite(id: number, kind: number): Sprite {
    const sprite = new Sprite(this.textures.get(kind));
    sprite.anchor.set(0.5);
    sprite.setSize(this.koiSize);
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
