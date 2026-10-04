import { describe, expect, it } from 'vitest';
import { FIELD_REACH, bakeDistanceField, signedDistance } from '../src/art/distanceField';

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
