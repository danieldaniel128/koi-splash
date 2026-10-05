import type { BoardShape } from '../model/shape';
import type { Rect } from './gameLayout';
import { cellKey } from '../model/types';

type Vec = readonly [number, number];

/** A point on the shore and the way out of the water there. */
export interface ShorePoint {
  readonly x: number;
  readonly y: number;
  readonly normal: Vec;
  /** On a rounded corner that bulges out (where the corner pieces go bigger). */
  readonly corner: boolean;
}

/** One straight side or rounded corner of an outline: its length, and a point a share `t` of the way along. */
export interface OutlinePart {
  readonly length: number;
  readonly at: (t: number) => ShorePoint;
  /** Points along it, ending at its end, for flattening the outline into a polygon. */
  readonly steps: number;
}

/** A closed loop of shore, walked with the water on its right. */
export interface Outline {
  readonly parts: readonly OutlinePart[];
  readonly length: number;
  /** The point `distance` px along the loop (wraps round). O(parts). */
  at(distance: number): ShorePoint;
}

/** How the shore sits around the board: water past the cells on each side, and how round its corners are (px). */
export interface ShoreSpec {
  readonly margin: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly cornerRadius: number;
}

/**
 * The pond's shore for a board of any shape: the edge of its cells, pushed out by the margins, with every corner
 * rounded (the outer corners and the inner ones where the bank comes in). One loop for the outside, one more round
 * each island of bank inside the pond. A plain rectangle gives one rounded rectangle.
 * O(cols * rows) to trace, O(corners) to round.
 */
export function traceShore(shape: BoardShape, board: Rect & { cell: number }, spec: ShoreSpec): Outline[] {
  return boundaryLoops(shape).map((corners) => {
    const placed = corners.map(({ at, dirIn, dirOut }) => {
      const x = board.x + at[0] * board.cell;
      const y = board.y + at[1] * board.cell;
      const nIn = outward(dirIn);
      const nOut = outward(dirOut);
      const push = (n: Vec): number => marginFor(n, spec.margin);
      return {
        point: [
          x + nIn[0] * push(nIn) + nOut[0] * push(nOut),
          y + nIn[1] * push(nIn) + nOut[1] * push(nOut),
        ] as Vec,
        nIn,
        nOut,
        convex: turnsRight(dirIn, dirOut),
      };
    });
    return roundCorners(placed, spec.cornerRadius);
  });
}

/** The loop as a polygon: arcs cut into short chords, for baking a distance field. O(points). */
export function toPolygon(outline: Outline): Vec[] {
  const points: Vec[] = [];
  for (const part of outline.parts) {
    for (let i = 1; i <= part.steps; i++) {
      const point = part.at(i / part.steps);
      points.push([point.x, point.y]);
    }
  }
  return points;
}

// ---------------------------------------------------------------------------------------------------------------

/** A corner of a cell-edge loop: where it is (in cells) and the directions in and out of it. */
interface GridCorner {
  readonly at: Vec;
  readonly dirIn: Vec;
  readonly dirOut: Vec;
}

/**
 * Every loop of cell edges between water and bank, walked clockwise round the water (water on the right), as its
 * corners. Where two loops touch at a point, each keeps turning right, so they stay apart.
 */
function boundaryLoops(shape: BoardShape): GridCorner[][] {
  const holes = new Set(shape.holes.map(cellKey));
  const water = (col: number, row: number): boolean =>
    col >= 0 && col < shape.cols && row >= 0 && row < shape.rows && !holes.has(cellKey({ col, row }));
  const edges = new Map<string, Vec[]>(); // from a grid point to the directions leaving it
  const add = (x: number, y: number, dir: Vec): void => {
    const list = edges.get(`${x},${y}`) ?? [];
    list.push(dir);
    edges.set(`${x},${y}`, list);
  };
  for (let row = 0; row < shape.rows; row++) {
    for (let col = 0; col < shape.cols; col++) {
      if (!water(col, row)) continue;
      if (!water(col, row - 1)) add(col, row, [1, 0]);
      if (!water(col + 1, row)) add(col + 1, row, [0, 1]);
      if (!water(col, row + 1)) add(col + 1, row + 1, [-1, 0]);
      if (!water(col - 1, row)) add(col, row + 1, [0, -1]);
    }
  }
  const loops: GridCorner[][] = [];
  for (const [start, dirs] of edges) {
    while (dirs.length > 0) loops.push(walkLoop(start, edges));
  }
  return loops;
}

/** Walks one loop from `start`, taking each edge it uses out of `edges`, and returns its corners. */
function walkLoop(start: string, edges: Map<string, Vec[]>): GridCorner[] {
  const steps: { at: Vec; dir: Vec }[] = [];
  let key = start;
  let dir: Vec | null = null;
  for (;;) {
    const options = edges.get(key) ?? [];
    const next: Vec | undefined = dir ? pickTurn(dir, options) : options[0];
    if (!next) break;
    options.splice(options.indexOf(next), 1);
    const [x, y] = key.split(',').map(Number) as [number, number];
    steps.push({ at: [x, y], dir: next });
    key = `${x + next[0]},${y + next[1]}`;
    dir = next;
    if (key === start) break;
  }
  return steps.flatMap((step, i) => {
    const before = steps[(i - 1 + steps.length) % steps.length]?.dir ?? step.dir;
    return before[0] === step.dir[0] && before[1] === step.dir[1]
      ? []
      : [{ at: step.at, dirIn: before, dirOut: step.dir }];
  });
}

/** Out of the edges leaving a point, the one turning right first, then straight on, then left. */
function pickTurn(dir: Vec, options: readonly Vec[]): Vec | undefined {
  const right: Vec = [-dir[1], dir[0]];
  const left: Vec = [dir[1], -dir[0]];
  for (const want of [right, dir, left]) {
    const found = options.find((o) => o[0] === want[0] && o[1] === want[1]);
    if (found) return found;
  }
  return undefined;
}

/** With the water on the right, out of the water is to the left. */
function outward(dir: Vec): Vec {
  return [dir[1], -dir[0]];
}

/** A right turn (clockwise on screen) goes round the water: an outer corner. */
function turnsRight(dirIn: Vec, dirOut: Vec): boolean {
  return dirIn[0] * dirOut[1] - dirIn[1] * dirOut[0] > 0;
}

function marginFor(normal: Vec, margin: ShoreSpec['margin']): number {
  if (normal[1] < 0) return margin.top;
  if (normal[1] > 0) return margin.bottom;
  return normal[0] < 0 ? margin.left : margin.right;
}

/** A loop of straight sides with every corner turned into a quarter circle, as small as the sides around it need. */
function roundCorners(
  corners: readonly { point: Vec; nIn: Vec; nOut: Vec; convex: boolean }[],
  radius: number,
): Outline {
  const count = corners.length;
  const gap = (a: Vec, b: Vec): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const arcs = corners.map((corner, i) => {
    const prev = corners[(i - 1 + count) % count] ?? corner;
    const next = corners[(i + 1) % count] ?? corner;
    const r = Math.min(radius, gap(prev.point, corner.point) / 2, gap(corner.point, next.point) / 2);
    return arcAt(corner, r);
  });
  const parts: OutlinePart[] = [];
  arcs.forEach((arc, i) => {
    parts.push(arc);
    const next = arcs[(i + 1) % count] ?? arc;
    parts.push(straight(arc.at(1), next.at(0)));
  });
  return closed(parts.filter((part) => part.length > 1e-6));
}

/** The quarter circle replacing one corner: centred inside the water for an outer corner, outside for an inner one. */
function arcAt(corner: { point: Vec; nIn: Vec; nOut: Vec; convex: boolean }, r: number): OutlinePart {
  const side = corner.convex ? -1 : 1;
  const centre: Vec = [
    corner.point[0] + side * r * (corner.nIn[0] + corner.nOut[0]),
    corner.point[1] + side * r * (corner.nIn[1] + corner.nOut[1]),
  ];
  const from = Math.atan2(-side * corner.nIn[1], -side * corner.nIn[0]);
  const sweep = corner.convex ? Math.PI / 2 : -Math.PI / 2;
  return {
    length: (Math.PI / 2) * r,
    steps: Math.max(2, Math.ceil(r / 4)),
    at: (t) => {
      const angle = from + sweep * t;
      const radial: Vec = [Math.cos(angle), Math.sin(angle)];
      return {
        x: centre[0] + radial[0] * r,
        y: centre[1] + radial[1] * r,
        normal: corner.convex ? radial : [-radial[0], -radial[1]],
        corner: corner.convex,
      };
    },
  };
}

function straight(from: ShorePoint, to: ShorePoint): OutlinePart {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal: Vec = length > 0 ? [(to.y - from.y) / length, -(to.x - from.x) / length] : from.normal;
  return {
    length,
    steps: 1,
    at: (t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, normal, corner: false }),
  };
}

/** The parts as one loop walked by distance. */
function closed(parts: readonly OutlinePart[]): Outline {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  return {
    parts,
    length,
    at: (distance) => {
      let left = ((distance % length) + length) % length;
      for (const part of parts) {
        if (left <= part.length) return part.at(left / part.length);
        left -= part.length;
      }
      const last = parts[parts.length - 1];
      if (!last) throw new RangeError('outline: no parts');
      return last.at(1);
    },
  };
}
