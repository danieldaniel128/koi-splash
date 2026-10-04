import { bakeKoi } from './koiBank';
import type { BakeOptions, KoiVariety } from './koiBank';

/** How a koi is inked and set in the water. Widths are in the bake's own units (stage px); colours are CSS. */
export interface KoiInk {
  /** The cartoon outline: one even, solid stroke around the body, and a softer one around the fins and tail. */
  readonly outline: string;
  readonly outlineWidth: number;
  readonly finOutlineAlpha: number;
  /**
   * The fins and tail sit under the surface: they take on this much (0..1) of the water colour, and the rear of the
   * body sinks into it too (a smaller share), so only the head and back break the surface.
   */
  readonly water: string;
  readonly finsUnder: number;
  readonly tailUnder: number;
}

/** Directions the silhouette is copied in to grow the outline: enough that its edge stays round. */
const OUTLINE_STEPS = 16;
/** A silhouette is drawn over itself this many times, so translucent fins still give a solid outline. */
const SOLID_PASSES = 4;
/** Where the body starts and ends going under, top to bottom of the square (the koi is painted head up). */
const BODY_UNDER = [0.42, 0.74] as const;

/**
 * A koi painted like a mobile casual game piece: an even, dark ink outline so the shape reads crisply at phone
 * size, the fins and tail tinted by the water they're under, and the body outlined over them. Head up, on a square
 * canvas like koiBank's bakeKoi. Several canvas passes: bake once, never during play.
 */
export function bakeInkedKoi(variety: KoiVariety, bake: BakeOptions, ink: KoiInk): HTMLCanvasElement {
  const fins = bakeKoi(variety, { ...bake, parts: 'fins' });
  const body = bakeKoi(variety, { ...bake, parts: 'body' });
  const scale = bake.resolution ?? 1;
  const width = ink.outlineWidth * scale;
  tint(fins, ink.water, ink.finsUnder);
  sinkTail(body, ink.water, ink.tailUnder);

  const canvas = blank(fins.width);
  const ctx = context(canvas);
  ctx.globalAlpha = ink.finOutlineAlpha;
  outline(ctx, fins, ink.outline, width);
  ctx.globalAlpha = 1;
  ctx.drawImage(fins, 0, 0);
  outline(ctx, body, ink.outline, width);
  ctx.drawImage(body, 0, 0);
  return canvas;
}

/**
 * The part of a koi that breaks the surface (its body, no fins or tail), grown by `gap` px and blurred by `blur` px,
 * as a mask for the water: where the foam hugs the koi. Alpha is the cover; the green channel fades from the head
 * (1) to the tail (0), so the foam is strongest where the koi's back breaks the surface. Red and blue are left at
 * full for the game to scale per koi. Head up, on a square canvas like bakeKoi.
 */
export function bakeKoiContact(variety: KoiVariety, bake: BakeOptions, gap: number, blur: number): HTMLCanvasElement {
  const scale = bake.resolution ?? 1;
  const body = bakeKoi(variety, { ...bake, parts: 'body' });
  const grown = blank(body.width);
  outline(context(grown), body, '#ffffff', gap * scale);
  context(grown).drawImage(solid(body, '#ffffff'), 0, 0);

  const canvas = blank(body.width);
  const ctx = context(canvas);
  ctx.filter = `blur(${blur * scale}px)`;
  ctx.drawImage(grown, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-atop';
  const fade = ctx.createLinearGradient(0, body.height * 0.4, 0, body.height * 0.72);
  fade.addColorStop(0, '#ffffff');
  fade.addColorStop(1, '#ff00ff');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Draws `source`'s silhouette in `color`, grown by `width` px all round, under whatever is drawn next. */
function outline(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, color: string, width: number): void {
  const shape = solid(source, color);
  for (let i = 0; i < OUTLINE_STEPS; i++) {
    const angle = (i / OUTLINE_STEPS) * Math.PI * 2;
    ctx.drawImage(shape, Math.cos(angle) * width, Math.sin(angle) * width);
  }
}

/** `source`'s silhouette, nearly opaque even where it's translucent, filled with one colour. */
function solid(source: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const canvas = blank(source.width);
  const ctx = context(canvas);
  for (let i = 0; i < SOLID_PASSES; i++) ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Tints everything already on the canvas toward `color` by `amount`, keeping its alpha. */
function tint(canvas: HTMLCanvasElement, color: string, amount: number): void {
  const ctx = context(canvas);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** The rear of the body sinks under the surface: tinted toward the water colour, more toward the tail. */
function sinkTail(canvas: HTMLCanvasElement, color: string, amount: number): void {
  const ctx = context(canvas);
  const [from, to] = BODY_UNDER;
  const fade = ctx.createLinearGradient(0, canvas.height * from, 0, canvas.height * to);
  fade.addColorStop(0, `${color}00`);
  fade.addColorStop(1, color);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function blank(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  return ctx;
}
