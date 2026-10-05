import { Sprite, Texture } from 'pixi.js';
import { paintBackdrop, planBackdrop } from '../art/backdrop';
import { blank, context } from '../art/canvas';
import type { BackdropFrame, BackdropLook } from '../art/backdrop';
import { seeded } from '../core/Random';

/**
 * The scene around the pond, painted once into one texture at the screen's real pixel density (as wide as the stage,
 * down to the horizon, or the whole stage on a wide screen) and drawn as a single sprite over the bank. Only a
 * screen bigger than the GPU's largest texture (`maxSize` px) gets it a little softer. O(stage area) paint, once.
 */
export function createBackdrop(
  frame: BackdropFrame,
  look: BackdropLook,
  pixels: { readonly resolution: number; readonly maxSize: number },
  seed: number,
): Sprite {
  const { height } = planBackdrop(frame);
  const { resolution, maxSize } = pixels;
  const scale = Math.min(resolution, maxSize / frame.width, maxSize / Math.max(height, 1));
  const canvas = blank(frame.width * scale, height * scale);
  const ctx = context(canvas);
  ctx.scale(scale, scale);
  const rng = seeded(seed);
  paintBackdrop(ctx, frame, look, rng);
  const sprite = new Sprite(Texture.from(canvas));
  sprite.scale.set(1 / scale);
  return sprite;
}
