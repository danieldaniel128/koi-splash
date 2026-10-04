import { describe, expect, it } from 'vitest';
import { packShelves } from '../src/art/atlas';
import { Random } from '../src/core/Random';

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('packShelves', () => {
  const rng = new Random(4);
  const sizes = Array.from({ length: 60 }, () => ({
    width: 40 + Math.floor(rng.next() * 60),
    height: 30 + Math.floor(rng.next() * 50),
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
