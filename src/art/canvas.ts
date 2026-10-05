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

/** Sets a context up to paint a piece centered on (x, y) px, at `scale` px per unit, with round joins and caps. */
export function centerOn(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/** A point on a canvas. */
export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Traces a smooth closed curve through the midpoints of a polygon's sides, each corner its control point (rounded,
 * no overshoot). Starts a new path unless `begin` is false (to add to a compound path).
 */
export function traceSmoothClosed(
  ctx: CanvasPath & Pick<CanvasDrawPath, 'beginPath'>,
  points: readonly CanvasPoint[],
  begin = true,
): void {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return;
  const mid = (a: CanvasPoint, b: CanvasPoint): [number, number] => [(a.x + b.x) / 2, (a.y + b.y) / 2];
  if (begin) ctx.beginPath();
  ctx.moveTo(...mid(last, first));
  points.forEach((point, i) => {
    ctx.quadraticCurveTo(point.x, point.y, ...mid(point, points[(i + 1) % points.length] ?? first));
  });
  ctx.closePath();
}

/** A gradient's stops: where (0..1) and the color there. */
export type ColorStops = readonly (readonly [number, string])[];

/**
 * A radial gradient round (x, y), from `inner` to `outer` px through `stops`, filled over its bounding square (in the
 * context's own units): a glow, a halo, a soft shadow.
 */
export function fillRadial(
  ctx: CanvasRenderingContext2D,
  [x, y]: readonly [number, number],
  [inner, outer]: readonly [number, number],
  stops: ColorStops,
): void {
  const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - outer, y - outer, outer * 2, outer * 2);
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
