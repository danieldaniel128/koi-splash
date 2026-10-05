/**
 * The easing curves the effects compute by hand (inside an onUpdate, where a GSAP ease name can't go). Each takes
 * and returns a share from 0 to 1. They are the same curves as GSAP's power2.inOut, power2.out and back.out, so a
 * hand-driven part and a tweened part of one motion move alike. Pure.
 */

/** Slow, fast, slow (GSAP's power2.inOut). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Fast, then settling (GSAP's power2.out). */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Overshoots by about `overshoot` / 10 before settling (GSAP's back.out(overshoot)). */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  const u = t - 1;
  return 1 + (overshoot + 1) * u * u * u + overshoot * u * u;
}

/** 0 below `edge0`, 1 above `edge1`, and a smooth S between them. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
