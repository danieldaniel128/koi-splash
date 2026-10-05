import { describe, expect, it } from 'vitest';
import { fitPagoda, planBackdrop } from '../src/art/backdrop';

describe('planBackdrop', () => {
  it('on a tall phone paints the sky above the pond, down to its shore', () => {
    const plan = planBackdrop({
      width: 360,
      height: 780,
      open: 90,
      sceneBottom: 250,
      pond: { left: 8, right: 352 },
    });
    expect(plan.wide).toBe(false);
    expect(plan.horizon).toBe(250);
    expect(plan.height).toBe(250);
  });

  it('on a wide screen keeps the pond on the ground and dresses the ground beside it', () => {
    const plan = planBackdrop({
      width: 1138,
      height: 640,
      open: 90,
      sceneBottom: 96,
      pond: { left: 390, right: 748 },
    });
    expect(plan.wide).toBe(true);
    expect(plan.horizon).toBe(96); // the sky ends at the pond's shore: no hills behind the pond
    expect(plan.height).toBe(640);
  });
});

/** The pagoda's height at scale 1, footing to spire tip. */
const PAGODA_HEIGHT = 72;

describe('fitPagoda', () => {
  it('keeps the scale asked for when the whole pagoda fits under the top of the sky', () => {
    expect(fitPagoda({ scale: 1, top: 0 }, 200)).toBe(1);
  });

  it('shrinks the pagoda so its spire stays under the top of the sky', () => {
    const base = 52; // a short sky on a landscape desktop
    const scale = fitPagoda({ scale: 0.85, top: 0 }, base);
    expect(scale).not.toBeNull();
    expect(base - PAGODA_HEIGHT * (scale ?? 0)).toBeGreaterThan(0);
  });

  it('keeps the spire below the HUD on a tall phone', () => {
    const scale = fitPagoda({ scale: 1.22, top: 88 }, 178) ?? 0;
    expect(178 - PAGODA_HEIGHT * scale).toBeGreaterThan(88);
  });

  it('leaves the pagoda out when it would have to shrink too far', () => {
    expect(fitPagoda({ scale: 1, top: 0 }, 30)).toBeNull();
  });
});
