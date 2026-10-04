import { Random } from '../core/Random';
import { drawShadowOnly } from './blur';

/**
 * pondProps.ts - the things around and on the pond, painted once on a canvas like the koi: stones, lily pads (one
 * carrying a lotus) and reed clumps. Ink-print style: dark shapes with a crisp ink outline, a moonlit rim on the
 * side facing the moon (upper right) and a soft shadow falling away from it. Deterministic from the seed.
 *
 * No framework code: bake a canvas with `bakeProp` and upload it as a texture.
 */

export type PropKind = 'stone' | 'pad' | 'lotus-pad' | 'reeds';

export interface PropPaint {
  readonly kind: PropKind;
  /** Half width and half height of the prop's body (px); for reeds, how far the blades reach. */
  readonly radius: readonly [number, number];
  readonly seed: number;
}

type Ctx = CanvasRenderingContext2D;
type Pt = readonly [number, number];

/** Room around the body for the shadow and the blur. */
const MARGIN = 10;
const TAU = Math.PI * 2;
/** The shadow falls away from the moon (down and to the left). */
const SHADOW_OFFSET: Pt = [-3, 5];
const SHADOW = 'rgba(2, 8, 18, 0.5)';
/** How soft the shadow is (px): the same on every screen. */
const SHADOW_BLUR = 1.5;

const STONE = { lit: '#8ea2c2', top: '#56647f', mid: '#2b364d', dark: '#121928', ink: '#060a13' } as const;
const PAD = {
  rim: '#86c595',
  centre: '#4f9a63',
  edge: '#2a6644',
  vein: 'rgba(190, 235, 190, 0.35)',
  ink: '#0b2618',
};
/** The pads' ink outline (px): as bold as the koi's cartoon outline, so the board reads as one style. */
const PAD_OUTLINE = 1.9;
const LOTUS = { petal: '#f8dbe3', tip: '#e5809f', ink: 'rgba(150, 55, 90, 0.55)', heart: '#f4cf4f' } as const;
const REED = { blade: '#21503a', edge: 'rgba(170, 225, 190, 0.6)', head: '#6b4528' } as const;

/** Paints one prop into a fresh canvas, centred; the canvas is padded for the shadow. */
export function bakeProp(prop: PropPaint, resolution: number): HTMLCanvasElement {
  const width = (prop.radius[0] + MARGIN) * 2;
  const height = (prop.radius[1] + MARGIN) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('pondProps: 2D canvas not available');
  ctx.scale(resolution, resolution);
  ctx.translate(width / 2, height / 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const rng = new Random(prop.seed); // the same seed always paints the same prop
  const random = (): number => rng.next();
  if (prop.kind === 'stone') paintStone(ctx, prop.radius, random);
  else if (prop.kind === 'reeds') paintReeds(ctx, prop.radius[0], random);
  else paintPad(ctx, prop.radius[0], random, prop.kind === 'lotus-pad');
  return canvas;
}

// ---------------------------------------------------------------------------- stones

function paintStone(ctx: Ctx, [rx, ry]: readonly [number, number], random: () => number): void {
  const outline = blob(rx, ry, random);
  paintShadow(ctx, () => {
    trace(ctx, outline);
  });
  // moonlit rim: fill with the light, then cover all but a crescent on the upper right with the body
  trace(ctx, outline);
  ctx.fillStyle = STONE.lit;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const body = ctx.createLinearGradient(rx * 0.6, -ry, -rx * 0.5, ry);
  body.addColorStop(0, STONE.top);
  body.addColorStop(0.45, STONE.mid);
  body.addColorStop(1, STONE.dark);
  ctx.translate(-2.2, 2.2);
  trace(ctx, outline);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.translate(2.2, -2.2);
  dryBrush(ctx, rx, ry, random);
  ctx.restore();
  trace(ctx, outline);
  ctx.strokeStyle = STONE.ink;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

/** A few dark dry-brush strokes across the stone, the way ink prints texture rock. */
function dryBrush(ctx: Ctx, rx: number, ry: number, random: () => number): void {
  ctx.strokeStyle = 'rgba(6, 10, 20, 0.4)';
  for (let i = 0; i < 4; i++) {
    const y = (random() - 0.3) * ry;
    ctx.lineWidth = 0.8 + random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(-rx * (0.3 + random() * 0.5), y);
    ctx.quadraticCurveTo(0, y - ry * 0.25 * random(), rx * (0.2 + random() * 0.5), y + ry * 0.2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------- lily pads and the lotus

function paintPad(ctx: Ctx, radius: number, random: () => number, lotus: boolean): void {
  const notch = random() * TAU;
  const leaf = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, notch + 0.2, notch - 0.2 + TAU);
    ctx.closePath();
  };
  paintShadow(ctx, leaf);
  leaf();
  ctx.fillStyle = PAD.rim;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const body = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
  body.addColorStop(0, PAD.centre);
  body.addColorStop(1, PAD.edge);
  ctx.translate(-1.2, 1.2);
  leaf();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.translate(1.2, -1.2);
  veins(ctx, radius, notch);
  ctx.restore();
  leaf();
  ctx.strokeStyle = PAD.ink;
  ctx.lineWidth = PAD_OUTLINE;
  ctx.stroke();
  if (lotus) paintLotus(ctx, radius * 0.62, random);
}

function veins(ctx: Ctx, radius: number, notch: number): void {
  ctx.strokeStyle = PAD.vein;
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 12; i++) {
    const angle = notch + (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.12, Math.sin(angle) * radius * 0.12);
    ctx.lineTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9);
    ctx.stroke();
  }
}

/**
 * A lily pad on the board carrying a lotus at some stage of opening: 0 is a closed bud (a pink tip in a cup of
 * petals), 1 is the full bloom. Baked once per stage; the board swaps stages as the bud is hit.
 */
export function bakeLotusPad(
  radius: number,
  openness: number,
  seed: number,
  resolution: number,
): HTMLCanvasElement {
  const canvas = bakeProp({ kind: 'pad', radius: [radius, radius], seed }, resolution);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('pondProps: 2D canvas not available');
  ctx.setTransform(resolution, 0, 0, resolution, canvas.width / 2, canvas.height / 2);
  ctx.lineJoin = 'round';
  const rng = new Random(seed + 1);
  paintOpeningLotus(ctx, radius * 0.66, openness, rng.next() * TAU);
  return canvas;
}

/** Petals grow longer and wider and the heart shows as the lotus opens; a closed bud is a tight pink cup. */
function paintOpeningLotus(ctx: Ctx, size: number, openness: number, turn: number): void {
  const open = Math.min(Math.max(openness, 0), 1);
  paintShadow(ctx, () => {
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.6 + 0.3 * open), 0, TAU);
  });
  // even closed, the bud is big enough to spot between the koi
  const outer = size * (0.62 + 0.38 * open);
  const inner = size * (0.5 + 0.18 * open);
  for (let i = 0; i < 8; i++) petal(ctx, turn + (i / 8) * TAU, outer, size * (0.22 + 0.2 * open));
  for (let i = 0; i < 6; i++) petal(ctx, turn + ((i + 0.5) / 6) * TAU, inner, size * (0.2 + 0.14 * open));
  ctx.beginPath();
  ctx.arc(0, 0, size * (0.06 + 0.14 * open), 0, TAU);
  ctx.fillStyle = open > 0.5 ? LOTUS.heart : LOTUS.tip;
  ctx.fill();
}

/** A lotus seen from above: two rings of petals pointing out, pink at the tips, and a golden heart. */
function paintLotus(ctx: Ctx, size: number, random: () => number): void {
  const turn = random() * TAU;
  paintShadow(ctx, () => {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.9, 0, TAU);
  });
  for (let i = 0; i < 8; i++) petal(ctx, turn + (i / 8) * TAU, size, size * 0.42);
  for (let i = 0; i < 6; i++) petal(ctx, turn + ((i + 0.5) / 6) * TAU, size * 0.68, size * 0.34);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, TAU);
  ctx.fillStyle = LOTUS.heart;
  ctx.fill();
}

function petal(ctx: Ctx, angle: number, length: number, width: number): void {
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width, -length * 0.55, 0, -length);
  ctx.quadraticCurveTo(-width, -length * 0.55, 0, 0);
  const fill = ctx.createLinearGradient(0, 0, 0, -length);
  fill.addColorStop(0.2, LOTUS.petal);
  fill.addColorStop(1, LOTUS.tip);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = LOTUS.ink;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------- reeds

/**
 * A clump of reeds seen from above: tapered blades fanning out from the root (toward the top of the canvas; rotate
 * the sprite to lean them over the water), two with seed heads.
 */
function paintReeds(ctx: Ctx, reach: number, random: () => number): void {
  const blades = Array.from({ length: 11 }, () => ({
    angle: -Math.PI / 2 + (random() - 0.5) * 2.6,
    length: reach * (0.55 + random() * 0.45),
    bend: (random() - 0.5) * 0.5,
    width: 2 + random() * 1.6,
  }));
  paintShadow(ctx, () => {
    ctx.beginPath();
    for (const b of blades) bladePath(ctx, b.angle, b.length, b.width, b.bend);
  });
  for (const b of blades) {
    ctx.beginPath();
    bladePath(ctx, b.angle, b.length, b.width, b.bend);
    ctx.fillStyle = REED.blade;
    ctx.fill();
    ctx.strokeStyle = REED.edge;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  for (const b of blades.slice(0, 2)) seedHead(ctx, b.angle, b.length * 0.7);
}

function bladePath(ctx: Ctx, angle: number, length: number, width: number, bend: number): void {
  const along = (d: number, side: number): Pt => {
    const sway = bend * d * d * length;
    return [
      Math.cos(angle) * d * length - Math.sin(angle) * (sway + side),
      Math.sin(angle) * d * length + Math.cos(angle) * (sway + side),
    ];
  };
  const [ax, ay] = along(0, -width / 2);
  const [bx, by] = along(0.55, -width * 0.35);
  const [tx, ty] = along(1, 0);
  const [cx, cy] = along(0.55, width * 0.35);
  const [dx, dy] = along(0, width / 2);
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(bx, by, tx, ty);
  ctx.quadraticCurveTo(cx, cy, dx, dy);
  ctx.closePath();
}

function seedHead(ctx: Ctx, angle: number, distance: number): void {
  ctx.save();
  ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 1.8, 0, 0, TAU);
  ctx.fillStyle = REED.head;
  ctx.fill();
  ctx.strokeStyle = REED.edge;
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------- shared

/** A soft shadow of whatever `shape` traces, cast away from the moon. */
function paintShadow(ctx: Ctx, shape: () => void): void {
  drawShadowOnly(
    ctx,
    () => {
      shape();
      ctx.fillStyle = '#000';
      ctx.fill();
    },
    { blur: SHADOW_BLUR, color: SHADOW, offset: SHADOW_OFFSET },
  );
}

/** A pebble-like outline: an ellipse whose radius swells and dips a little, seeded. */
function blob(rx: number, ry: number, random: () => number): Pt[] {
  const lobes = 2 + Math.floor(random() * 2);
  const phase = random() * TAU;
  return Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * TAU;
    const swell = 1 + 0.06 * Math.sin(angle * lobes + phase) + 0.03 * (random() - 0.5);
    return [Math.cos(angle) * rx * swell, Math.sin(angle) * ry * swell] as const;
  });
}

/** Traces a smooth closed curve through the midpoints of the outline's sides. */
function trace(ctx: Ctx, points: readonly Pt[]): void {
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const last = points[points.length - 1] ?? [0, 0];
  const first = points[0] ?? [0, 0];
  ctx.beginPath();
  ctx.moveTo(...mid(last, first));
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length] ?? first;
    ctx.quadraticCurveTo(point[0], point[1], ...mid(point, next));
  });
  ctx.closePath();
}
