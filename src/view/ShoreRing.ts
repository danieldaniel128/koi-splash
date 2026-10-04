import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { bakeAtlas } from '../art/atlas';
import type { ShorePainter } from '../art/shoreStyles';
import { Random } from '../core/Random';
import type { ShorePiece } from '../layout/shore';

/**
 * The pond's border: one sprite per piece along the shore, each painted once by the border's style (see
 * SHORE_STYLES). It doesn't know what the pieces are, only where they go and who paints them. All the pieces are
 * baked into one atlas, so the whole ring is one texture and one draw call.
 */
export class ShoreRing extends Container {
  /** O(pieces) canvas paints and one upload, once. */
  constructor(pieces: readonly ShorePiece[], paint: ShorePainter, seed: number, resolution: number) {
    super();
    const atlas = bakeAtlas(
      pieces.map((piece, i) => {
        const rng = new Random(seed + i); // each piece its own look, the same every time
        return {
          radius: piece.radius,
          paint: (ctx: CanvasRenderingContext2D) => {
            paint(ctx, piece.radius, () => rng.next());
          },
        };
      }),
      resolution,
    );
    const { source } = Texture.from(atlas.canvas);
    pieces.forEach((piece, i) => {
      const slot = atlas.slots[i];
      if (!slot) return;
      const frame = new Rectangle(slot.x, slot.y, slot.width, slot.height);
      const sprite = new Sprite(new Texture({ source, frame }));
      sprite.anchor.set(0.5);
      sprite.scale.set(1 / atlas.resolution);
      sprite.position.set(...piece.at);
      this.addChild(sprite);
    });
  }
}
