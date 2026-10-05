import { describe, expect, it } from 'vitest';
import { packSheets, packShelves } from '../src/art/atlas';
import { seeded } from '../src/core/Random';

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('packShelves', () => {
  const rng = seeded(4);
  const sizes = Array.from({ length: 60 }, () => ({
    width: 40 + Math.floor(rng() * 60),
    height: 30 + Math.floor(rng() * 50),
  }));

  it('gives every piece its own slot of its own size, in the input order', () => {
    const { slots } = packShelves(sizes, 512);
    expect(slots).toHaveLength(sizes.length);
    slots.forEach((slot, i) => {
      expect(slot.width).toBe(sizes[i]?.width);
      expect(slot.height).toBe(sizes[i]?.height);
    });
  });

  it('never overlaps two pieces and stays inside the atlas', () => {
    const { slots, width, height } = packShelves(sizes, 512);
    expect(width).toBeLessThanOrEqual(512);
    for (const [i, a] of slots.entries()) {
      expect(a.x + a.width).toBeLessThanOrEqual(width);
      expect(a.y + a.height).toBeLessThanOrEqual(height);
      for (const b of slots.slice(i + 1)) expect(overlaps(a, b)).toBe(false);
    }
  });

  it('wastes little room: the pieces fill most of the atlas', () => {
    const { width, height } = packShelves(sizes, 512);
    const used = sizes.reduce((sum, size) => sum + size.width * size.height, 0);
    expect(used / (width * height)).toBeGreaterThan(0.7);
  });
});

describe('packSheets', () => {
  const rng = seeded(9);
  const sizes = Array.from({ length: 120 }, () => ({
    width: 40 + Math.floor(rng() * 80),
    height: 30 + Math.floor(rng() * 70),
  }));

  it('spreads the pieces over sheets no bigger than asked, without overlaps', () => {
    const { slots, sheets } = packSheets(sizes, 256);
    expect(sheets.length).toBeGreaterThan(1);
    for (const sheet of sheets) {
      expect(sheet.width).toBeLessThanOrEqual(256);
      expect(sheet.height).toBeLessThanOrEqual(256);
    }
    for (const [i, a] of slots.entries()) {
      expect(a.width).toBe(sizes[i]?.width);
      expect(a.y).toBeGreaterThanOrEqual(0);
      for (const b of slots.slice(i + 1)) if (a.sheet === b.sheet) expect(overlaps(a, b)).toBe(false);
    }
  });

  it('keeps everything on one sheet when it fits', () => {
    const { slots, sheets } = packSheets(sizes.slice(0, 4), 1024);
    expect(sheets).toHaveLength(1);
    expect(slots.every((slot) => slot.sheet === 0)).toBe(true);
  });
});
