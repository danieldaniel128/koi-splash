import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { traceShore } from '../src/layout/outline';
import { ringAlongShore } from '../src/layout/shore';
import type { ShoreLook, ShorePiece } from '../src/layout/shore';
import { parseShape } from '../src/model/shape';

const BOARD = { x: 22, y: 96, width: 308, height: 396, cell: 44 };
const MARGIN = 14;
const RADIUS = 24;
const POND = { x: BOARD.x - MARGIN, y: BOARD.y - MARGIN, width: 308 + 2 * MARGIN, height: 396 + 2 * MARGIN };
const LOOK: ShoreLook = { length: [11, 17], depth: [10, 13], gap: 1.5, outward: 4, cornerScale: 1.3 };
const SHORE = traceShore(parseShape(Array.from({ length: 9 }, () => '#######')), BOARD, {
  margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
  cornerRadius: RADIUS,
});

/** Distance from a point to the pond's rounded outline: negative in the water (as in the shaders). */
function shoreDistance([px, py]: readonly [number, number]): number {
  const qx = Math.abs(px - (POND.x + POND.width / 2)) - POND.width / 2 + RADIUS;
  const qy = Math.abs(py - (POND.y + POND.height / 2)) - POND.height / 2 + RADIUS;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RADIUS;
}

const stonesFor = (seed: number): ShorePiece[] => {
  const rng = new Random(seed);
  return ringAlongShore(SHORE, LOOK, () => rng.next());
};

describe('ringAlongShore', () => {
  it('rings the whole pond, every piece sitting just out from the waterline', () => {
    const stones = stonesFor(5);
    const perimeter = 2 * (POND.width + POND.height) - (8 - 2 * Math.PI) * RADIUS;
    expect(stones.length).toBeGreaterThanOrEqual(Math.floor(perimeter / (2 * 17 + 1.5)));
    for (const stone of stones) expect(shoreDistance(stone.at)).toBeCloseTo(LOOK.outward, 5);
  });

  it('leaves no stretch of shore bare: each piece has a neighbour within reach', () => {
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

  it('piles no stones on a notch one cell wide: the strip of bank there gets one along it', () => {
    // a notch in the left side, one row tall: the bank there is a strip much thinner than a stone
    const shore = traceShore(parseShape(['#####', '#####', '.####', '#####', '#####']), BOARD, {
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
      cornerRadius: RADIUS,
    });
    const notchRow = BOARD.y + 2.5 * BOARD.cell;
    const sitsOn = (a: ShorePiece, b: ShorePiece): boolean =>
      Math.abs(a.at[0] - b.at[0]) < b.radius[0] && Math.abs(a.at[1] - b.at[1]) < b.radius[1];
    for (let seed = 1; seed <= 20; seed++) {
      const rng = new Random(seed);
      const stones = ringAlongShore(shore, LOOK, () => rng.next());
      const onNotch = stones.filter(
        ({ at: [x, y] }) => x < BOARD.x + BOARD.cell && Math.abs(y - notchRow) < BOARD.cell / 2,
      );
      expect(onNotch.length).toBeGreaterThan(0);
      for (const a of onNotch) for (const b of onNotch) if (a !== b) expect(sitsOn(a, b)).toBe(false);
    }
  });
});
