/**
 * specialKoi.ts - the special koi, painted on canvases from the board's own koi (after the prototype's looks):
 * - a striped koi: bands of its colour and white running along its body, under the same ink outline
 * - a rainbow koi: its scales recoloured with the spectrum, head to tail (their light and shade kept)
 * - a glossy sheen: frames of a light bar sweeping tail to head, cut to the body, cross-faded at run time
 * - a whirlpool: a dark eddy with tapered arms in the koi's colour and white crests, and the koi curled into its eye
 * Pure canvas work, no framework: bake once, never during play.
 */

type Ctx = CanvasRenderingContext2D;

/** How a striped koi's bands look: the band colour (the other bands are white), how many across, and the fine dark
 * line between them. */
export interface StripeLook {
  readonly band: string;
  readonly line: string;
  readonly count: number;
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
 * Bands of colour and white running along a head-up koi part (its body or its fins), drawn over its paint only
 * ('source-atop'), with a fine dark line between them. A dressing for bakeInkedKoi, so the ink outline goes on top.
 */
export function stripe(part: HTMLCanvasElement, look: StripeLook): void {
  const ctx = fresh(part);
  const bandWidth = (part.width * 0.42) / look.count; // across the body's widest part (a koi's build is chubby)
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.9;
  for (let x = 0, i = 0; x < part.width; x += bandWidth, i++) {
    ctx.fillStyle = (i + Math.floor(part.width / 2 / bandWidth)) % 2 === 0 ? look.band : '#ffffff';
    ctx.fillRect(x, 0, bandWidth + 0.5, part.height);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.line;
  for (let x = 0; x < part.width; x += bandWidth) {
    ctx.fillRect(x - bandWidth * 0.06, 0, bandWidth * 0.12, part.height);
  }
  shade(ctx, part);
  ctx.restore();
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
 * into it, fading out at the rim. Turn the sprite to make it spin.
 */
export function paintWhirlpool(size: number, colour: string): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  ctx.translate(r, r);
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

/**
 * A head-up koi curled round a ring of `radius` px, head leading clockwise, as if swept into a whirlpool's eye: the
 * koi is cut into thin strips along its length and each is laid along the ring.
 */
export function curl(koi: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const size = koi.width;
  const canvas = blank(size);
  const ctx = context(canvas);
  const strips = 48;
  const strip = size / strips;
  ctx.translate(size / 2, size / 2);
  for (let k = strips - 1; k >= 0; k--) {
    // tail first, so the head is drawn over it
    const y = k * strip;
    const along = size / 2 - (y + strip / 2); // + toward the head
    ctx.save();
    ctx.rotate(-(along / radius) * 0.95);
    ctx.drawImage(koi, 0, y, size, strip + 0.6, radius - size / 2, -strip / 2, size, strip + 0.6);
    ctx.restore();
  }
  return canvas;
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
