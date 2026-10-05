import { describe, expect, it } from 'vitest';
import { paintResolution } from '../src/boot/screen';
import { KOI_LOOK } from '../src/config/koi';

describe('paintResolution', () => {
  it('paints the scene at exactly the screen pixels, and the art a little finer', () => {
    const phone = paintResolution(2, 390 / 360); // a 2x phone, the stage scaled up from the design width
    expect(phone.screen).toBeCloseTo(2.1667, 4);
    expect(phone.art).toBeCloseTo(phone.screen * KOI_LOOK.bakeHeadroom);
  });

  it('never bakes the art finer than the cap, however big the screen', () => {
    expect(paintResolution(2, 3.4).art).toBe(KOI_LOOK.maxBakeResolution);
  });
});
