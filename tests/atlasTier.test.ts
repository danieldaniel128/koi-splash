import { describe, expect, it } from 'vitest';
import { atlasTier } from '../src/boot/art';
import { ART_ATLAS } from '../src/config/art';

describe('atlasTier', () => {
  it('picks the smallest tier at least as sharp as painting for the board would be', () => {
    expect(atlasTier(1, ART_ATLAS.koiSize)).toBe(1);
    expect(atlasTier(1.5, ART_ATLAS.koiSize * 1.06)).toBe(2); // a laptop at 1x, a bigger board
    expect(atlasTier(2.7, ART_ATLAS.koiSize)).toBe(3); // a 3x phone
  });

  it('asks for more pixels when the board is bigger than the one the art is painted for', () => {
    expect(atlasTier(1.8, ART_ATLAS.koiSize)).toBe(2);
    expect(atlasTier(1.8, ART_ATLAS.koiSize * 1.5)).toBe(3);
  });

  it('never asks for a tier that was not baked', () => {
    expect(atlasTier(4, ART_ATLAS.koiSize * 2)).toBe(Math.max(...ART_ATLAS.tiers));
  });
});
