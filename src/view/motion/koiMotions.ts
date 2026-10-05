import { gsap } from 'gsap';
import type { PointData } from 'pixi.js';
import type { Koi } from '../Koi';

/**
 * The building blocks the board's motions are made of. Each returns a timeline that starts at 0, so a caller can
 * delay it, chain it after another or play several at once, the way DOTween sequences are put together. Times are in
 * seconds and sizes are shares of the koi's rest scale; the numbers come from the callers' config.
 */

/**
 * Sinks into the deep from the size it has when the sink starts: shrinking, fading and taking on the water's colour
 * (Koi.setDepth) until it's gone.
 */
export function sink(koi: Koi, duration: number): gsap.core.Timeline {
  const sunk = { depth: 0 };
  let size = koi.restScale;
  return gsap.timeline().to(sunk, {
    depth: 1,
    duration,
    ease: 'power1.in',
    onStart: () => {
      size = koi.scale.x;
    },
    onUpdate: () => {
      koi.setDepth(sunk.depth, size);
    },
  });
}

/** Rises from the deep to the surface (deep at once, so it waits there unseen): a sink played back, settling. */
export function rise(koi: Koi, duration: number): gsap.core.Timeline {
  const sunk = { depth: 1 };
  koi.setDepth(1);
  return gsap.timeline().to(sunk, {
    depth: 0,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      koi.setDepth(sunk.depth);
    },
  });
}

/** How a spiral turns: by `turn` radians round its point, shrinking by `shrink` of its size. */
export interface SpiralTurn {
  readonly duration: number;
  readonly turn: number;
  readonly shrink: number;
}

/** Swirls round a point and into it: the offset turns by `turn` and shrinks to nothing as the koi fades. */
export function spiral(koi: Koi, toward: PointData, move: SpiralTurn): gsap.core.Timeline {
  const rest = koi.restScale;
  const k = { e: 0 };
  let from: PointData = { x: 0, y: 0 };
  return gsap.timeline().to(k, {
    e: 1,
    duration: move.duration,
    ease: 'power2.inOut',
    onStart: () => {
      from = { x: koi.x, y: koi.y }; // where it is when it sets off, not when the spiral was made
    },
    onUpdate: () => {
      const dx = from.x - toward.x;
      const dy = from.y - toward.y;
      const angle = move.turn * k.e;
      const reach = 1 - k.e;
      koi.x = toward.x + (Math.cos(angle) * dx - Math.sin(angle) * dy) * reach;
      koi.y = toward.y + (Math.sin(angle) * dx + Math.cos(angle) * dy) * reach;
      koi.heading = Math.atan2(toward.x - koi.x, koi.y - toward.y) - 1.2; // nose round the (clockwise) turn
      koi.scale.set(rest * (1 - move.shrink * k.e));
      koi.alpha = 1 - 0.8 * k.e * k.e;
    },
  });
}

/** Swells to `size` times its rest scale with an overshoot (a hit lands on it). */
export function pop(koi: Koi, size: number, duration: number): gsap.core.Timeline {
  const to = koi.restScale * size;
  return gsap.timeline().to(koi.scale, { x: to, y: to, duration, ease: 'back.out(2)' });
}

/** Squashes to `size` times its rest scale and springs back (a touch, a bump). */
export function squash(koi: Koi, size: number, duration: number): gsap.core.Timeline {
  const to = koi.restScale * size;
  return gsap
    .timeline()
    .to(koi.scale, { x: to, y: to, duration: duration * 0.35, ease: 'power2.out' })
    .to(koi.scale, { x: koi.restScale, y: koi.restScale, duration: duration * 0.65, ease: 'back.out(3)' });
}

/** Shakes its head: rocks side to side by `angle` radians, `times` times, dying away over `duration`. */
export function headShake(koi: Koi, angle: number, times: number, duration: number): gsap.core.Timeline {
  const k = { t: 0 };
  return gsap.timeline().to(k, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      koi.tilt = angle * Math.sin(k.t * Math.PI * 2 * times) * (1 - k.t);
    },
    onComplete: () => {
      koi.tilt = 0;
    },
    onInterrupt: () => {
      koi.tilt = 0;
    },
  });
}

/** Fades to `alpha` over `duration`. */
export function fadeTo(target: { alpha: number }, alpha: number, duration: number): gsap.core.Timeline {
  return gsap.timeline().to(target, { alpha, duration, ease: 'power2.in' });
}
