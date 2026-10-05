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
