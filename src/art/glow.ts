/** Soft glows painted once on a canvas and used as textures (the fireflies), so nothing redraws them per frame. */

/** A soft round glow with a bright core (`core`: share of the radius that's solid white), `size` px wide. */
export function paintGlow(color: string, size: number, core = 0.12): HTMLCanvasElement {
  return paintRadial(size, [
    [0, '#ffffff'],
    [core, color],
    [core + (1 - core) * 0.26, `${color}55`],
    [1, `${color}00`],
  ]);
}

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
