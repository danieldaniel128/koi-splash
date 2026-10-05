type Vec = readonly [number, number];

/** A stage rectangle. */
interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A signed distance field: RGBA8 texels over `area`, one every `texel` px. */
export interface DistanceField {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly area: Area;
}

/**
 * How far each channel reaches (px): red holds the distance out to ±128 in 1 px steps (for gradients across the
 * water), green the same out to ±16 in 1/8 px steps (for crisp lines near the shore). common.glsl decodes both.
 */
export const FIELD_REACH = { coarse: 128, fine: 16 } as const;

/** Texels per side of a block: the edges are sorted into blocks this size, so each texel only looks at a few. */
const BLOCK = 8;

/** Edges are kept flat, six numbers each: the start (x, y), the step to the end (x, y), its length squared, end y. */
const EDGE_STRIDE = 6;

/**
 * Bakes the signed distance to the edge of some polygons (negative inside, by the even-odd rule, so islands work)
 * into a texture, once, so a shader can ask "how far am I from the shore" of any shape with one texture read.
 *
 * Every texel needs its nearest edge, so the field is cut into blocks and each block keeps only the edges that can
 * be nearest to a point in it; a block further than the coarse reach from every edge, where both channels are full,
 * skips the distance altogether. Inside or outside comes from one sorted list of crossings per row. The bytes are
 * the same as measuring every edge from every texel (about 0.6 s for the pond), in about 11 ms.
 */
export function bakeDistanceField(
  polygons: readonly (readonly Vec[])[],
  area: Area,
  texel: number,
): DistanceField {
  const width = Math.ceil(area.width / texel);
  const height = Math.ceil(area.height / texel);
  const edges = flatEdges(polygons);
  const grid = { area, texel, width, height };
  const near = nearEdgesByBlock(edges, grid);
  const crossings = new Float64Array(edges.length / EDGE_STRIDE);
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const py = area.y + (row + 0.5) * texel;
    const count = rowCrossings(edges, py, crossings);
    let passed = 0; // crossings at or left of this texel: the rest are to its right
    for (let col = 0; col < width; col++) {
      const px = area.x + (col + 0.5) * texel;
      while (passed < count && (crossings[passed] ?? Infinity) <= px) passed++;
      const block = Math.floor(row / BLOCK) * near.columns + Math.floor(col / BLOCK);
      const nearest = nearestDistance(px, py, edges, near, block);
      const distance = (count - passed) % 2 === 1 ? -nearest : nearest;
      const i = (row * width + col) * 4;
      data[i] = encode(distance, FIELD_REACH.coarse);
      data[i + 1] = encode(distance, FIELD_REACH.fine);
      data[i + 3] = 255;
    }
  }
  return {
    data,
    width,
    height,
    area: { x: area.x, y: area.y, width: width * texel, height: height * texel },
  };
}

/** Distance to the nearest edge, negative inside (even-odd). O(edges). */
export function signedDistance([px, py]: Vec, edges: readonly (readonly [Vec, Vec])[]): number {
  let nearestSq = Infinity;
  let inside = false;
  for (const [[ax, ay], [bx, by]] of edges) {
    const dx = bx - ax;
    const dy = by - ay;
    nearestSq = Math.min(nearestSq, distanceSq(px, py, ax, ay, dx, dy, dx * dx + dy * dy));
    if (ay > py !== by > py && px < (dx * (py - ay)) / dy + ax) inside = !inside;
  }
  const nearest = Math.sqrt(nearestSq);
  return inside ? -nearest : nearest;
}

/** The field's texels, and how the stage maps onto them. */
interface FieldGrid {
  readonly area: Area;
  readonly texel: number;
  readonly width: number;
  readonly height: number;
}

/** For each block of texels, the edges that can be nearest to a point in it (`start`..`start` of the next block). */
interface NearEdges {
  readonly columns: number;
  readonly start: Int32Array;
  readonly edges: Int32Array;
  /** Blocks out of reach of every edge: their distance doesn't matter, only the side they're on. */
  readonly outOfReach: Uint8Array;
}

/** Every polygon's edges, closing each loop. */
function flatEdges(polygons: readonly (readonly Vec[])[]): Float64Array {
  const count = polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  const edges = new Float64Array(count * EDGE_STRIDE);
  let at = 0;
  for (const polygon of polygons) {
    for (const [i, [ax, ay]] of polygon.entries()) {
      const [bx, by] = polygon[(i + 1) % polygon.length] ?? [ax, ay];
      const dx = bx - ax;
      const dy = by - ay;
      edges.set([ax, ay, dx, dy, dx * dx + dy * dy, by], at);
      at += EDGE_STRIDE;
    }
  }
  return edges;
}

/**
 * Sorts the edges into blocks. From a block's centre, the nearest edge is `nearest` away; no point in the block is
 * more than `half` (half its diagonal) from the centre, so its own nearest edge is within nearest + half of it, and
 * that edge is within nearest + 2 half of the centre. Only those edges are kept. O(blocks x edges).
 */
function nearEdgesByBlock(edges: Float64Array, grid: FieldGrid): NearEdges {
  const columns = Math.ceil(grid.width / BLOCK);
  const rows = Math.ceil(grid.height / BLOCK);
  const start = new Int32Array(columns * rows + 1);
  const outOfReach = new Uint8Array(columns * rows);
  const kept: number[] = [];
  const fromCentre = new Float64Array(edges.length / EDGE_STRIDE);
  for (let block = 0; block < columns * rows; block++) {
    const { x, y, half } = blockCentre(grid, block % columns, Math.floor(block / columns));
    let nearest = Infinity;
    for (let e = 0; e < fromCentre.length; e++) {
      const distance = Math.sqrt(edgeDistanceSq(x, y, edges, e));
      fromCentre[e] = distance;
      nearest = Math.min(nearest, distance);
    }
    const slack = grid.texel * 1e-3; // keeps an edge right on the limit despite rounding
    outOfReach[block] = nearest - half - slack >= FIELD_REACH.coarse ? 1 : 0;
    for (let e = 0; e < fromCentre.length && !outOfReach[block]; e++) {
      if ((fromCentre[e] ?? Infinity) <= nearest + half * 2 + slack) kept.push(e);
    }
    start[block + 1] = kept.length;
  }
  return { columns, start, edges: Int32Array.from(kept), outOfReach };
}

/** The centre of a block's texel centres, and the distance from it to the furthest of them. */
function blockCentre(grid: FieldGrid, column: number, row: number): { x: number; y: number; half: number } {
  const first = { col: column * BLOCK, row: row * BLOCK };
  const last = {
    col: Math.min(first.col + BLOCK, grid.width) - 1,
    row: Math.min(first.row + BLOCK, grid.height) - 1,
  };
  const halfWidth = ((last.col - first.col) * grid.texel) / 2;
  const halfHeight = ((last.row - first.row) * grid.texel) / 2;
  return {
    x: grid.area.x + (first.col + 0.5) * grid.texel + halfWidth,
    y: grid.area.y + (first.row + 0.5) * grid.texel + halfHeight,
    half: Math.hypot(halfWidth, halfHeight),
  };
}

/** The distance from a texel to its nearest edge, among its block's. Infinity for a block out of reach. */
function nearestDistance(
  px: number,
  py: number,
  edges: Float64Array,
  near: NearEdges,
  block: number,
): number {
  if (near.outOfReach[block]) return Infinity;
  let nearestSq = Infinity;
  const end = near.start[block + 1] ?? 0;
  for (let k = near.start[block] ?? 0; k < end; k++) {
    nearestSq = Math.min(nearestSq, edgeDistanceSq(px, py, edges, near.edges[k] ?? 0));
  }
  return Math.sqrt(nearestSq);
}

/**
 * Where the row at `py` crosses the edges, sorted left to right, into `out`; returns how many. A texel is inside
 * when an odd number of them are to its right (the even-odd rule, as signedDistance tests it). O(edges log edges).
 */
function rowCrossings(edges: Float64Array, py: number, out: Float64Array): number {
  let count = 0;
  for (let at = 0; at < edges.length; at += EDGE_STRIDE) {
    const ax = edges[at] ?? 0;
    const ay = edges[at + 1] ?? 0;
    const dx = edges[at + 2] ?? 0;
    const dy = edges[at + 3] ?? 0;
    const by = edges[at + 5] ?? 0;
    if (ay > py !== by > py) out[count++] = (dx * (py - ay)) / dy + ax;
  }
  out.subarray(0, count).sort();
  return count;
}

/** The squared distance from a point to edge `e` of the flat list. */
function edgeDistanceSq(px: number, py: number, edges: Float64Array, e: number): number {
  const at = e * EDGE_STRIDE;
  const ax = edges[at] ?? 0;
  const ay = edges[at + 1] ?? 0;
  return distanceSq(px, py, ax, ay, edges[at + 2] ?? 0, edges[at + 3] ?? 0, edges[at + 4] ?? 0);
}

/** The squared distance from a point to the segment from (ax, ay) along (dx, dy). */
function distanceSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  dx: number,
  dy: number,
  lengthSq: number,
): number {
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  const ex = px - (ax + dx * t);
  const ey = py - (ay + dy * t);
  return ex * ex + ey * ey;
}

/** A distance as a byte: -reach maps to 0, +reach to 255, clamped. */
function encode(distance: number, reach: number): number {
  return Math.round((Math.max(-1, Math.min(1, distance / reach)) * 0.5 + 0.5) * 255);
}
