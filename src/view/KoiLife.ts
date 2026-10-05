import type { PointData } from 'pixi.js';
import { KOI_SWIM } from '../config/koi';
import { WATER } from '../config/water';
import type { Koi } from './Koi';
import type { WaterSurface } from './water/PondWater';

/** Where a koi was last frame, whether it moved since, and where it last pushed the water. */
interface Motion {
  x: number;
  y: number;
  moving: boolean;
  stampX: number;
  stampY: number;
}

/**
 * Keeps the koi alive and makes the water answer them. Every frame each koi swims in place (tail beat, sway),
 * faster while the animations move it. A moving koi pushes the water behind it every few px, and the pushes line
 * up into a thin V of ripples (a wake). Between moves, now and then one resting koi flicks its tail and turns,
 * sending a small ring out from its tail: one at a time, so the pond stays calm.
 */
export class KoiLife {
  private readonly motion = new WeakMap<Koi, Motion>();
  private flickIn: number;

  constructor(
    private readonly water: WaterSurface,
    /** Where the board's origin sits on the stage (koi positions are board-local). */
    private readonly boardOrigin: PointData,
    private readonly random: () => number = Math.random,
  ) {
    this.flickIn = this.between(KOI_SWIM.flickEvery);
  }

  /** Call once per frame with every koi on the board. O(K), K = koi. */
  update(koi: readonly Koi[], deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    for (const fish of koi) {
      const motion = this.motion.get(fish) ?? this.track(fish);
      const speed = Math.hypot(fish.x - motion.x, fish.y - motion.y) / deltaSeconds;
      motion.moving = speed > 0;
      motion.x = fish.x;
      motion.y = fish.y;
      fish.swim(deltaSeconds, speed);
      this.wake(fish, motion, speed);
    }
    this.flickIn -= deltaSeconds;
    if (this.flickIn <= 0) {
      this.flickIn = this.between(KOI_SWIM.flickEvery);
      this.flickOne(koi);
    }
  }

  /** Every WATER.wakeSpacing px of travel, a push just behind the koi along its path. */
  private wake(koi: Koi, motion: Motion, speed: number): void {
    const dx = koi.x - motion.stampX;
    const dy = koi.y - motion.stampY;
    const travelled = Math.hypot(dx, dy);
    if (travelled < WATER.wakeSpacing) return;
    motion.stampX = koi.x;
    motion.stampY = koi.y;
    if (koi.alpha < 0.5) return; // diving or surfacing: those make their own splash
    const behind = (koi.width * KOI_SWIM.tailAt) / travelled;
    const strength = Math.min(speed / WATER.wakeFullSpeed, 1);
    this.push(
      { x: koi.x - dx * behind, y: koi.y - dy * behind },
      WATER.wakePush * strength,
      WATER.wakeRadius,
    );
  }

  /** One resting koi flicks its tail: it turns, and a small ring leaves its tail. */
  private flickOne(koi: readonly Koi[]): void {
    const fish = koi[Math.floor(this.random() * koi.length)];
    // busy (diving, surfacing, swimming, swapping): skip this flick
    if (!fish || fish.alpha < 1 || this.motion.get(fish)?.moving) return;
    const side = this.random() < 0.5 ? -1 : 1;
    fish.flick(side * this.between(KOI_SWIM.flickTurn));
    this.push(fish.tailPoint(), WATER.flickPush, WATER.flickRadius);
  }

  private push(boardPoint: PointData, strength: number, radius: number): void {
    this.water.push(
      { x: this.boardOrigin.x + boardPoint.x, y: this.boardOrigin.y + boardPoint.y },
      strength,
      radius,
    );
  }

  private track(koi: Koi): Motion {
    const motion = { x: koi.x, y: koi.y, moving: false, stampX: koi.x, stampY: koi.y };
    this.motion.set(koi, motion);
    return motion;
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.random() * (max - min);
  }
}
