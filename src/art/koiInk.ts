import { drawBlurred } from './blur';
import { blank, context, freshContext } from './canvas';
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

/**
 * Repaints one baked part of a koi (its fins, its body) before it is inked: a special koi's look. `pose` is how that
 * part was baked, so the paint can follow its bend.
 */
export type Dressing = (part: HTMLCanvasElement, pose: BakeOptions) => void;

/** Directions the silhouette is copied in to grow the outline: enough that its edge stays round. */
const OUTLINE_STEPS = 16;
/** A silhouette is drawn over itself this many times, so translucent fins still give a solid outline. */
const SOLID_PASSES = 4;
/** Where the body starts and ends going under, top to bottom of the square (the koi is painted head up). */
const BODY_UNDER = [0.42, 0.74] as const;

/**
 * A koi painted like a mobile casual game piece: an even, dark ink outline so the shape reads crisply at phone
 * size, the fins and tail tinted by the water they're under, and the body outlined over them. Head up, on a square
 * canvas like koiBank's bakeKoi. `dress` repaints the fins and the body before they're inked (see specialKoi).
 * Several canvas passes: bake once, never during play.
 */
export function bakeInkedKoi(
  variety: KoiVariety,
  bake: BakeOptions,
  ink: KoiInk,
  dress?: Dressing,
): HTMLCanvasElement {
  const fins = bakeKoi(variety, { ...bake, parts: 'fins' });
  const body = bakeKoi(variety, { ...bake, parts: 'body' });
  if (dress) {
    // a special koi's look (stripes, rainbow) goes on its paint, under the water's tint and the ink outline; its eyes
    // go back on top
    dress(fins, bake);
    dress(body, bake);
    const eyes = bakeKoi(variety, { ...bake, parts: 'eyes' });
    const ctx = freshContext(body);
    ctx.drawImage(eyes, 0, 0);
    ctx.restore();
  }
  const scale = bake.resolution ?? 1;
  const width = ink.outlineWidth * scale;
  tint(fins, ink.water, ink.finsUnder);
  sinkTail(body, ink.water, ink.tailUnder);

  const canvas = blank(fins.width);
  const ctx = context(canvas);
  ctx.globalAlpha = ink.finOutlineAlpha; // one soft shape: copy by copy, the overlaps would build up to solid ink
  ctx.drawImage(grown(fins, ink.outline, width), 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(fins, 0, 0);
  ctx.drawImage(grown(body, ink.outline, width), 0, 0);
  ctx.drawImage(body, 0, 0);
  return canvas;
}

/** Where a koi meets the water, in the bake's own units (stage px). */
export interface KoiContactShape {
  /** How far out from the body the foam line sits (past the ink outline), and how soft the mask is. */
  readonly gap: number;
  readonly blur: number;
  /** How far around the fins (past their silhouette) the foam keeps clear. */
  readonly finClear: number;
}

/**
 * The part of a koi that breaks the surface (its body, no fins or tail), grown by `gap` px and blurred by `blur` px,
 * as a mask for the water: where the foam hugs the koi. Alpha is the cover; the green channel says where the foam
 * shows: it fades from the head (1) to the tail (0), so the foam is strongest where the koi's back breaks the
 * surface, and drops to 0 over the fins so the line breaks around them instead of covering them. Red and blue are
 * left at full for the game to scale per koi. Head up, centred like bakeKoi, on a canvas padded by
 * contactPadding so the mask fades out before its edge.
 */
export function bakeKoiContact(
  variety: KoiVariety,
  bake: BakeOptions,
  shape: KoiContactShape,
): HTMLCanvasElement {
  const scale = bake.resolution ?? 1;
  const pad = contactPadding(shape, scale);
  const body = padded(bakeKoi(variety, { ...bake, parts: 'body' }), pad);
  const fins = padded(bakeKoi(variety, { ...bake, parts: 'fins' }), pad);
  const canvas = softSilhouette(body, '#ffffff', shape.gap * scale, shape.blur * scale);
  const ctx = context(canvas);
  // only recolour from here on: the cover (alpha) must stay as it is, or the waterline would move to trace the fins
  ctx.globalCompositeOperation = 'source-atop';
  const [from, to] = BODY_UNDER; // where the body goes under, so the foam fades with it
  const koi = body.height - pad * 2;
  const fade = ctx.createLinearGradient(0, pad + koi * from, 0, pad + koi * to);
  fade.addColorStop(0, '#ffffff');
  fade.addColorStop(1, '#ff00ff');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(softSilhouette(fins, '#ff00ff', shape.finClear * scale, shape.blur * scale), 0, 0);
  return canvas;
}

/**
 * How far (px of the bake) a contact mask reaches past the koi's square: its gap and the blur's tail (three standard
 * deviations), so it fades to nothing before the canvas edge instead of being cut off in front of the snout.
 */
function contactPadding(shape: KoiContactShape, resolution: number): number {
  return Math.ceil((shape.gap + shape.blur * 3) * resolution);
}

/** `source` in the middle of a canvas `pad` px bigger on every side. */
function padded(source: HTMLCanvasElement, pad: number): HTMLCanvasElement {
  const canvas = blank(source.width + pad * 2);
  context(canvas).drawImage(source, pad, pad);
  return canvas;
}

/** `source`'s silhouette in `color`, grown by `width` px all round: copies of it moved out every way, on one canvas. */
function grown(source: HTMLCanvasElement, color: string, width: number): HTMLCanvasElement {
  const shape = solid(source, color);
  const canvas = blank(source.width);
  const ctx = context(canvas);
  for (let i = 0; i < OUTLINE_STEPS; i++) {
    const angle = (i / OUTLINE_STEPS) * Math.PI * 2;
    ctx.drawImage(shape, Math.cos(angle) * width, Math.sin(angle) * width);
  }
  ctx.drawImage(shape, 0, 0);
  return canvas;
}

/** `source`'s silhouette in `color`, grown by `grow` px all round and blurred by `blur` px. */
function softSilhouette(
  source: HTMLCanvasElement,
  color: string,
  grow: number,
  blur: number,
): HTMLCanvasElement {
  const canvas = blank(source.width);
  drawBlurred(context(canvas), grown(source, color, grow), [0, 0], blur, color);
  return canvas;
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

/** Tints everything already on a baked koi part toward `color` by `amount`, keeping its alpha. */
function tint(canvas: HTMLCanvasElement, color: string, amount: number): void {
  const ctx = freshContext(canvas);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * The rear of a baked koi body sinks under the surface: tinted toward the water colour, more toward the tail. In
 * plain pixels: in the scale the koi painter leaves behind, the fade would land below the canvas.
 */
function sinkTail(canvas: HTMLCanvasElement, color: string, amount: number): void {
  const ctx = freshContext(canvas);
  const [from, to] = BODY_UNDER;
  const fade = ctx.createLinearGradient(0, canvas.height * from, 0, canvas.height * to);
  fade.addColorStop(0, `${color}00`);
  fade.addColorStop(1, color);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
