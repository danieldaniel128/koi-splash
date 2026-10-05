import { describe, expect, it } from 'vitest';
import { FIELD_REACH, bakeDistanceField, signedDistance } from '../src/art/distanceField';
import { toPolygon, traceShore } from '../src/layout/outline';
import { parseShape } from '../src/model/shape';

const SQUARE = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
] as const;
const edgesOf = (
  polygon: readonly (readonly [number, number])[],
): [readonly [number, number], readonly [number, number]][] =>
  polygon.map((a, i) => [a, polygon[(i + 1) % polygon.length] ?? a]);

/** Reads a channel back as px, the way common.glsl does. */
const decode = (byte: number, reach: number): number => ((byte / 255) * 2 - 1) * reach;

describe('signedDistance', () => {
  it('is negative inside, positive outside, and the distance to the nearest edge', () => {
    const edges = edgesOf(SQUARE);
    expect(signedDistance([50, 10], edges)).toBeCloseTo(-10);
    expect(signedDistance([50, -7], edges)).toBeCloseTo(7);
    expect(signedDistance([103, 104], edges)).toBeCloseTo(5);
  });

  it('treats a polygon inside another as an island (even-odd)', () => {
    const island = [
      [40, 40],
      [60, 40],
      [60, 60],
      [40, 60],
    ] as const;
    const edges = [...edgesOf(SQUARE), ...edgesOf(island)];
    expect(signedDistance([50, 50], edges)).toBeCloseTo(10); // on the island: out of the water
    expect(signedDistance([20, 50], edges)).toBeCloseTo(-20);
  });
});

describe('bakeDistanceField', () => {
  it('stores the distance in both channels, fine near the edge and coarse far from it', () => {
    const field = bakeDistanceField([SQUARE], { x: -50, y: -50, width: 200, height: 200 }, 2);
    expect(field.width).toBe(100);
    const at = (x: number, y: number): [number, number] => {
      const i = (Math.floor((y + 50) / 2) * field.width + Math.floor((x + 50) / 2)) * 4;
      return [field.data[i] ?? 0, field.data[i + 1] ?? 0];
    };
    const [coarseNear, fineNear] = at(51, 5); // texel centre (51, 5): 5 px inside
    expect(decode(fineNear, FIELD_REACH.fine)).toBeCloseTo(-5, 0);
    expect(decode(coarseNear, FIELD_REACH.coarse)).toBeCloseTo(-5, 0);
    const [coarseFar, fineFar] = at(51, 49); // 49 px inside: the fine channel is clamped, the coarse one isn't
    expect(decode(fineFar, FIELD_REACH.fine)).toBeCloseTo(-FIELD_REACH.fine, 0);
    expect(decode(coarseFar, FIELD_REACH.coarse)).toBeCloseTo(-49, 0);
  });
});

/** The field measured the plain way, every edge from every texel with Math.hypot: what the fast bake must match. */
function bakeByEveryEdge(
  polygons: readonly (readonly (readonly [number, number])[])[],
  area: { x: number; y: number; width: number; height: number },
  texel: number,
): Uint8Array {
  const width = Math.ceil(area.width / texel);
  const height = Math.ceil(area.height / texel);
  const edges = polygons.flatMap(edgesOf);
  const encode = (d: number, reach: number): number =>
    Math.round((Math.max(-1, Math.min(1, d / reach)) * 0.5 + 0.5) * 255);
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [px, py] = [area.x + (col + 0.5) * texel, area.y + (row + 0.5) * texel];
      let nearest = Infinity;
      let inside = false;
      for (const [[ax, ay], [bx, by]] of edges) {
        const [dx, dy] = [bx - ax, by - ay];
        const lengthSq = dx * dx + dy * dy;
        const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
        nearest = Math.min(nearest, Math.hypot(px - (ax + dx * t), py - (ay + dy * t)));
        if (ay > py !== by > py && px < (dx * (py - ay)) / dy + ax) inside = !inside;
      }
      const i = (row * width + col) * 4;
      data[i] = encode(inside ? -nearest : nearest, FIELD_REACH.coarse);
      data[i + 1] = encode(inside ? -nearest : nearest, FIELD_REACH.fine);
      data[i + 3] = 255;
    }
  }
  return data;
}

describe('bakeDistanceField, the fast way', () => {
  it('matches measuring every edge from every texel, on a square with an island', () => {
    const island = [
      [40, 40],
      [60, 40],
      [55, 62],
      [42, 58],
    ] as const;
    const area = { x: -40, y: -30, width: 190, height: 170 };
    const fast = bakeDistanceField([SQUARE, island], area, 1.5);
    expect(fast.data).toEqual(bakeByEveryEdge([SQUARE, island], area, 1.5));
  });

  it('matches it on a traced pond with notches and an island, far enough out that blocks go out of reach', () => {
    const drawing = ['..###..', '.#####.', '###.###', '#######', '..###..'];
    const shore = traceShore(
      parseShape(drawing),
      { x: 0, y: 0, width: 280, height: 200, cell: 40 },
      {
        margin: { left: 14, right: 14, top: 16, bottom: 16 },
        cornerRadius: 24,
      },
    );
    const polygons = shore.map(toPolygon);
    const area = { x: -200, y: -180, width: 680, height: 560 };
    const fast = bakeDistanceField(polygons, area, 3);
    expect(fast.data).toEqual(bakeByEveryEdge(polygons, area, 3));
  });
});
