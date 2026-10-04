import { describe, expect, it } from 'vitest';
import { planBackdrop } from '../src/art/backdrop';
import { THEME } from '../src/theme/theme';

const LOOK = THEME.scene.backdrop;

describe('planBackdrop', () => {
  it('on a tall phone paints the sky above the pond, down to its shore', () => {
    const plan = planBackdrop(
      { width: 360, height: 780, open: 90, sceneBottom: 250, pond: { left: 8, right: 352 } },
      LOOK,
    );
    expect(plan.wide).toBe(false);
    expect(plan.horizon).toBe(250);
    expect(plan.height).toBe(250);
  });

  it('on a wide screen drops the horizon and dresses the ground beside the pond', () => {
    const plan = planBackdrop(
      { width: 1138, height: 640, open: 90, sceneBottom: 96, pond: { left: 390, right: 748 } },
      LOOK,
    );
    expect(plan.wide).toBe(true);
    expect(plan.horizon).toBeCloseTo(640 * LOOK.wideHorizon);
    expect(plan.height).toBe(640);
  });
});
