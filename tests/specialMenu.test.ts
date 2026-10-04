import { describe, expect, it } from 'vitest';
import { petalSpots } from '../src/ui/SpecialMenu';

const LOOK = { reach: 70, spread: 1.25, edge: 44, stageWidth: 360 };

describe('petalSpots', () => {
  it('fans three petals up round a koi, left to right, the middle one straight above', () => {
    const [left, middle, right] = petalSpots({ x: 180, y: 400 }, false, LOOK);
    expect(middle?.x).toBeCloseTo(180);
    expect(middle?.y).toBeCloseTo(330);
    expect(left?.x).toBeLessThan(180);
    expect(right?.x).toBeGreaterThan(180);
  });

  it('fans down for a koi near the top, and keeps the fan on the screen', () => {
    const spots = petalSpots({ x: 20, y: 100 }, true, LOOK);
    expect(spots[1]?.y).toBeGreaterThan(100);
    for (const spot of spots) expect(spot.x).toBeGreaterThanOrEqual(44 - 1e-9);
  });
});
