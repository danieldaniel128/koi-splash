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
 * Two pieces whose ways out of the water are more than 120 degrees apart (the cosine between them is below this)
 * face away from each other: the shore has turned back between them. A plain corner turns 90 degrees.
 */
const TURNED_BACK = -0.5;

/** A piece as laid, with the way out of the water where it sits. */
interface Laid {
  readonly piece: ShorePiece;
  readonly normal: readonly [number, number];
}

/**
 * Pieces all the way round every loop of shore (whatever the border is made of), side by side with no seam: random
 * sizes are drawn until they go round a loop once, then scaled to close it exactly. A strip of bank too narrow for a
 * piece on each side (a notch one cell wide) gets one piece along it instead (see mergePiles). Sorted top to bottom,
 * so lower pieces are drawn over the ones behind them. O(pieces^2), once.
 */
export function ringAlongShore(
  shore: readonly Outline[],
  look: ShoreLook,
  random: () => number,
): ShorePiece[] {
  return shore.flatMap((loop) => mergePiles(ringAlong(loop, look, random))).sort((a, b) => a.at[1] - b.at[1]);
}

/**
 * On a strip of bank narrower than two pieces, the pieces laid along its two sides (facing away from each other)
 * land on top of each other. Each such pile, with the pieces round the strip's tip between them, becomes one piece
 * lying along the strip, so it reads as a single stone jutting into the water.
 */
function mergePiles(loop: readonly Laid[]): ShorePiece[] {
  const piled = piledPieces(loop);
  const start = piled.indexOf(false); // walk from a piece outside any pile, so none is cut where the loop closes
  if (start < 0) return [oneOver(loop.map((laid) => laid.piece))];
  const merged: ShorePiece[] = [];
  let pile: ShorePiece[] = [];
  for (const k of loop.keys()) {
    const i = (start + k) % loop.length;
    const piece = loop[i]?.piece;
    if (!piece) continue;
    if (piled[i]) {
      pile.push(piece);
      continue;
    }
    if (pile.length > 0) merged.push(oneOver(pile));
    pile = [];
    merged.push(piece);
  }
  if (pile.length > 0) merged.push(oneOver(pile));
  return merged;
}

/**
 * Which pieces of a loop are in a pile: two that overlap though they face away from each other (the shore has
 * turned back between them, round the tip of a strip), and every piece between them the short way round.
 */
function piledPieces(loop: readonly Laid[]): boolean[] {
  const count = loop.length;
  const piled = new Array<boolean>(count).fill(false);
  loop.forEach((a, i) => {
    loop.forEach((b, j) => {
      const ahead = (j - i + count) % count; // pieces from a to b going forward
      const turn = a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1];
      if (ahead === 0 || ahead > count / 2 || turn > TURNED_BACK || !overlap(a.piece, b.piece)) return;
      for (let k = 0; k <= ahead; k++) piled[(i + k) % count] = true;
    });
  });
  return piled;
}

function overlap(a: ShorePiece, b: ShorePiece): boolean {
  const [dx, dy] = [Math.abs(a.at[0] - b.at[0]), Math.abs(a.at[1] - b.at[1])];
  return dx < a.radius[0] + b.radius[0] && dy < a.radius[1] + b.radius[1];
}

/** One piece over a pile: in its middle, lying along it, as long as its longest piece and as deep as its deepest. */
function oneOver(pile: readonly ShorePiece[]): ShorePiece {
  const xs = pile.map((piece) => piece.at[0]);
  const ys = pile.map((piece) => piece.at[1]);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const long = Math.max(...pile.map((piece) => Math.max(...piece.radius)));
  const deep = Math.max(...pile.map((piece) => Math.min(...piece.radius)));
  return {
    at: [(left + right) / 2, (top + bottom) / 2],
    radius: right - left >= bottom - top ? [long, deep] : [deep, long],
  };
}

function ringAlong(loop: Outline, look: ShoreLook, random: () => number): Laid[] {
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
    const piece: ShorePiece = {
      at: [point.x + nx * look.outward, point.y + ny * look.outward],
      radius: [half * (1 - across) + depth * across, depth * (1 - across) + half * across],
    };
    return { piece, normal: point.normal };
  });
}

function between([min, max]: readonly [number, number], random: () => number): number {
  return min + (max - min) * random();
}
