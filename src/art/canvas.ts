/** Small helpers every canvas painter shares. No framework code. */

/** A fresh, empty canvas `width` x `height` px (rounded up, at least 1). */
export function blank(width: number, height = width): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

/** A canvas's 2D context. */
export function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  return ctx;
}

/** A copy of a canvas's pixels on a fresh canvas (whose context is plain). */
export function copyCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = blank(source.width, source.height);
  context(canvas).drawImage(source, 0, 0);
  return canvas;
}

/**
 * A canvas's context, saved and reset to plain pixels: the koi painter leaves its own scale and settings on it.
 * Restore it when done.
 */
export function freshContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = context(canvas);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  return ctx;
}

/**
 * Fills the whole canvas with `style` in plain pixels (whatever the context's transform), under the composite `mode`
 * and at `alpha`, and leaves the context as it was: a tint, a recolor, a cut to a shape. A gradient is read in pixels.
 */
export function wash(
  ctx: CanvasRenderingContext2D,
  style: string | CanvasGradient,
  mode: GlobalCompositeOperation = 'source-over',
  alpha = 1,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/**
 * `color` ('#rrggbb', 'rgb(...)' or 'rgba(...)') at zero alpha: what a glow fades out to. A canvas gradient blends its
 * stops unpremultiplied, so fading to transparent black would darken the glow's edge into a ring.
 */
export function transparent(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}00`;
  const channels = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color);
  if (!channels) throw new Error(`no transparent form of the color ${color}`);
  const [, red, green, blue] = channels;
  return `rgba(${red ?? 0}, ${green ?? 0}, ${blue ?? 0}, 0)`;
}
