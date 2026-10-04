import type { Outline } from './outline';

/** How the border's pieces line the shore (px). */
export interface ShoreLook {
  /** A piece's half length along the shore and half depth across it, each random in [min, max]. */
  readonly length: readonly [number, number];
  readonly depth: readonly [number, number];
  /** Space between neighbouring pieces along the shore. */
  readonly gap: number;
  /** How far a piece's centre sits out from the waterline, onto the bank. */
  readonly outward: number;
  /** Pieces on the rounded outer corners are this much bigger, like boulders holding the corners. */
  readonly cornerScale: number;
}

/** One piece of the border: where it sits and its half size (stage px). */
export interface ShorePiece {
  readonly at: [number, number];
  /** Half width and half height: a piece is painted upright, long along the shore. */
  readonly radius: [number, number];
}

/**
 * Pieces all the way round every loop of shore (whatever the border is made of), side by side with no seam: random
 * sizes are drawn until they go round a loop once, then scaled to close it exactly. Sorted top to bottom, so lower
 * pieces are drawn over the ones behind them. O(pieces).
 */
export function ringAlongShore(
  shore: readonly Outline[],
  look: ShoreLook,
  random: () => number,
): ShorePiece[] {
  return shore.flatMap((loop) => ringAlong(loop, look, random)).sort((a, b) => a.at[1] - b.at[1]);
}

function ringAlong(loop: Outline, look: ShoreLook, random: () => number): ShorePiece[] {
  const lengths: number[] = [];
  let total = 0;
  while (total < loop.length) {
    const length = 2 * between(look.length, random) + look.gap;
    lengths.push(length);
    total += length;
  }
  const fit = loop.length / total;
  let along = 0;
  return lengths.map((length) => {
    const span = length * fit;
    const point = loop.at(along + span / 2);
    along += span;
    const grow = point.corner ? look.cornerScale : 1;
    const half = ((span - look.gap) / 2) * grow;
    const depth = between(look.depth, random) * grow;
    const [nx, ny] = point.normal;
    const across = Math.abs(nx); // 1 on the left and right sides, 0 on the top and bottom
    return {
      at: [point.x + nx * look.outward, point.y + ny * look.outward],
      radius: [half * (1 - across) + depth * across, depth * (1 - across) + half * across],
    };
  });
}

function between([min, max]: readonly [number, number], random: () => number): number {
  return min + (max - min) * random();
}
