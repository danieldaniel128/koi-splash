/**
 * backdrop.ts - the scene around the pond, painted once on a canvas: a night sky with stars and the moon, hills going
 * back into the mist, a pagoda on the far hill, and a maple with a paper lantern. The sky always ends just above the
 * pond, so the pond sits on the ground. On a tall phone the garden fills that sky (a maple branch reaching in); on a
 * wide screen the ground beside the pond is dressed too: a maple tree with its lantern on one side, a stone lantern
 * on the other, grass between. Elements are a fixed size in px and are left out where there's no room for them.
 *
 * No framework code: the view bakes it into one texture.
 */

import { GARDEN_ROOM } from '../config/layout';
import { transparent } from './canvas';

type Ctx = CanvasRenderingContext2D;

/** The garden's colours and sizes (px), from the theme. */
export interface BackdropLook {
  readonly sky: { readonly top: string; readonly horizon: string };
  /** Stars: colour, and how many per 10,000 px² of open sky. */
  readonly stars: { readonly color: string; readonly density: number };
  /** The moon: colour, glow, radius, and where it is (share of the width, share of the sky's height). */
  readonly moon: {
    readonly color: string;
    readonly glow: string;
    readonly radius: number;
    readonly at: readonly [number, number];
  };
  /**
   * Hills from the back: colour, how high their tops rise over the horizon and how much they roll (px). The first
   * carries the pagoda, the others trees; `rim` is the moonlight catching the far hill's ridge.
   */
  readonly hills: readonly { readonly color: string; readonly height: number; readonly roll: number }[];
  readonly rim: string;
  readonly trees: string;
  /** Grass on the bank beside the pond (a wide screen): a little lighter than the ground, to show on it. */
  readonly grass: string;
  readonly mist: string;
  /** The pagoda, the branch and the trunk are one ink colour; the lit windows and the lantern are warm. */
  readonly ink: string;
  readonly window: string;
  readonly leaves: string;
  readonly leavesLight: string;
  /** The dark mass of a tree's crown, under its leaves. */
  readonly crown: string;
  readonly lantern: { readonly paper: string; readonly glow: string };
}

/** Where the scene goes on the stage (px): the pond's sides, and where the sky comes out from under the HUD. */
export interface BackdropFrame {
  readonly width: number;
  readonly height: number;
  /** The bottom of the HUD: on a tall phone the moon and the branch hang below it. */
  readonly open: number;
  /** The open ground above the pond ends here (the top of its shore). */
  readonly sceneBottom: number;
  readonly pond: { readonly left: number; readonly right: number };
}

/** How the scene is laid out for a frame: tall (sky above the pond) or wide (the ground beside it dressed too). */
export interface BackdropPlan {
  readonly wide: boolean;
  readonly horizon: number;
  /** How tall the painting is: down to the horizon, or the whole screen when the ground beside the pond is dressed. */
  readonly height: number;
}

/**
 * Tall or wide, for this frame. Either way the horizon is the top of the pond's shore, so the pond sits on the
 * ground; a wide screen also paints the ground beside it. O(1).
 */
export function planBackdrop(frame: BackdropFrame): BackdropPlan {
  const room = Math.min(frame.pond.left, frame.width - frame.pond.right);
  const wide = room >= GARDEN_ROOM.beside;
  return { wide, horizon: frame.sceneBottom, height: wide ? frame.height : frame.sceneBottom };
}

/** The hills are their full height in a sky this tall (px); in a shorter one they shrink with it. */
const FULL_SKY = 170;
/** The bottom of the scene fades out over this many px, so the bank shows through and the two meet softly. */
const FADE = 28;
/** The pagoda's height at scale 1, from its footing to the tip of its spire (px). */
const PAGODA_HEIGHT = 72;
/** The pagoda keeps this far below the top of its sky (px), and is left out rather than shrunk below this scale. */
const PAGODA_MARGIN = 6;
const PAGODA_MIN_SCALE = 0.5;

/**
 * The pagoda's scale standing on `base` (px): as `spot` asks, but small enough that its spire stays this side of the
 * top of the sky (`spot.top`), so it never loses its upper storey; null when it would have to shrink too far (it is
 * left out). O(1).
 */
export function fitPagoda(
  spot: { readonly scale: number; readonly top: number },
  base: number,
): number | null {
  const scale = Math.min(spot.scale, (base - spot.top - PAGODA_MARGIN) / PAGODA_HEIGHT);
  return scale >= PAGODA_MIN_SCALE ? scale : null;
}

/** Paints the whole scene for a frame (the canvas is already scaled to px). */
export function paintBackdrop(
  ctx: Ctx,
  frame: BackdropFrame,
  look: BackdropLook,
  random: () => number,
): void {
  const plan = planBackdrop(frame);
  const { horizon } = plan;
  const spots = plan.wide ? wideSpots(frame, horizon, look) : tallSpots(frame, horizon, look);
  // beside the HUD a wide screen's sky is open from the top; on a phone it starts under the HUD
  const hills = fitHills(look.hills, (horizon - (plan.wide ? 0 : frame.open)) / FULL_SKY);
  paintSky(ctx, frame.width, horizon, look);
  paintStars(ctx, frame.width, horizon - (hills[0]?.height ?? 0), look, random);
  if (spots.moon[1] < horizon - 12) paintMoon(ctx, spots.moon[0], spots.moon[1], look);
  paintLandscape(ctx, { width: frame.width, horizon, hills, spots }, look, random);
  fadeOut(ctx, frame.width, horizon);
  if (plan.wide) paintGround(ctx, frame, horizon, look, random);
}

/** In a short strip of sky the hills shrink with it (down to 40%), so the moon and the garden still show above them. */
function fitHills(hills: BackdropLook['hills'], room: number): BackdropLook['hills'] {
  const shrink = Math.min(1, Math.max(0.4, room));
  return hills.map((hill) => ({ ...hill, height: hill.height * shrink, roll: hill.roll * shrink }));
}

/** The hills from the back, the pagoda on the far one, mist in the valley, trees on the near ones, then the maple. */
function paintLandscape(
  ctx: Ctx,
  scene: { width: number; horizon: number; hills: BackdropLook['hills']; spots: Spots },
  look: BackdropLook,
  random: () => number,
): void {
  const { width, horizon, spots } = scene;
  const [far, ...near] = scene.hills;
  if (far) {
    const ridge = paintHill(ctx, width, horizon, far, random, look.rim);
    const base = ridge(spots.pagoda.x) + 3;
    const scale = fitPagoda(spots.pagoda, base);
    if (spots.garden && scale !== null) paintPagoda(ctx, spots.pagoda.x, base, look, scale);
  }
  paintMist(ctx, width, horizon, look);
  for (const hill of near) {
    const ridge = paintHill(ctx, width, horizon, hill, random);
    if (spots.garden) paintTrees(ctx, width, ridge, look.trees, random);
  }
  if (spots.garden && spots.branch) paintBranch(ctx, spots.branch, look, random);
}

/** Where things stand in the scene. */
interface Spots {
  readonly garden: boolean;
  readonly moon: readonly [number, number];
  /** Where the pagoda stands, its scale, and the top of the sky it stands in (px). */
  readonly pagoda: { readonly x: number; readonly scale: number; readonly top: number };
  /** A maple branch reaching in from the left edge; on a wide screen the maple is a tree on the ground instead. */
  readonly branch: { readonly top: number; readonly reach: number } | null;
}

/** A tall phone: everything in the strip of sky between the HUD and the pond. */
function tallSpots(frame: BackdropFrame, horizon: number, look: BackdropLook): Spots {
  const { open, width } = frame;
  // just under the HUD; low in a short sky, it rises from behind the hills
  const moonY = Math.max(open + look.moon.radius + 8, open + (horizon - open) * look.moon.at[1]);
  return {
    garden: horizon - open >= GARDEN_ROOM.sky,
    moon: [width * look.moon.at[0], moonY],
    pagoda: { x: width * 0.5, scale: Math.min(1.25, (horizon - open) / 140), top: open },
    branch: { top: open + 10, reach: Math.min(width * 0.42, 170) },
  };
}

/** A wide screen: in the strip of sky, the moon over the room right of the pond and a far pagoda left of it. */
function wideSpots(frame: BackdropFrame, horizon: number, look: BackdropLook): Spots {
  const right = frame.pond.right + (frame.width - frame.pond.right) / 2;
  return {
    garden: horizon >= GARDEN_ROOM.sky,
    moon: [right, Math.max(look.moon.radius + 6, horizon * 0.45)],
    pagoda: { x: frame.pond.left * 0.62, scale: Math.min(1.1, horizon / 110), top: 0 },
    branch: null,
  };
}

/**
 * The ground beside the pond on a wide screen: a maple tree with a paper lantern hanging from it on the left, a stone
 * lantern on the right, tufts of grass round them. Each stands on a soft shadow, so it sits on the moss.
 */
function paintGround(
  ctx: Ctx,
  frame: BackdropFrame,
  horizon: number,
  look: BackdropLook,
  random: () => number,
): void {
  const ground = frame.height - horizon;
  const rightRoom = frame.width - frame.pond.right;
  const tree = { x: frame.pond.left * 0.48, y: horizon + ground * 0.72 };
  const stone = { x: frame.pond.right + Math.min(rightRoom * 0.4, 160), y: horizon + ground * 0.66 };
  for (let i = 0; i < 10; i++) {
    const left = i % 2 === 0;
    const x = left
      ? frame.pond.left * (0.12 + random() * 0.76)
      : frame.pond.right + rightRoom * (0.12 + random() * 0.76);
    const y = horizon + ground * (0.35 + random() * 0.6);
    const near = left ? tree : stone;
    // the grass grows round the tree and the lantern, never in front of them
    if (Math.abs(x - near.x) > 40 || y > near.y + 4) paintGrass(ctx, x, y, look, random);
  }
  paintMapleTree(ctx, tree.x, tree.y, Math.min(ground * 0.7, 250), look, random);
  paintStoneLantern(ctx, stone.x, stone.y, look);
}

/** A soft dark oval on the ground under something standing on it. */
function groundShadow(ctx: Ctx, x: number, y: number, width: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.28);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, width);
  shade.addColorStop(0, 'rgba(2, 8, 18, 0.55)');
  shade.addColorStop(1, 'rgba(2, 8, 18, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(-width, -width, width * 2, width * 2);
  ctx.restore();
}

/**
 * A maple tree standing on (x, base), `height` px tall: a leaning trunk forking into limbs, red leaves clustered
 * round their tips (a few lighter for depth), and a paper lantern hanging from the lowest limb.
 */
function paintMapleTree(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  theme: BackdropLook,
  random: () => number,
): void {
  groundShadow(ctx, x, base, height * 0.45);
  const fork: readonly [number, number] = [x + height * 0.06, base - height * 0.45];
  const tips: readonly (readonly [number, number])[] = [
    [x - height * 0.32, base - height * 0.7],
    [x - height * 0.1, base - height * 0.92],
    [x + height * 0.16, base - height * 0.98],
    [x + height * 0.34, base - height * 0.78],
  ];
  ctx.strokeStyle = theme.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(6, height * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - height * 0.05, base - height * 0.25, fork[0], fork[1]);
  ctx.stroke();
  ctx.lineWidth = Math.max(3, height * 0.025);
  for (const [tx, ty] of tips) {
    ctx.beginPath();
    ctx.moveTo(fork[0], fork[1]);
    ctx.quadraticCurveTo((fork[0] + tx) / 2, ty + height * 0.12, tx, ty);
    ctx.stroke();
  }
  for (const [tx, ty] of tips) canopy(ctx, tx, ty, height * 0.22, theme, random);
  const [lx, ly] = tips[3] ?? fork;
  paintLantern(ctx, lx - height * 0.06, ly + height * 0.08, theme);
}

/**
 * A cluster of maple leaves round a limb's tip: a soft dark crown for its mass, then the leaves, darker ones first so
 * the lighter ones sit on top.
 */
function canopy(
  ctx: Ctx,
  x: number,
  y: number,
  radius: number,
  theme: BackdropLook,
  random: () => number,
): void {
  ctx.fillStyle = theme.crown;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 5; i++) {
    const angle = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * radius * 0.45,
      y + Math.sin(angle) * radius * 0.35,
      radius * 0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 46; i++) {
    const angle = random() * Math.PI * 2;
    const reach = Math.sqrt(random()) * radius;
    const color = i > 32 ? theme.leavesLight : theme.leaves;
    leaf(
      ctx,
      x + Math.cos(angle) * reach,
      y + Math.sin(angle) * reach * 0.8,
      5 + random() * 4,
      random() * 6.3,
      color,
    );
  }
}

function paintSky(ctx: Ctx, width: number, horizon: number, look: BackdropLook): void {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, look.sky.top);
  sky.addColorStop(1, look.sky.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);
}

/** Tiny dots, a few brighter ones with a cross of light. */
function paintStars(ctx: Ctx, width: number, bottom: number, look: BackdropLook, random: () => number): void {
  const count = Math.round(((width * Math.max(bottom, 0)) / 10000) * look.stars.density);
  ctx.fillStyle = look.stars.color;
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * bottom;
    const size = 0.4 + random() * random() * 1.2;
    ctx.globalAlpha = 0.35 + random() * 0.65;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (size > 1.2) ctx.fillRect(x - size * 2.5, y - 0.3, size * 5, 0.6);
    if (size > 1.2) ctx.fillRect(x - 0.3, y - size * 2.5, 0.6, size * 5);
  }
  ctx.globalAlpha = 1;
}

/** The full moon: a soft glow, the disc, and a few faint seas on it. */
function paintMoon(ctx: Ctx, x: number, y: number, look: BackdropLook): void {
  const { radius, color, glow } = look.moon;
  const halo = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 3.2);
  halo.addColorStop(0, glow);
  halo.addColorStop(1, transparent(glow));
  ctx.fillStyle = halo;
  ctx.fillRect(x - radius * 3.2, y - radius * 3.2, radius * 6.4, radius * 6.4);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'rgba(120, 110, 90, 0.12)';
  for (const [dx, dy, r] of [
    [-0.3, -0.2, 0.28],
    [0.25, 0.1, 0.2],
    [-0.05, 0.4, 0.16],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * radius, y + dy * radius, r * radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A rolling hill from edge to edge, its top a sum of a few slow waves, filled down past the horizon. Returns its
 * top's height at any x, so things can stand on it.
 */
function paintHill(
  ctx: Ctx,
  width: number,
  horizon: number,
  hill: BackdropLook['hills'][number],
  random: () => number,
  rim?: string,
): (x: number) => number {
  const waves = [0, 1, 2].map((i) => ({ length: (220 + random() * 160) / (i + 1), phase: random() * 6.3 }));
  const top = (x: number): number =>
    horizon -
    hill.height +
    waves.reduce((sum, w, i) => sum + Math.sin(x / w.length + w.phase) * (hill.roll / (i + 1)), 0);
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= width; x += 4) ctx.lineTo(x, top(x));
  ctx.lineTo(width, horizon);
  ctx.closePath();
  ctx.fillStyle = hill.color;
  ctx.fill();
  if (rim) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) ctx.lineTo(x, top(x) + 0.75);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  return top;
}

/** Round clumps of trees along a hill's ridge, every few dozen px, in silhouette. */
function paintTrees(
  ctx: Ctx,
  width: number,
  ridge: (x: number) => number,
  color: string,
  random: () => number,
): void {
  ctx.fillStyle = color;
  for (let x = random() * 30; x < width; x += 26 + random() * 34) {
    const base = ridge(x) + 4;
    const size = 6 + random() * 7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        x + (i - 1) * size * 0.7,
        base - size * (i === 1 ? 1.1 : 0.7),
        size * (i === 1 ? 1 : 0.75),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

/** A pale band of mist lying in the valley between the hills. */
function paintMist(ctx: Ctx, width: number, horizon: number, theme: BackdropLook): void {
  const band = ctx.createLinearGradient(0, horizon - 60, 0, horizon);
  band.addColorStop(0, transparent(theme.mist));
  band.addColorStop(0.6, theme.mist);
  band.addColorStop(1, transparent(theme.mist));
  ctx.fillStyle = band;
  ctx.fillRect(0, horizon - 60, width, 60);
}

/** A three-roofed pagoda standing on (x, base): slim storeys under wide roofs whose eaves curl up, two windows lit. */
function paintPagoda(ctx: Ctx, x: number, base: number, theme: BackdropLook, scale: number): void {
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(scale, scale);
  ctx.fillStyle = theme.ink;
  ctx.fillRect(-12, -3, 24, 3); // the stone footing
  let y = -3;
  for (let tier = 0; tier < 3; tier++) {
    const storey = 8 - tier * 1.5;
    ctx.fillRect(-storey, y - 9, storey * 2, 9);
    if (tier < 2) {
      ctx.fillStyle = theme.window;
      ctx.fillRect(-3.5, y - 7, 2.5, 4);
      ctx.fillRect(1, y - 7, 2.5, 4);
      ctx.fillStyle = theme.ink;
    }
    roof(ctx, y - 9, 19 - tier * 3.5);
    y -= 19;
  }
  ctx.fillRect(-1, y - 12, 2, 14); // the spire, with two rings
  ctx.fillRect(-2.5, y - 4, 5, 1.5);
  ctx.fillRect(-2, y - 8, 4, 1.5);
  ctx.restore();
}

/** One roof sitting on y: a flat underside, eaves curling up at both tips, and a concave top up to the ridge. */
function roof(ctx: Ctx, y: number, half: number): void {
  ctx.beginPath();
  ctx.moveTo(-half - 4, y - 7);
  ctx.quadraticCurveTo(-half * 0.8, y, -half * 0.55, y);
  ctx.lineTo(half * 0.55, y);
  ctx.quadraticCurveTo(half * 0.8, y, half + 4, y - 7);
  ctx.quadraticCurveTo(half * 0.45, y - 7, half * 0.2, y - 12);
  ctx.lineTo(-half * 0.2, y - 12);
  ctx.quadraticCurveTo(-half * 0.45, y - 7, -half - 4, y - 7);
  ctx.closePath();
  ctx.fill();
}

/** A maple branch reaching in from the left edge just under `top`, leaves along it, and a paper lantern hanging from it. */
function paintBranch(
  ctx: Ctx,
  spot: NonNullable<Spots['branch']>,
  theme: BackdropLook,
  random: () => number,
): void {
  const y = spot.top + 30;
  const { reach } = spot;
  ctx.strokeStyle = theme.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-10, y - 30);
  ctx.quadraticCurveTo(reach * 0.45, y - 4, reach, y + 6);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(reach * 0.5, y - 2);
  ctx.quadraticCurveTo(reach * 0.62, y - 26, reach * 0.8, y - 30);
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const t = 0.2 + random() * 0.8;
    const lx = t * reach + (random() - 0.5) * 22;
    const ly = y - 30 * (1 - t) * (1 - t) + 6 * t + (random() - 0.5) * 26;
    leaf(ctx, lx, ly, 5 + random() * 3, random() * 6.3, theme.leaves);
  }
  paintLantern(ctx, reach * 0.78, y + 2, theme);
}

/** A five-pointed maple leaf. */
function leaf(ctx: Ctx, x: number, y: number, size: number, turn: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** A round paper lantern on a string, glowing warm. */
function paintLantern(ctx: Ctx, x: number, from: number, theme: BackdropLook): void {
  const y = from + 26;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 46);
  glow.addColorStop(0, theme.lantern.glow);
  glow.addColorStop(1, transparent(theme.lantern.glow));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 46, y - 46, 92, 92);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, from);
  ctx.lineTo(x, y - 11);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = theme.lantern.paper;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 60, 20, 0.45)';
  ctx.lineWidth = 0.8;
  for (const dx of [-4.5, 0, 4.5]) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(dx) + 0.5, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = theme.ink;
  ctx.fillRect(x - 5, y - 13, 10, 3);
  ctx.fillRect(x - 5, y + 10, 10, 3);
}

/**
 * A stone lantern (a tōrō) standing on (x, base): a footing, a post, the light box with its window glowing warm, a
 * wide cap with turned-up corners and a knob on top.
 */
function paintStoneLantern(ctx: Ctx, x: number, base: number, theme: BackdropLook): void {
  groundShadow(ctx, x, base, 46);
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(1.6, 1.6);
  const glow = ctx.createRadialGradient(0, -44, 3, 0, -44, 50);
  glow.addColorStop(0, theme.lantern.glow);
  glow.addColorStop(1, transparent(theme.lantern.glow));
  ctx.fillStyle = glow;
  ctx.fillRect(-50, -94, 100, 100);
  ctx.fillStyle = theme.ink;
  ctx.fillRect(-14, -6, 28, 6); // the footing
  ctx.fillRect(-5, -30, 10, 24); // the post
  ctx.fillRect(-13, -34, 26, 5); // the shelf under the light
  ctx.fillRect(-10, -54, 20, 20); // the light box
  ctx.fillStyle = theme.lantern.paper;
  ctx.fillRect(-5, -49, 10, 11); // its window, lit
  ctx.fillStyle = theme.ink;
  roof(ctx, -54, 15);
  ctx.beginPath();
  ctx.arc(0, -68, 3.5, 0, Math.PI * 2); // the knob on top
  ctx.fill();
  ctx.restore();
}

/** A tuft of grass blades fanning up from (x, base). */
function paintGrass(ctx: Ctx, x: number, base: number, theme: BackdropLook, random: () => number): void {
  ctx.strokeStyle = theme.grass;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const lean = (i - 3) * 0.22 + (random() - 0.5) * 0.2;
    const tall = 10 + random() * 12;
    ctx.beginPath();
    ctx.moveTo(x + (i - 3) * 1.5, base);
    ctx.quadraticCurveTo(x + lean * tall * 0.4, base - tall * 0.6, x + lean * tall, base - tall);
    ctx.stroke();
  }
}

/** Erases the last stretch above the horizon gradually, so the bank's pattern shows through where they meet. */
function fadeOut(ctx: Ctx, width: number, horizon: number): void {
  const fade = ctx.createLinearGradient(0, horizon - FADE, 0, horizon);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, horizon - FADE, width, FADE);
  ctx.restore();
}
