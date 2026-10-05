import { easeInOutCubic, easeOutCubic } from './easing';

/** How a shake behaves: its reach at full (px), how fast it dies (per second) and how fast it jitters (Hz). */
export interface ShakeSpec {
  readonly max: number;
  readonly decay: number;
  readonly x: number;
  readonly y: number;
}

/**
 * A screen shake, after the prototype's: every hit adds to one shake level (0 to 1) that dies away steadily, and the
 * offset is the level squared times the reach, so small hits barely move the screen and big ones add up. Engine-free.
 */
export class ScreenShake {
  private level = 0;
  private time = 0;

  constructor(
    private readonly spec: ShakeSpec,
    /** Every hit is scaled by this (less for players who ask for less motion). */
    private readonly strength = 1,
  ) {}

  /** How shaken it is now, from 0 to 1. */
  get amount(): number {
    return this.level;
  }

  /** A hit: adds `amount` to the shake, up to full. */
  add(amount: number): void {
    this.level = Math.min(1, this.level + amount * this.strength);
  }

  /** Advances by one frame and returns the offset to draw at (px). O(1). */
  tick(deltaSeconds: number): { x: number; y: number } {
    this.time += deltaSeconds;
    this.level = Math.max(0, this.level - deltaSeconds * this.spec.decay);
    const reach = this.level * this.level * this.spec.max;
    return { x: Math.sin(this.time * this.spec.x) * reach, y: Math.cos(this.time * this.spec.y) * reach };
  }
}

/** How a push-in moves: its zoom, and how long it takes to go in, hold and come back out (s). */
export interface PunchSpec {
  readonly zoom: number;
  readonly in: number;
  readonly hold: number;
  readonly out: number;
}

/** The zoom of a push-in `t` s after it starts: 1, easing in to 1 + zoom, held, then easing back to 1. Pure. */
export function punchZoom(spec: PunchSpec, t: number): number {
  if (t < 0) return 1;
  if (t < spec.in) return 1 + spec.zoom * easeOutCubic(t / spec.in);
  const out = t - spec.in - spec.hold;
  if (out < 0) return 1 + spec.zoom;
  return 1 + spec.zoom * (1 - easeInOutCubic(Math.min(1, out / spec.out)));
}
