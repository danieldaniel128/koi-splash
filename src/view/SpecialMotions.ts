import { gsap } from 'gsap';
import { Color } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { TIMING } from '../config/timing';
import type { Special } from '../model/types';
import type { Koi } from './Koi';

const WHITE = 0xffffff;
const UNDERWATER = new Color(TIMING.diveTint).toNumber();

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
    await this.spiral(koi, toward, { delay, duration, turn: MERGE_TURN, shrink: 0.55 });
  }

  /** A koi is sucked round and down into a whirlpool's eye. */
  async drain(koi: Koi, toward: PointData, delay: number, duration: number): Promise<void> {
    await this.spiral(koi, toward, { delay, duration, turn: DRAIN_TURN, shrink: 0.6 });
  }

  /** A rainbow's beam lands on a koi: it swells and flashes white, then sinks away. */
  async zap(koi: Koi, delay: number): Promise<void> {
    const rest = koi.restScale;
    await gsap
      .timeline({ delay })
      .to(koi.scale, { x: rest * 1.2, y: rest * 1.2, duration: 0.12, ease: 'back.out(2)' }, 0)
      .call(() => {
        koi.tint = WHITE;
      })
      .add(this.sinkTween(koi, TIMING.specials.dive));
  }

  /**
   * A special leaves after it fires: a striped koi dives with its sweep, a whirlpool's koi spins on in its eye and
   * sinks as the eddy pops, a rainbow koi rises and spins, then dissolves in its own light.
   */
  async exit(koi: Koi, special: Special, delay: number, lasts: number): Promise<void> {
    if (special.type === 'line') {
      await gsap.timeline({ delay }).add(this.sinkTween(koi, lasts));
      return;
    }
    const rest = koi.restScale;
    if (special.type === 'whirl') {
      await gsap.to(koi.scale, {
        x: rest * 0.15,
        y: rest * 0.15,
        delay: delay + lasts * 0.5,
        duration: lasts * 0.5,
        ease: 'power2.in',
      });
      return;
    }
    const rise = TIMING.specials.rainbowRise;
    await gsap
      .timeline({ delay })
      .to(koi.scale, { x: rest * 1.3, y: rest * 1.3, duration: rise, ease: 'back.out(2)' }, 0)
      .to(koi, { heading: koi.heading + Math.PI * 2, duration: rise, ease: 'sine.inOut' }, 0)
      .to(
        koi.scale,
        { x: rest * 1.9, y: rest * 1.9, duration: Math.max(0.2, lasts - rise), ease: 'sine.in' },
        rise,
      )
      .to(koi, { alpha: 0, duration: Math.max(0.2, lasts - rise), ease: 'power2.in' }, rise);
  }

  /** Swirls a koi round a point and into it: the offset turns by `turn` and shrinks to nothing as it fades. */
  private async spiral(
    koi: Koi,
    toward: PointData,
    move: { delay: number; duration: number; turn: number; shrink: number },
  ): Promise<void> {
    const dx = koi.x - toward.x;
    const dy = koi.y - toward.y;
    const rest = koi.restScale;
    const k = { e: 0 };
    await gsap.to(k, {
      e: 1,
      delay: move.delay,
      duration: move.duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const angle = move.turn * k.e;
        const reach = 1 - k.e;
        koi.x = toward.x + (Math.cos(angle) * dx - Math.sin(angle) * dy) * reach;
        koi.y = toward.y + (Math.sin(angle) * dx + Math.cos(angle) * dy) * reach;
        koi.heading = Math.atan2(toward.x - koi.x, koi.y - toward.y) + 1.2; // nose round the turn
        koi.scale.set(rest * (1 - move.shrink * k.e));
        koi.alpha = 1 - 0.8 * k.e * k.e;
      },
    });
  }

  /** The koi sinks: it shrinks and takes on the water's colour until it's gone. */
  private sinkTween(koi: Koi, duration: number): gsap.core.Timeline {
    const deep = koi.restScale * TIMING.diveScale;
    const sink = { depth: 0 };
    return gsap
      .timeline()
      .to(koi.scale, { x: deep, y: deep, duration, ease: 'power1.in' }, 0)
      .to(
        sink,
        {
          depth: 1,
          duration,
          ease: 'power1.in',
          onUpdate: () => {
            koi.alpha = 1 - sink.depth * sink.depth;
            koi.tint = mixColor(WHITE, UNDERWATER, sink.depth);
          },
        },
        0,
      );
  }
}

/** Blends two colours (0xRRGGBB) by `amount` (0 = a, 1 = b). */
function mixColor(a: number, b: number, amount: number): number {
  const mix = (shift: number): number => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };
  return mix(16) | mix(8) | mix(0);
}
