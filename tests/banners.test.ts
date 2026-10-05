import { describe, expect, it } from 'vitest';
import { comboBanner, plainBanner } from '../src/ui/banners';

describe('comboBanner', () => {
  it('shows nothing for a plain first round, and only the special a first round made', () => {
    expect(comboBanner(0)).toBeNull();
    expect(comboBanner(0, 'whirlpool')).toEqual(plainBanner('Whirlpool!'));
  });

  it('counts the combo from the second round, with the special made under it', () => {
    const banner = comboBanner(1, 'striped');
    expect(banner?.text).toBe('Combo x2');
    expect(banner?.sub).toBe('Striped koi!');
    expect(banner?.scale).toBe(1);
  });

  it('gives each round its colour and grows a little each round, up to a cap', () => {
    expect(comboBanner(1)?.color).toBe('var(--color-combo1)');
    expect(comboBanner(2)?.color).toBe('var(--color-combo2)');
    expect(comboBanner(9)?.color).toBe('var(--color-combo4)');
    expect(comboBanner(3)?.scale).toBeCloseTo(1.14);
    expect(comboBanner(20)?.scale).toBeCloseTo(1.28);
  });
});
