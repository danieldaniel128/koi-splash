/**
 * specialKoi.ts - the special koi, painted on canvases from the board's own koi (after the prototype's looks):
 * - a striped koi: bands of its colour and white running along its body, under the same ink outline
 * - a rainbow koi: its scales recoloured with the spectrum, head to tail (their light and shade kept)
 * - a glossy sheen: frames of a light bar sweeping tail to head, cut to the body, cross-faded at run time
 * - a whirlpool: a dark eddy with tapered arms in the koi's colour and white crests, and the koi curled into its eye
 * Pure canvas work, no framework: bake once, never during play.
 */

type Ctx = CanvasRenderingContext2D;

/**
 * How a striped koi's bands look (after the prototype's): `count` bands across its body, the band colour at both
 * edges and white between, with a fine dark line between them; `body` is where the body spans across the canvas
 * (see bodySpan), so the bands fit it exactly.
 */
export interface StripeLook {
  readonly band: string;
  readonly line: string;
  readonly count: number;
  readonly body: { readonly left: number; readonly right: number };
}

/** The spectrum a rainbow koi wears, head to tail. */
export const SPECTRUM = [
  '#ff4b4b',
  '#ff9f2e',
  '#ffe83a',
  '#4ded6a',
  '#3fdcff',
  '#5470ff',
  '#b45cff',
] as const;

/**
 * Bands of colour and white running along a head-up koi part (its body, its fins), like the prototype's striped koi:
 * opaque, so the koi's own pattern is gone, `count` of them across the body with the band colour at both edges, the
 * pattern carrying on over the fins, a fine dark line between bands and a light from the moon side for roundness.
 * A dressing for bakeInkedKoi, so the ink outline goes on top.
 */
export function stripe(part: HTMLCanvasElement, look: StripeLook): void {
  const ctx = fresh(part);
  const band = (look.body.right - look.body.left) / look.count;
  const first = look.body.left - Math.ceil(look.body.left / band) * band; // the grid, carried out to the edges
  ctx.globalCompositeOperation = 'source-atop';
  for (let x = first; x < part.width; x += band) {
    const index = Math.round((x - look.body.left) / band);
    ctx.fillStyle = ((index % 2) + 2) % 2 === 0 ? look.band : '#ffffff';
    ctx.fillRect(x, 0, band + 0.5, part.height);
  }
  ctx.fillStyle = look.line;
  for (let x = first; x < part.width; x += band) ctx.fillRect(x - band * 0.07, 0, band * 0.14, part.height);
  shade(ctx, part);
  ctx.restore();
}

/** Where a head-up koi body spans across its canvas (px), at its widest: what the bands fit. O(pixels), once. */
export function bodySpan(body: HTMLCanvasElement): { left: number; right: number } {
  const { width, height } = body;
  const alpha = context(body).getImageData(0, 0, width, height).data;
  let best = { left: width / 2, right: width / 2 };
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if ((alpha[(y * width + x) * 4 + 3] ?? 0) < 128) continue;
      if (left < 0) left = x;
      right = x + 1;
    }
    if (left >= 0 && right - left > best.right - best.left) best = { left, right };
  }
  return best;
}

/**
 * A head-up koi part recoloured with the spectrum, head to tail, by the 'color' blend: the koi's own light and shade
 * stay, its hues become the rainbow's. A dressing for bakeInkedKoi.
 */
export function rainbow(part: HTMLCanvasElement): void {
  const original = copy(part);
  const ctx = fresh(part);
  const spectrum = ctx.createLinearGradient(0, part.height * 0.15, 0, part.height * 0.85);
  SPECTRUM.forEach((colour, i) => {
    spectrum.addColorStop(i / (SPECTRUM.length - 1), colour);
  });
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = spectrum;
  ctx.fillRect(0, 0, part.width, part.height);
  ctx.globalCompositeOperation = 'destination-in'; // the blend painted the empty corners too: cut back to the koi
  ctx.drawImage(original, 0, 0);
  ctx.restore();
}

/**
 * Frames of a glossy light bar sweeping a head-up koi body from tail to head, cut to its silhouette. Shown on top
 * of the koi, additively, one after another: the sheen of a striped koi.
 */
export function sheenFrames(body: HTMLCanvasElement, frames: number): HTMLCanvasElement[] {
  return Array.from({ length: frames }, (_, f) => {
    const canvas = copy(body);
    const ctx = context(canvas);
    const y = canvas.height * (0.78 - 0.62 * (f / Math.max(1, frames - 1))); // tail (low) to head (high)
    const bar = ctx.createLinearGradient(
      0,
      y - canvas.height * 0.09,
      canvas.width * 0.2,
      y + canvas.height * 0.09,
    );
    bar.addColorStop(0, 'rgba(255, 253, 242, 0)');
    bar.addColorStop(0.5, 'rgba(255, 253, 242, 0.85)');
    bar.addColorStop(1, 'rgba(255, 253, 242, 0)');
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = bar;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
}

/**
 * A whirlpool's eddy, `size` px across: dark at its eye, three tapered arms in `colour` with white crests curling
 * counter-clockwise into it, fading out at the rim. Turned clockwise, the arms seem to draw in, down the drain.
 */
export function paintWhirlpool(size: number, colour: string): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  ctx.translate(r, r);
  ctx.scale(1, -1); // the arms below curl clockwise inward; mirrored, they curl counter-clockwise
  const eye = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  eye.addColorStop(0, 'rgba(0, 5, 14, 0.96)');
  eye.addColorStop(0.22, 'rgba(2, 16, 34, 0.82)');
  eye.addColorStop(0.6, 'rgba(8, 42, 72, 0.4)');
  eye.addColorStop(1, 'rgba(12, 56, 90, 0)');
  ctx.fillStyle = eye;
  ctx.fillRect(-r, -r, size, size);
  for (let k = 0; k < 3; k++) {
    const start = (k * Math.PI * 2) / 3;
    arm(ctx, { start, reach: 0.97 * r, turn: 3.6, width: 0.34 * r }, colour, 0.6);
    arm(ctx, { start: start + 0.1, reach: 0.9 * r, turn: 3.6, width: 0.12 * r }, '#ffffff', 0.95);
  }
  const rim = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  rim.addColorStop(0, '#000');
  rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = rim;
  ctx.fillRect(-r, -r, size, size);
  return canvas;
}

/** How much of its own length a curled koi wraps round the ring (under 1: a little slimmer, head clear of tail). */
const CURL_WRAP = 0.95;

/**
 * A head-up koi curled round a ring of `radius` px, head leading clockwise, as if swept into a whirlpool's eye. A
 * polar warp, pixel by pixel: across the koi becomes out from the centre and along it becomes round the ring, so the
 * outline stays one smooth line (cut into strips, the stretched outer edge broke up into seams).
 */
export function curl(koi: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const size = koi.width;
  const source = koi.getContext('2d')?.getImageData(0, 0, size, koi.height);
  if (!source) throw new Error('specialKoi: 2D canvas not available');
  const canvas = blank(size);
  const ctx = context(canvas);
  const out = ctx.createImageData(size, size);
  const centre = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      const across = Math.hypot(dx, dy) - radius; // + away from the centre
      const along = (Math.atan2(dy, dx) * radius) / CURL_WRAP; // + clockwise, toward the head
      sample(source, { x: centre + across - 0.5, y: centre - along - 0.5 }, out.data, (y * size + x) * 4);
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/**
 * Reads `image` at a point between pixels into `into` at `at`: bilinear, weighted by alpha so the dark water round
 * a sprite's edge doesn't bleed in. Outside the image is clear.
 */
function sample(image: ImageData, point: PointLike, into: Uint8ClampedArray, at: number): void {
  const x0 = Math.floor(point.x);
  const y0 = Math.floor(point.y);
  const fx = point.x - x0;
  const fy = point.y - y0;
  const sum = { r: 0, g: 0, b: 0, a: 0 };
  addTexel(image, { x: x0, y: y0 }, (1 - fx) * (1 - fy), sum);
  addTexel(image, { x: x0 + 1, y: y0 }, fx * (1 - fy), sum);
  addTexel(image, { x: x0, y: y0 + 1 }, (1 - fx) * fy, sum);
  addTexel(image, { x: x0 + 1, y: y0 + 1 }, fx * fy, sum);
  if (sum.a <= 0) return;
  into[at] = sum.r / sum.a;
  into[at + 1] = sum.g / sum.a;
  into[at + 2] = sum.b / sum.a;
  into[at + 3] = sum.a;
}

/** Adds one pixel of `image`, by `weight`, to a running alpha-weighted sum (nothing if it's outside the image). */
function addTexel(
  image: ImageData,
  pixel: PointLike,
  weight: number,
  sum: { r: number; g: number; b: number; a: number },
): void {
  if (pixel.x < 0 || pixel.y < 0 || pixel.x >= image.width || pixel.y >= image.height) return;
  const i = (pixel.y * image.width + pixel.x) * 4;
  const { data } = image;
  const alpha = (data[i + 3] ?? 0) * weight;
  sum.r += (data[i] ?? 0) * alpha;
  sum.g += (data[i + 1] ?? 0) * alpha;
  sum.b += (data[i + 2] ?? 0) * alpha;
  sum.a += alpha;
}

/** A point in a canvas's pixels. */
interface PointLike {
  readonly x: number;
  readonly y: number;
}

/** One tapered ribbon spiralling into the centre: wide in the middle, thin at both ends. */
function arm(
  ctx: Ctx,
  shape: { start: number; reach: number; turn: number; width: number },
  colour: string,
  alpha: number,
): void {
  const samples = 40;
  const point = (f: number, side: number): [number, number] => {
    const r = shape.reach * (0.12 + 0.88 * f);
    const a = shape.start + shape.turn * (1 - f);
    const half = (shape.width * Math.pow(Math.sin(Math.PI * f), 0.8) * (0.3 + 0.7 * f)) / 2;
    return [Math.cos(a) * (r + side * half), Math.sin(a) * (r + side * half)];
  };
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) ctx.lineTo(...point(i / samples, 1));
  for (let i = samples; i >= 0; i--) ctx.lineTo(...point(i / samples, -1));
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Light from the moon side, shade at the far edge, over a part's paint: gives the bands some roundness. */
function shade(ctx: Ctx, part: HTMLCanvasElement): void {
  const light = ctx.createRadialGradient(
    part.width * 0.42,
    part.height * 0.4,
    part.width * 0.02,
    part.width * 0.5,
    part.height * 0.5,
    part.width * 0.36,
  );
  light.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  light.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
  light.addColorStop(1, 'rgba(0, 14, 34, 0.4)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, part.width, part.height);
}

function blank(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size);
  canvas.height = Math.ceil(size);
  return canvas;
}

/**
 * A canvas's context, saved and reset to plain pixels: the koi painter leaves its own scale and settings on it.
 * Restore it when done.
 */
function fresh(canvas: HTMLCanvasElement): Ctx {
  const ctx = context(canvas);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  return ctx;
}

function copy(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  context(canvas).drawImage(source, 0, 0); // a new canvas: its context is plain
  return canvas;
}

function context(canvas: HTMLCanvasElement): Ctx {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('specialKoi: 2D canvas not available');
  return ctx;
}

/**
 * The glow under a rainbow koi: the seven colours of the spectrum round a white heart, `size` px wide. Spun slowly
 * and drawn additively.
 */
export function paintPrismGlow(size: number): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  ctx.globalCompositeOperation = 'lighter';
  SPECTRUM.forEach((colour, i) => {
    const angle = (i / SPECTRUM.length) * Math.PI * 2;
    glowAt(ctx, r + Math.cos(angle) * r * 0.24, r + Math.sin(angle) * r * 0.24, r * 0.76, colour, 0.42);
  });
  glowAt(ctx, r, r, r * 0.4, '#ffffff', 0.5);
  return canvas;
}

/** A four-pointed sparkle with a soft glow, white (tint the sprite), `size` px wide. */
export function paintSparkle(size: number): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  glowAt(ctx, r, r, r, '#ffffff', 0.5);
  ctx.translate(r, r);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const reach = i % 2 === 0 ? r * 0.75 : r * 0.17;
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return canvas;
}

function glowAt(ctx: Ctx, x: number, y: number, radius: number, colour: string, alpha: number): void {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

/**
 * A beam of light, `width` x `height` px: brightest along its middle (white at the core, the tint's colour out to the
 * edges) and fading at both ends. Tint the sprite with the special's colour and stretch it along the line.
 */
export function paintBeam(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = context(canvas);
  const across = ctx.createLinearGradient(0, 0, 0, height);
  across.addColorStop(0, 'rgba(255, 255, 255, 0)');
  across.addColorStop(0.32, 'rgba(255, 255, 255, 0.6)');
  across.addColorStop(0.5, '#ffffff');
  across.addColorStop(0.68, 'rgba(255, 255, 255, 0.6)');
  across.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, width, height);
  const along = ctx.createLinearGradient(0, 0, width, 0);
  along.addColorStop(0, 'rgba(0, 0, 0, 0)');
  along.addColorStop(0.18, '#000');
  along.addColorStop(0.82, '#000');
  along.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}
