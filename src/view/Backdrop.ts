import { Sprite, Texture } from 'pixi.js';
import { paintBackdrop } from '../art/backdrop';
import type { BackdropLook } from '../art/backdrop';
import { Random } from '../core/Random';

/** Every WebGL device takes a texture this wide. */
const MAX_SIZE = 2048;

/**
 * The scene above the pond, painted once into one texture at the screen's real pixel density (as wide as the stage,
 * down to the horizon) and drawn as a single sprite over the bank. O(stage area) paint, once.
 */
export function createBackdrop(
  size: { width: number; horizon: number; open: number },
  look: BackdropLook,
  resolution: number,
  seed: number,
): Sprite {
  const scale = Math.min(resolution, MAX_SIZE / size.width, MAX_SIZE / Math.max(size.horizon, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(size.width * scale));
  canvas.height = Math.max(1, Math.ceil(size.horizon * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('backdrop: 2D canvas not available');
  ctx.scale(scale, scale);
  const rng = new Random(seed);
  paintBackdrop(ctx, size.width, size, look, () => rng.next());
  const sprite = new Sprite(Texture.from(canvas));
  sprite.scale.set(1 / scale);
  return sprite;
}
