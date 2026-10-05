import { gsap } from 'gsap';
import type { PointData } from 'pixi.js';
import { TIMING } from '../config/timing';
import type { Special } from '../model/types';
import type { Koi } from './Koi';
import { play } from './motion/play';
import { pop, sink, spiral } from './motion/koiMotions';

/** How far round a merging koi spirals into its special, and a drained koi into its whirlpool (radians). */
const MERGE_TURN = 2.4;
const DRAIN_TURN = 4.4;

/**
 * How koi leave the board around the specials (after the prototype's): a shape's koi spiral into the special they
 * make; a whirlpool's neighbours are sucked round and down into its eye; a rainbow's targets flash and shiver as its
 * beam lands, then sink; and each special leaves in its own way once it has fired. Each motion resolves when the
 * koi is gone; the caller removes it.
 */
export class SpecialMotions {
  /** A koi spirals into the special its shape made, shrinking and glowing out as it goes. */
  async merge(koi: Koi, toward: PointData, delay: number, duration: number): Promise<void> {
    await play(spiral(koi, toward, { duration, turn: MERGE_TURN, shrink: 0.55 }).delay(delay));
  }

  /** A koi is sucked round and down into a whirlpool's eye. */
  async drain(koi: Koi, toward: PointData, delay: number, duration: number): Promise<void> {
    await play(spiral(koi, toward, { duration, turn: DRAIN_TURN, shrink: 0.6 }).delay(delay));
  }

  /** A rainbow's beam lands on a koi: it swells and flashes white, then sinks away. */
  async zap(koi: Koi, delay: number): Promise<void> {
    await play(
      gsap
        .timeline({ delay })
        .add(pop(koi, 1.2, 0.12))
        .add(sink(koi, TIMING.specials.dive)),
    );
  }

  /**
   * A special leaves after it fires: a striped koi dives with its sweep, a whirlpool's koi spins on in its eye and
   * sinks as the eddy pops, a rainbow koi rises and spins, then dissolves in its own light.
   */
  async exit(koi: Koi, special: Special, delay: number, lasts: number): Promise<void> {
    if (special.type === 'line') {
      await play(sink(koi, lasts).delay(delay));
      return;
    }
    const rest = koi.restScale;
    if (special.type === 'whirl') {
      await play(
        gsap.to(koi.scale, {
          x: rest * 0.15,
          y: rest * 0.15,
          delay: delay + lasts * 0.5,
          duration: lasts * 0.5,
          ease: 'power2.in',
        }),
      );
      return;
    }
    const rise = TIMING.specials.rainbowRise;
    await play(
      gsap
        .timeline({ delay })
        .to(koi.scale, { x: rest * 1.3, y: rest * 1.3, duration: rise, ease: 'back.out(2)' }, 0)
        .to(koi, { heading: koi.heading + Math.PI * 2, duration: rise, ease: 'sine.inOut' }, 0)
        .to(
          koi.scale,
          { x: rest * 1.9, y: rest * 1.9, duration: Math.max(0.2, lasts - rise), ease: 'sine.in' },
          rise,
        )
        .to(koi, { alpha: 0, duration: Math.max(0.2, lasts - rise), ease: 'power2.in' }, rise),
    );
  }
}
