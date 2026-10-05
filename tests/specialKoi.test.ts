import { describe, expect, it } from 'vitest';
import { sheenBar } from '../src/art/specialKoi';
import type { SheenBar } from '../src/art/specialKoi';
import { SPECIAL_LOOK } from '../src/config/specials';

/** A head-up koi's body down its square's center line (koiBank: the snout 0.41 above the center, 0.6 long). */
const SNOUT = 0.09;
const TAIL_ROOT = 0.69;
const SIZE = 160;
/** A bar lights a point once its gradient there is at least this bright (its peak is 0.85). */
const LIT = 0.4;

/** The bar's brightness at a point: its gradient rises from one end to the middle and falls to the other. */
function lightAt(bar: SheenBar, x: number, y: number): number {
  const [ax, ay] = bar.from;
  const dx = bar.to[0] - ax;
  const dy = bar.to[1] - ay;
  const t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
  return t < 0 || t > 1 ? 0 : 0.85 * (1 - Math.abs(2 * t - 1));
}

const bars = Array.from({ length: SPECIAL_LOOK.sheen.frames }, (_, f) =>
  sheenBar(f, SPECIAL_LOOK.sheen.frames, SIZE, SIZE),
);
const centerLine = Array.from({ length: 61 }, (_, i) => SIZE * (SNOUT + ((TAIL_ROOT - SNOUT) * i) / 60));

describe('the striped koi sheen', () => {
  it('lights the body in every frame', () => {
    for (const bar of bars) {
      const brightest = Math.max(...centerLine.map((y) => lightAt(bar, SIZE / 2, y)));
      expect(brightest).toBeGreaterThanOrEqual(LIT);
    }
  });

  it('sweeps from the tail to the head, centered on the body', () => {
    bars.forEach((bar, f) => {
      expect((bar.from[0] + bar.to[0]) / 2).toBe(SIZE / 2);
      if (f > 0) expect(bar.center).toBeLessThan(bars[f - 1]?.center ?? 0);
    });
  });

  it('leaves no stretch of the body unswept', () => {
    for (const y of centerLine) {
      const brightest = Math.max(...bars.map((bar) => lightAt(bar, SIZE / 2, y)));
      expect(brightest).toBeGreaterThanOrEqual(LIT);
    }
  });
});
