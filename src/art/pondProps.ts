import type { PondProp } from '../config/pond';
import { seeded } from '../core/Random';
import { drawShadowOnly } from './blur';
import { blank, centerOn, context, traceSmoothClosed } from './canvas';
import type { CanvasPoint } from './canvas';

/**
 * pondProps.ts - the things around and on the pond, painted once on a canvas like the koi: stones, and lily pads
 * with a lotus opening on them. Ink-print style: dark shapes with a crisp ink outline, a moonlit rim on the
 * side facing the moon (upper right) and a soft shadow falling away from it. Deterministic from the seed.
 *
 * No framework code: bake a canvas with `bakeProp` and upload it as a texture.
 */

/** What the painter needs of a prop (see PondProp): what it is, its half size (px) and its paint seed. */
export type PropPaint = Pick<PondProp, 'kind' | 'radius' | 'seed'>;

/** Paints a piece centered on the canvas origin, in its own px. */
export type Painter = (ctx: CanvasRenderingContext2D) => void;

/**
 * How the stones and pads are lit and inked, from the scene: the way toward the moon and the color of the shadows it
 * casts, how far from a prop its shadow falls and how dark (px, 0..1), and the pads' ink outline (px), as bold as
 * the koi's so the board reads as one style.
 */
export interface PropLook {
  readonly light: { readonly dir: readonly [number, number]; readonly shadow: string };
  readonly shadow: { readonly distance: number; readonly alpha: number };
  readonly padOutline: number;
}

/** Room around the body for the shadow and the blur. */
const MARGIN = 10;
const TAU = Math.PI * 2;
/** How soft the shadow is (px): the same on every screen. */
const SHADOW_BLUR = 1.5;

/** Pale river stone in moonlight: a cream top face, a darker side, a bold warm-dark outline like the koi's. */
const STONE = {
  top: '#e4dccd',
  topShade: '#bfb3a0',
  side: '#8d8273',
  sideShade: '#6d6458',
  shine: 'rgba(255, 252, 240, 0.7)',
  ink: '#241f26',
} as const;
/** The stones' outline (px) and how thick a stone stands (share of its half height): chunky, like toy blocks. */
const STONE_OUTLINE = 2.2;
const STONE_DEPTH = 0.42;
const PAD = {
  rim: '#86c595',
  centre: '#4f9a63',
  edge: '#2a6644',
  vein: 'rgba(190, 235, 190, 0.35)',
  ink: '#0b2618',
};
/** How far the pad's lit rim shows on its moon side (px). */
const PAD_RIM = 1.5;
const LOTUS = { petal: '#f8dbe3', tip: '#e5809f', ink: 'rgba(150, 55, 90, 0.55)', heart: '#f4cf4f' } as const;

/** Paints one prop into a fresh canvas, centred; the canvas is padded for the shadow. */
export function bakeProp(prop: PropPaint, resolution: number, look: PropLook): HTMLCanvasElement {
  const random = seeded(prop.seed); // the same seed always paints the same prop
  return bakePiece(prop.radius, resolution, (ctx) => {
    if (prop.kind === 'stone') paintStone(ctx, prop.radius, random, look);
    else paintPad(ctx, prop.radius[0], random, look);
  });
}

/** The canvas size (px) a piece of this half size needs: its body plus room for the shadow. */
export function pieceSize([rx, ry]: readonly [number, number]): { width: number; height: number } {
  return { width: (rx + MARGIN) * 2, height: (ry + MARGIN) * 2 };
}

/** Runs `paint` centred on a fresh canvas sized for a piece of this half size, at `resolution` pixels per px. */
export function bakePiece(
  radius: readonly [number, number],
  resolution: number,
  paint: Painter,
): HTMLCanvasElement {
  const { width, height } = pieceSize(radius);
  const canvas = blank(width * resolution, height * resolution);
  const ctx = context(canvas);
  centerOn(ctx, (width * resolution) / 2, (height * resolution) / 2, resolution);
  paint(ctx);
  return canvas;
}

// ---------------------------------------------------------------------------- stones

/**
 * A chunky stone seen from above and a little in front, like the shore of a cartoon pond: a rounded slab whose top
 * face catches the light, standing on a darker side band, all in one bold outline. Always drawn upright (the light
 * comes from above), so stones along any side of the pond read the same.
 */
export function paintStone(
  ctx: CanvasRenderingContext2D,
  [rx, ry]: readonly [number, number],
  random: () => number,
  look: PropLook,
): void {
  const depth = ry * STONE_DEPTH;
  const face = slab(rx, ry - depth / 2, random);
  const lift = -depth / 2; // the top face sits up, the side shows below it
  const extrude = (paint: () => void): void => {
    for (let step = 0; step <= 6; step++) {
      ctx.save();
      ctx.translate(0, lift + (depth * step) / 6);
      traceSmoothClosed(ctx, face);
      paint();
      ctx.restore();
    }
  };
  paintShadow(ctx, look, () => {
    ctx.beginPath();
    ctx.ellipse(0, depth * 0.3, rx, ry - depth * 0.2, 0, 0, TAU);
  });
  // the outline: the whole stone stroked fat, then filled over so only the outer edge stays
  extrude(() => {
    ctx.strokeStyle = STONE.ink;
    ctx.lineWidth = STONE_OUTLINE * 2;
    ctx.stroke();
  });
  const side = ctx.createLinearGradient(0, lift, 0, ry);
  side.addColorStop(0, STONE.side);
  side.addColorStop(1, STONE.sideShade);
  extrude(() => {
    ctx.fillStyle = side;
    ctx.fill();
  });
  ctx.save();
  ctx.translate(0, lift);
  paintFace(ctx, face, rx, ry - depth / 2);
  ctx.restore();
}

/** The stone's top face: cream, shading away from the light, with a soft shine near the top edge. */
function paintFace(
  ctx: CanvasRenderingContext2D,
  face: readonly CanvasPoint[],
  rx: number,
  ry: number,
): void {
  const fill = ctx.createLinearGradient(rx * 0.3, -ry, -rx * 0.4, ry);
  fill.addColorStop(0, STONE.top);
  fill.addColorStop(0.55, STONE.top);
  fill.addColorStop(1, STONE.topShade);
  traceSmoothClosed(ctx, face);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(36, 31, 38, 0.35)'; // a soft line where the top face turns into the side
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(rx * 0.15, -ry * 0.45, rx * 0.45, ry * 0.18, -0.08, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = STONE.shine;
  ctx.lineWidth = Math.max(1.2, ry * 0.16);
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ---------------------------------------------------------------------------- lily pads and the lotus

function paintPad(ctx: CanvasRenderingContext2D, radius: number, random: () => number, look: PropLook): void {
  const notch = random() * TAU;
  const leaf = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, notch + 0.2, notch - 0.2 + TAU);
    ctx.closePath();
  };
  paintShadow(ctx, look, leaf);
  leaf();
  ctx.fillStyle = PAD.rim;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const body = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
  body.addColorStop(0, PAD.centre);
  body.addColorStop(1, PAD.edge);
  const [towardX, towardY] = look.light.dir;
  ctx.translate(-towardX * PAD_RIM, -towardY * PAD_RIM); // the lighter rim shows on the moon's side
  leaf();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.translate(towardX * PAD_RIM, towardY * PAD_RIM);
  veins(ctx, radius, notch);
  ctx.restore();
  leaf();
  ctx.strokeStyle = PAD.ink;
  ctx.lineWidth = look.padOutline;
  ctx.stroke();
}

function veins(ctx: CanvasRenderingContext2D, radius: number, notch: number): void {
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
  look: PropLook,
): HTMLCanvasElement {
  const pad = seeded(seed); // the pad's own seed, as bakeProp paints it
  const lotus = seeded(seed + 1);
  return bakePiece([radius, radius], resolution, (ctx) => {
    paintPad(ctx, radius, pad, look);
    paintOpeningLotus(ctx, radius * 0.66, { openness, turn: lotus() * TAU }, look);
  });
}

/** Petals grow longer and wider and the heart shows as the lotus opens; a closed bud is a tight pink cup. */
function paintOpeningLotus(
  ctx: CanvasRenderingContext2D,
  size: number,
  { openness, turn }: { openness: number; turn: number },
  look: PropLook,
): void {
  const open = Math.min(Math.max(openness, 0), 1);
  paintShadow(ctx, look, () => {
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

function petal(ctx: CanvasRenderingContext2D, angle: number, length: number, width: number): void {
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

// ---------------------------------------------------------------------------- shared

/** A soft shadow of whatever `shape` traces, cast away from the moon. */
function paintShadow(ctx: CanvasRenderingContext2D, look: PropLook, shape: () => void): void {
  const [towardX, towardY] = look.light.dir;
  const { distance, alpha } = look.shadow;
  const fill = (): void => {
    shape();
    ctx.fillStyle = '#000';
    ctx.fill();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  drawShadowOnly(ctx, fill, {
    blur: SHADOW_BLUR,
    color: look.light.shadow,
    offset: [-towardX * distance, -towardY * distance],
  });
  ctx.restore();
}

/**
 * A slab's outline: a rounded rectangle (a superellipse) with gently lumpy sides, seeded. Squarer than a pebble, so a
 * row of them packs like a stone border.
 */
function slab(rx: number, ry: number, random: () => number): CanvasPoint[] {
  const lumps = 2 + Math.floor(random() * 3);
  const phase = random() * TAU;
  const square = 2 / (2.6 + random() * 1.2); // 2 / exponent: lower is squarer
  return Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * TAU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const swell = 1 + 0.05 * Math.sin(angle * lumps + phase) + 0.025 * (random() - 0.5);
    return {
      x: Math.sign(cos) * Math.abs(cos) ** square * rx * swell,
      y: Math.sign(sin) * Math.abs(sin) ** square * ry * swell,
    };
  });
}
