import { Sprite } from 'pixi.js';
import type { PointData, Texture } from 'pixi.js';
import { KOI_SWIM } from '../config/koi';
import type { Kind } from '../model/types';

/**
 * One koi on the board. Its position, scale, alpha and tint belong to the animations (swap, dive, fall); how it
 * swims is its own: a heading it turns toward, a slow sway, and a tail that beats through baked poses, faster
 * when it moves or has just flicked. Rotation is 0 when the head points up.
 */
export class Koi extends Sprite {
  /** The way the koi wants to point (radians). It turns toward it smoothly. */
  heading: number;
  /** The scale it has at rest; lifts and dives are relative to it. */
  readonly restScale: number;
  private facing: number;
  private tailPhase: number;
  private readonly swayPhase: number;
  private burst = 0;
  private time = 0;

  constructor(
    readonly kind: Kind,
    private readonly poses: readonly Texture[],
    size: number,
    random: () => number,
  ) {
    const [first] = poses;
    if (!first) throw new Error('a koi needs at least one pose');
    super(first);
    this.anchor.set(0.5);
    this.setSize(size);
    this.restScale = this.scale.x;
    this.heading = random() * Math.PI * 2;
    this.facing = this.heading;
    this.tailPhase = random();
    this.swayPhase = random() * Math.PI * 2;
    this.rotation = this.facing;
  }

  /** Advances the swim by one frame. `speed` is how fast the animations move it (px/s). O(1). */
  swim(deltaSeconds: number, speed: number): void {
    this.time += deltaSeconds;
    this.burst = Math.max(0, this.burst - deltaSeconds / KOI_SWIM.flickCalm);
    const beat = Math.min(
      KOI_SWIM.restBeat + (speed / 100) * KOI_SWIM.beatPerSpeed + this.burst * KOI_SWIM.flickBeat,
      KOI_SWIM.maxBeat,
    );
    this.tailPhase = (this.tailPhase + beat * deltaSeconds) % 1;
    this.texture = this.poses[Math.floor(this.tailPhase * this.poses.length)] ?? this.texture;

    const turn = 1 - Math.exp(-KOI_SWIM.turnRate * deltaSeconds);
    this.facing += shortestTurn(this.facing, this.heading) * turn;
    const sway = Math.sin(this.time * KOI_SWIM.swaySpeed + this.swayPhase) * KOI_SWIM.sway;
    this.rotation = this.facing + sway;
  }

  /** A tail flick: turns the koi by `turn` radians and beats the tail hard for a moment. */
  flick(turn: number): void {
    this.heading = this.facing + turn;
    this.burst = 1;
  }

  /** Turns the koi's heading part of the way (`share`, 0..1) toward `angle`, the short way round. */
  turnToward(angle: number, share: number): void {
    this.heading += shortestTurn(this.heading, angle) * share;
  }

  /** Where the tail is now, in the board's space: the water is pushed from there. */
  tailPoint(): PointData {
    const reach = this.width * KOI_SWIM.tailAt;
    return { x: this.x - Math.sin(this.rotation) * reach, y: this.y + Math.cos(this.rotation) * reach };
  }
}

/** The signed angle (radians, -PI..PI) to turn from `from` to reach `to` the short way round. */
function shortestTurn(from: number, to: number): number {
  const full = Math.PI * 2;
  return ((((to - from) % full) + full * 1.5) % full) - Math.PI;
}
