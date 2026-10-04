/**
 * Soft shapes painted once on a canvas and used as textures: firefly glows, the flash and foam crown of a splash and
 * the droplets it throws. Cheap to draw as sprites, so effects never redraw shapes every frame.
 */

/** A soft round glow with a bright core (`core`: share of the radius that's solid white), `size` px wide. */
export function paintGlow(color: string, size: number, core = 0.12): HTMLCanvasElement {
  return paintRadial(size, [
    [0, '#ffffff'],
    [core, color],
    [core + (1 - core) * 0.26, `${color}55`],
    [1, `${color}00`],
  ]);
}

/** A water droplet catching the moon: a solid bright body with a soft rim, on a square canvas `size` px wide. */
export function paintDroplet(color: string, size: number): HTMLCanvasElement {
  return paintRadial(size, [
    [0, '#ffffff'],
    [0.55, color],
    [0.75, `${color}99`],
    [1, `${color}00`],
  ]);
}

/**
 * The foam crown a splash throws up, seen from above: a broken ring of soft strokes of different thickness, with a
 * fainter broken ring just inside it, on a square canvas `size` px wide. `random` picks the breaks.
 */
export function paintCrown(color: string, size: number, random: () => number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.03;
  for (const [radius, width, alpha] of CROWN_RINGS) {
    let angle = random() * Math.PI * 2;
    const end = angle + Math.PI * 2;
    while (angle < end - 0.3) {
      const arc = 0.35 + random() * 0.9;
      ctx.globalAlpha = alpha * (0.6 + random() * 0.4);
      ctx.lineWidth = size * width * (0.5 + random());
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * radius, angle, Math.min(angle + arc, end - 0.3));
      ctx.stroke();
      angle += arc + 0.15 + random() * 0.35;
    }
  }
  return canvas;
}

/** The crown's two broken rings: radius and stroke width (shares of the canvas), strength. */
const CROWN_RINGS: readonly (readonly [number, number, number])[] = [
  [0.4, 0.035, 1],
  [0.3, 0.02, 0.45],
];

function paintRadial(size: number, stops: readonly (readonly [number, string])[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
