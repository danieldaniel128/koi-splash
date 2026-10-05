import { gsap } from 'gsap';
import { describe, expect, it } from 'vitest';
import { easeInOutCubic, easeOutBack, easeOutCubic, smoothstep } from '../src/core/easing';

describe('easing', () => {
  const shares = [0, 0.1, 0.25, 0.5, 0.7, 0.9, 1];

  it('matches the GSAP eases the tweens use, so hand-driven and tweened parts move alike', () => {
    const pairs: [(t: number) => number, string][] = [
      [easeInOutCubic, 'power2.inOut'],
      [easeOutCubic, 'power2.out'],
      [(t) => easeOutBack(t, 1.9), 'back.out(1.9)'],
    ];
    for (const [ease, name] of pairs) {
      const gsapEase = gsap.parseEase(name);
      for (const t of shares) expect(ease(t)).toBeCloseTo(gsapEase(t), 5);
    }
  });

  it('smoothstep holds at its edges and is a smooth S between them', () => {
    expect(smoothstep(0.2, 0.6, 0)).toBe(0);
    expect(smoothstep(0.2, 0.6, 0.4)).toBeCloseTo(0.5);
    expect(smoothstep(0.2, 0.6, 1)).toBe(1);
  });
});
