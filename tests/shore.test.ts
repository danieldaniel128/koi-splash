import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { shoreStones } from '../src/layout/shore';
import type { ShoreLook, ShoreStone } from '../src/layout/shore';

const POND = { x: 8, y: 80, width: 344, height: 440 };
const LOOK: ShoreLook = {
  cornerRadius: 24,
  length: [11, 17],
  depth: [10, 13],
  gap: 1.5,
  outward: 4,
  cornerScale: 1.3,
};

/** Distance from a point to the pond's rounded outline: negative in the water (as in the shaders). */
function shoreDistance([px, py]: readonly [number, number]): number {
  const r = LOOK.cornerRadius;
  const qx = Math.abs(px - (POND.x + POND.width / 2)) - POND.width / 2 + r;
  const qy = Math.abs(py - (POND.y + POND.height / 2)) - POND.height / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const stonesFor = (seed: number): ShoreStone[] => {
  const rng = new Random(seed);
  return shoreStones(POND, LOOK, () => rng.next());
};

describe('shoreStones', () => {
  it('rings the whole pond, every stone sitting just out from the waterline', () => {
    const stones = stonesFor(5);
    const perimeter = 2 * (POND.width + POND.height) - (8 - 2 * Math.PI) * LOOK.cornerRadius;
    expect(stones.length).toBeGreaterThanOrEqual(Math.floor(perimeter / (2 * 17 + 1.5)));
    for (const stone of stones) expect(shoreDistance(stone.at)).toBeCloseTo(LOOK.outward, 5);
  });

  it('leaves no stretch of shore bare: each stone has a neighbour within reach', () => {
    const stones = stonesFor(9);
    for (const stone of stones) {
      const nearest = Math.min(
        ...stones
          .filter((other) => other !== stone)
          .map((other) => Math.hypot(other.at[0] - stone.at[0], other.at[1] - stone.at[1])),
      );
      expect(nearest).toBeLessThanOrEqual(2 * LOOK.length[1] * LOOK.cornerScale + LOOK.gap);
    }
  });

  it('is the same ring for the same seed, sorted top to bottom for drawing', () => {
    const stones = stonesFor(3);
    expect(stonesFor(3)).toEqual(stones);
    for (let i = 1; i < stones.length; i++)
      expect(stones[i]?.at[1]).toBeGreaterThanOrEqual(stones[i - 1]?.at[1] ?? 0);
  });
});
