import { paintStone } from './pondProps';

/**
 * Paints one piece of the pond's border (a stone, a plank, a bush...) centred on the canvas origin, upright, within
 * its half size (px). The same piece is never asked for twice, so it can use `random` to look unique.
 */
export type ShorePainter = (
  ctx: CanvasRenderingContext2D,
  radius: readonly [number, number],
  random: () => number,
) => void;

/**
 * The looks a pond's border can have, by name. To add one, write a painter for a single piece and list it here;
 * POND.shore.style picks which one a pond uses. Where the pieces go (and how big they are) is not the painter's
 * business: see ringAlongShore.
 */
export const SHORE_STYLES = {
  stones: paintStone,
} as const satisfies Record<string, ShorePainter>;

export type ShoreStyle = keyof typeof SHORE_STYLES;
