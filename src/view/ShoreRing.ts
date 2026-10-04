import { Container, Sprite, Texture } from 'pixi.js';
import { bakePiece } from '../art/pondProps';
import type { ShorePainter } from '../art/shoreStyles';
import { Random } from '../core/Random';
import type { ShorePiece } from '../layout/shore';

/**
 * The pond's border: one sprite per piece along the shore, each painted once by the border's style (see
 * SHORE_STYLES). It doesn't know what the pieces are, only where they go and who paints them.
 */
export class ShoreRing extends Container {
  /** O(pieces) canvas paints and uploads, once. */
  constructor(pieces: readonly ShorePiece[], paint: ShorePainter, seed: number, resolution: number) {
    super();
    pieces.forEach((piece, i) => {
      const rng = new Random(seed + i); // each piece its own look, the same every time
      const canvas = bakePiece(piece.radius, resolution, (ctx) => {
        paint(ctx, piece.radius, () => rng.next());
      });
      const sprite = new Sprite(Texture.from(canvas));
      sprite.anchor.set(0.5);
      sprite.scale.set(1 / resolution);
      sprite.position.set(...piece.at);
      this.addChild(sprite);
    });
  }
}
