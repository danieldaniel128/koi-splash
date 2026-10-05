import { blank, context, fillRadial } from './canvas';

/**
 * A fish-food pellet (after the prototype's), `size` px across: a soft warm glow, a brown bead and a highlight on the
 * moon's side (`toMoon`, a unit vector). Painted once and used as a texture.
 */
export function paintPellet(size: number, toMoon: readonly [number, number]): HTMLCanvasElement {
  const canvas = blank(size);
  const ctx = context(canvas);
  const r = size / 2;
  ctx.translate(r, r);
  fillRadial(
    ctx,
    [0, 0],
    [0, r],
    [
      [0, 'rgba(255, 207, 122, 0.35)'],
      [1, 'rgba(255, 207, 122, 0)'],
    ],
  );
  ctx.fillStyle = '#c98a3e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe2a8';
  ctx.beginPath();
  ctx.arc(toMoon[0] * r * 0.28, toMoon[1] * r * 0.28, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
