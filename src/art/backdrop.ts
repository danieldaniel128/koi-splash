/**
 * backdrop.ts - the scene above the pond, painted once on a canvas: a night sky with stars and the moon, hills going
 * back into the mist, a pagoda on the far hill, and a maple branch with a paper lantern hanging from it. Every
 * element sits on the horizon (the bottom of the scene) at a fixed size in px, and is left out when the scene is
 * too short for it, so a tall phone gets the whole garden and a desktop a strip of sky.
 *
 * No framework code: the view bakes it into one texture.
 */

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
  readonly mist: string;
  /** The pagoda, the branch and the trunk are one ink colour; the lit windows and the lantern are warm. */
  readonly ink: string;
  readonly window: string;
  readonly leaves: string;
  readonly lantern: { readonly paper: string; readonly glow: string };
}

/** Below this much open sky (px), the pagoda, the branch and the lantern are left out. */
const GARDEN_MIN = 120;
/** The bottom of the scene fades out over this many px, so the bank shows through and the two meet softly. */
const FADE = 28;

/** Paints the whole scene into `width` x `horizon` px (the canvas is already scaled to px). */
export function paintBackdrop(
  ctx: Ctx,
  width: number,
  horizon: number,
  look: BackdropLook,
  random: () => number,
): void {
  paintSky(ctx, width, horizon, look);
  paintStars(ctx, width, horizon - (look.hills[0]?.height ?? 0), look, random);
  paintMoon(ctx, width * look.moon.at[0], Math.max(look.moon.radius + 6, horizon * look.moon.at[1]), look);
  const garden = horizon >= GARDEN_MIN;
  const [far, ...near] = look.hills;
  if (far) {
    const ridge = paintHill(ctx, width, horizon, far, random, look.rim);
    if (garden) paintPagoda(ctx, width * 0.5, ridge(width * 0.5) + 3, look, Math.min(1.25, horizon / 190));
  }
  paintMist(ctx, width, horizon, look);
  for (const hill of near) {
    const ridge = paintHill(ctx, width, horizon, hill, random);
    if (garden) paintTrees(ctx, width, ridge, look.trees, random);
  }
  if (garden) paintBranch(ctx, width, horizon, look, random);
  fadeOut(ctx, width, horizon);
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
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
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
  band.addColorStop(0, 'rgba(0, 0, 0, 0)');
  band.addColorStop(0.6, theme.mist);
  band.addColorStop(1, 'rgba(0, 0, 0, 0)');
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

/** A maple branch reaching in from the left edge, leaves along it, and a paper lantern hanging from its tip. */
function paintBranch(
  ctx: Ctx,
  width: number,
  horizon: number,
  theme: BackdropLook,
  random: () => number,
): void {
  const y = Math.max(78, horizon * 0.42);
  const reach = Math.min(width * 0.42, 170);
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
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
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
