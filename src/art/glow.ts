/**
 * Soft shapes painted once on a canvas and used as textures: firefly glows, the flash and foam of a splash and the
 * droplets it throws. Cheap to draw as sprites, so effects never redraw shapes every frame.
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
 * The foam a koi throws up as it dives, seen from above: soft blobs of different sizes scattered loosely around a
 * centre (more toward the outside, like a crown breaking up), never a clean ring. On a square canvas `size` px wide;
 * `random` places the blobs.
 */
export function paintFoamBurst(color: string, size: number, blobs: number, random: () => number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  const half = size / 2;
  for (let i = 0; i < blobs; i++) {
    const angle = random() * Math.PI * 2;
    const reach = half * (0.25 + 0.5 * Math.sqrt(random()));
    const radius = half * (0.06 + 0.12 * random() * random());
    const x = half + Math.cos(angle) * reach;
    const y = half + Math.sin(angle) * reach;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
    blob.addColorStop(0, color);
    blob.addColorStop(0.5, `${color}cc`);
    blob.addColorStop(1, `${color}00`);
    ctx.fillStyle = blob;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  return canvas;
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
