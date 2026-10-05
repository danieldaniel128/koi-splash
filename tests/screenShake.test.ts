import { describe, expect, it } from 'vitest';
import { punchZoom, ScreenShake } from '../src/core/ScreenShake';

const SPEC = { max: 11, decay: 1.7, x: 73, y: 57 };

describe('ScreenShake', () => {
  it('adds hits up to a full shake', () => {
    const shake = new ScreenShake(SPEC);
    shake.add(0.4);
    shake.add(0.4);
    expect(shake.amount).toBeCloseTo(0.8);
    shake.add(0.6);
    expect(shake.amount).toBe(1);
  });

  it('dies away at its decay rate and moves at most the level squared times its reach', () => {
    const shake = new ScreenShake(SPEC);
    shake.add(1);
    const offset = shake.tick(0.1);
    expect(shake.amount).toBeCloseTo(0.83);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.83 * 0.83 * 11 + 1e-9);
    shake.tick(1);
    expect(shake.amount).toBe(0);
    const still = shake.tick(0.016);
    expect(Math.abs(still.x) + Math.abs(still.y)).toBe(0);
  });

  it('is gentler for players who ask for less motion', () => {
    const shake = new ScreenShake(SPEC, 0.35);
    shake.add(1);
    expect(shake.amount).toBeCloseTo(0.35);
  });
});

describe('punchZoom', () => {
  const spec = { zoom: 0.07, in: 0.5, hold: 0.35, out: 0.4 };

  it('pushes in, holds, then comes back out', () => {
    expect(punchZoom(spec, 0)).toBe(1);
    expect(punchZoom(spec, 0.25)).toBeGreaterThan(1);
    expect(punchZoom(spec, 0.6)).toBeCloseTo(1.07);
    expect(punchZoom(spec, 1.05)).toBeLessThan(1.07);
    expect(punchZoom(spec, 2)).toBe(1);
  });
});
