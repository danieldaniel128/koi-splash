import type { Container, PointData } from 'pixi.js';
import { CAMERA } from '../config/fx';
import { punchZoom, ScreenShake } from '../core/ScreenShake';

/** The player has asked the system for less motion. */
const LESS_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * The camera on the game's layer (the pond, the koi and the effects; the HTML HUD stays put): it shakes on hits and
 * pushes in on a point for a big moment. Players who ask for less motion get a gentler shake and no push-in. Driven
 * on the app's clock, so a hit-stop doesn't freeze it.
 */
export class Camera {
  private readonly shaking: ScreenShake;
  private readonly calm: boolean;
  private punchAt: PointData = { x: 0, y: 0 };
  private punchTime = Infinity;

  constructor(private readonly layer: Container) {
    this.calm = window.matchMedia(LESS_MOTION).matches;
    this.shaking = new ScreenShake(CAMERA.shake, this.calm ? CAMERA.shake.gentle : 1);
  }

  /** A hit: adds `amount` (0 to 1) to the shake. */
  shake(amount: number): void {
    this.shaking.add(amount);
  }

  /** Pushes in on `at` (the layer's space) and back out. */
  punch(at: PointData): void {
    if (this.calm) return;
    this.punchAt = at;
    this.punchTime = 0;
  }

  tick(deltaSeconds: number): void {
    const offset = this.shaking.tick(deltaSeconds);
    this.punchTime += deltaSeconds;
    const zoom = punchZoom(CAMERA.punch, this.punchTime);
    this.layer.scale.set(zoom);
    this.layer.position.set(offset.x + this.punchAt.x * (1 - zoom), offset.y + this.punchAt.y * (1 - zoom));
  }
}
