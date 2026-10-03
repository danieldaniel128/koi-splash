import type { Sprite } from 'pixi.js';
import { WATER } from '../../config/water';

/** Pushes the water surface at a stage point (see WaterSim.drop). */
export interface WaterSurface {
  drop(stageX: number, stageY: number, radius: number, push: number): void;
}

/** What a koi was doing last frame. */
interface KoiMotion {
  x: number;
  y: number;
  /** Seconds until the next tail flick. */
  flickIn: number;
  /** Current strength of the tail-flick wiggle (0 = still). */
  wiggle: number;
}

/**
 * Makes the water react to the koi. Every frame: a koi on the move leaves a wake behind it, stronger the faster it
 * goes, and a resting koi now and then flicks its tail, wiggling and sending out a small ripple.
 */
export class FishWake {
  private readonly motion = new WeakMap<Sprite, KoiMotion>();
  private time = 0;

  constructor(
    private readonly water: WaterSurface,
    /** Where the board's origin sits on the stage (koi positions are board-local). */
    private readonly boardOrigin: { readonly x: number; readonly y: number },
    private readonly koiSize: number,
  ) {}

  /** Call once per frame with every koi on the board. O(K), K = koi. */
  update(koi: Iterable<Sprite>, deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    this.time += deltaSeconds;
    for (const sprite of koi) {
      const motion = this.motion.get(sprite) ?? this.startTracking(sprite);
      const speed = Math.hypot(sprite.x - motion.x, sprite.y - motion.y) / deltaSeconds;
      if (speed > WATER.wakeMinSpeed) this.wake(sprite, speed);
      else this.rest(sprite, motion, deltaSeconds);
      motion.x = sprite.x;
      motion.y = sprite.y;
    }
  }

  private wake(sprite: Sprite, speed: number): void {
    const strength = Math.min(speed / WATER.wakeFullSpeed, 1);
    this.water.drop(this.stageX(sprite), this.stageY(sprite), WATER.wakeRadius, -WATER.wakePush * strength);
  }

  /** A resting koi: count down to the next tail flick, and let the last wiggle settle. */
  private rest(sprite: Sprite, motion: KoiMotion, deltaSeconds: number): void {
    motion.flickIn -= deltaSeconds;
    if (motion.flickIn <= 0) {
      motion.flickIn = randomFlickDelay();
      motion.wiggle = 1;
      const tailY = this.stageY(sprite) + this.koiSize * 0.4; // the koi face up, so the tail is below the centre
      this.water.drop(this.stageX(sprite), tailY, WATER.flickRadius, -WATER.flickPush);
    }
    motion.wiggle = Math.max(0, motion.wiggle - deltaSeconds * WATER.flickSettle);
    sprite.rotation = Math.sin(this.time * 18) * WATER.flickTurn * motion.wiggle;
  }

  private startTracking(sprite: Sprite): KoiMotion {
    const motion = { x: sprite.x, y: sprite.y, flickIn: randomFlickDelay(), wiggle: 0 };
    this.motion.set(sprite, motion);
    return motion;
  }

  private stageX(sprite: Sprite): number {
    return this.boardOrigin.x + sprite.x;
  }

  private stageY(sprite: Sprite): number {
    return this.boardOrigin.y + sprite.y;
  }
}

function randomFlickDelay(): number {
  const [min, max] = WATER.flickEvery;
  return min + Math.random() * (max - min);
}
