import type { Rect } from './gameLayout';

/** How the border's pieces line the shore (px). */
export interface ShoreLook {
  /** The pond's corner radius: the pieces follow the same rounded outline as the water. */
  readonly cornerRadius: number;
  /** A piece's half length along the shore and half depth across it, each random in [min, max]. */
  readonly length: readonly [number, number];
  readonly depth: readonly [number, number];
  /** Space between neighbouring pieces along the shore. */
  readonly gap: number;
  /** How far a piece's centre sits out from the waterline, onto the bank. */
  readonly outward: number;
  /** Pieces on the rounded corners are this much bigger, like boulders holding the corners. */
  readonly cornerScale: number;
}

/** One piece of the border: where it sits and its half size (stage px). */
export interface ShorePiece {
  readonly at: [number, number];
  /** Half width and half height: a piece is painted upright, long along the shore. */
  readonly radius: [number, number];
}

/** A point on the shore and the way out of the water there. */
interface ShorePoint {
  readonly x: number;
  readonly y: number;
  readonly normal: readonly [number, number];
  readonly corner: boolean;
}

/**
 * A ring of pieces all the way round the pond (whatever the border is made of), side by side along its rounded
 * outline with no seam: random sizes are drawn until they go round once, then all are scaled to close the ring
 * exactly. Sorted top to bottom, so lower pieces are drawn over the ones behind them. O(pieces).
 */
export function ringAlongShore(pond: Rect, look: ShoreLook, random: () => number): ShorePiece[] {
  const outline = roundedOutline(pond, look.cornerRadius);
  const lengths: number[] = [];
  let total = 0;
  while (total < outline.length) {
    const length = 2 * between(look.length, random) + look.gap;
    lengths.push(length);
    total += length;
  }
  const fit = outline.length / total;
  let along = 0;
  const pieces = lengths.map((length) => {
    const span = length * fit;
    const point = outline.at(along + span / 2);
    along += span;
    const grow = point.corner ? look.cornerScale : 1;
    const half = ((span - look.gap) / 2) * grow;
    const depth = between(look.depth, random) * grow;
    const [nx, ny] = point.normal;
    const across = Math.abs(nx); // 1 on the left and right sides, 0 on the top and bottom
    return {
      at: [point.x + nx * look.outward, point.y + ny * look.outward] as [number, number],
      radius: [half * (1 - across) + depth * across, depth * (1 - across) + half * across] as [
        number,
        number,
      ],
    };
  });
  return pieces.sort((a, b) => a.at[1] - b.at[1]);
}

function between([min, max]: readonly [number, number], random: () => number): number {
  return min + (max - min) * random();
}

/** One side or corner of the outline: its length, and a point at a share of the way along it. */
interface OutlinePart {
  readonly length: number;
  readonly at: (t: number) => ShorePoint;
}

/** A rounded rectangle's outline by distance along it, clockwise from the top-left corner. */
function roundedOutline(rect: Rect, radius: number): OutlinePart {
  const parts = outlineParts(rect, Math.min(radius, rect.width / 2, rect.height / 2));
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const at = (distance: number): ShorePoint => {
    let left = ((distance % length) + length) % length;
    for (const part of parts) {
      if (left <= part.length && part.length > 0) return part.at(left / part.length);
      left -= part.length;
    }
    return { x: rect.x + radius, y: rect.y, normal: [0, -1], corner: false };
  };
  return { length, at };
}

/** The four straight sides and four quarter circles of a rounded rectangle, in order. */
function outlineParts({ x, y, width, height }: Rect, r: number): OutlinePart[] {
  const straight = (
    fromX: number,
    fromY: number,
    dx: number,
    dy: number,
    normal: [number, number],
  ): OutlinePart => ({
    length: Math.abs(dx) + Math.abs(dy),
    at: (t) => ({ x: fromX + dx * t, y: fromY + dy * t, normal, corner: false }),
  });
  const corner = (cx: number, cy: number, startAngle: number): OutlinePart => ({
    length: (Math.PI / 2) * r,
    at: (t) => {
      const angle = startAngle + (Math.PI / 2) * t;
      const normal = [Math.cos(angle), Math.sin(angle)] as const;
      return { x: cx + normal[0] * r, y: cy + normal[1] * r, normal, corner: true };
    },
  });
  const right = x + width;
  const bottom = y + height;
  return [
    straight(x + r, y, width - 2 * r, 0, [0, -1]),
    corner(right - r, y + r, -Math.PI / 2),
    straight(right, y + r, 0, height - 2 * r, [1, 0]),
    corner(right - r, bottom - r, 0),
    straight(right - r, bottom, -(width - 2 * r), 0, [0, 1]),
    corner(x + r, bottom - r, Math.PI / 2),
    straight(x, bottom - r, 0, -(height - 2 * r), [-1, 0]),
    corner(x + r, y + r, Math.PI),
  ];
}
