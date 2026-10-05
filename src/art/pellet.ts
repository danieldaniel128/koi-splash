import { blank, context } from './canvas';

/**
 * A fish-food pellet (after the prototype's), `size` px across: a soft warm glow, a brown bead and a highlight on the
 * moon side. Painted once and used as a texture.
 */
export function paintPellet(size: number): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  ctx.translate(r, r);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, 'rgba(255, 207, 122, 0.35)');
  glow.addColorStop(1, 'rgba(255, 207, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-r, -r, size, size);
  ctx.fillStyle = '#c98a3e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe2a8';
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.2, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
