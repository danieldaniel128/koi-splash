import { blank, context, fillRadial } from './canvas';
import type { ColorStops } from './canvas';

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

function paintRadial(size: number, stops: ColorStops): HTMLCanvasElement {
  const canvas = blank(size);
  fillRadial(context(canvas), [size / 2, size / 2], [0, size / 2], stops);
  return canvas;
}
