import type { ShoreStyle } from '../config/pond';
import { paintStone } from './pondProps';
import type { PropLook } from './pondProps';

/**
 * Paints one piece of the pond's border (a stone, a plank, a bush...) centred on the canvas origin, upright, within
 * its half size (px), lit as `look` says. The same piece is never asked for twice, so it can use `random` to look
 * unique.
 */
export type ShorePainter = (
  ctx: CanvasRenderingContext2D,
  radius: readonly [number, number],
  random: () => number,
  look: PropLook,
) => void;

/**
 * The looks a pond's border can have, by name (Strategy). To add one, name it in ShoreStyle (src/config/pond.ts):
 * the compiler then asks for its painter here, one piece at a time. POND.shore.style picks which one a pond uses.
 * Where the pieces go (and how big they are) is not the painter's business: see ringAlongShore.
 */
export const SHORE_STYLES: Readonly<Record<ShoreStyle, ShorePainter>> = {
  stones: paintStone,
};
