import { describe, expect, it } from 'vitest';
import { transparent } from '../src/art/canvas';
import { MOONLIT_GARDEN } from '../src/theme/moonlitGarden';

describe('transparent', () => {
  it('keeps a hex color and drops its alpha to zero', () => {
    expect(transparent('#f3f7b0')).toBe('#f3f7b000');
  });

  it('keeps an rgb or rgba color and drops its alpha to zero', () => {
    expect(transparent('rgba(255, 190, 90, 0.5)')).toBe('rgba(255, 190, 90, 0)');
    expect(transparent('rgb(2,8,18)')).toBe('rgba(2, 8, 18, 0)');
  });

  it("works for every glow the garden's theme fades out", () => {
    const { backdrop } = MOONLIT_GARDEN.scene;
    for (const glow of [backdrop.moon.glow, backdrop.lantern.glow, backdrop.mist]) {
      expect(transparent(glow)).toMatch(/, 0\)$/);
    }
  });

  it('refuses a color it cannot read, instead of fading to black', () => {
    expect(() => transparent('gold')).toThrow();
  });
});
