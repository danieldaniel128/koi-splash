import { describe, expect, it } from 'vitest';
import { SPECIAL_FX } from '../src/config/specials';
import { WATER } from '../src/config/water';
import { packWater, unpackWater } from '../src/view/water/waterCodec';

/** A channel as an 8-bit texture stores it. */
const stored = (channel: number): number => Math.round(channel * 255) / 255;
/** A value packed, stored in an 8-bit texture and read back, as the simulation does every step. */
const roundTrip = (value: number): number => {
  const [high, low] = packWater(value);
  return unpackWater(stored(high), stored(low));
};
const RANGE = WATER.stateRange;
/** One step of the low byte: the finest change the state can hold. */
const STEP = (2 * RANGE) / 255 / 255;

describe('the water state codec', () => {
  it('keeps every value to within one step of the low byte through an 8-bit texture', () => {
    for (let i = 0; i <= 2000; i++) {
      const value = RANGE * (-1 + (i / 2000) * 2);
      expect(Math.abs(roundTrip(value) - value)).toBeLessThanOrEqual(STEP);
    }
  });

  it('keeps flat water flat', () => {
    expect(Math.abs(roundTrip(0))).toBeLessThanOrEqual(STEP);
  });

  it('holds the tiny ripples a settling pond leaves, far below what one byte could', () => {
    const ripple = (RANGE * 2) / 255 / 10; // a tenth of one high-byte step
    expect(roundTrip(ripple)).toBeGreaterThan(roundTrip(0));
    expect(Math.abs(roundTrip(ripple) - ripple)).toBeLessThanOrEqual(STEP);
  });

  it('has room for the strongest single push the game makes', () => {
    const strongest = SPECIAL_FX.whirlpool.pop; // a whirlpool's pop
    expect(Math.abs(roundTrip(strongest) - strongest)).toBeLessThanOrEqual(STEP);
  });

  it('caps values past the range at its ends', () => {
    expect(roundTrip(RANGE * 3)).toBeCloseTo(RANGE, 4);
    expect(roundTrip(-RANGE * 3)).toBeCloseTo(-RANGE, 4);
  });
});
