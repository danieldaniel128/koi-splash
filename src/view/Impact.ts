import { Sprite, Texture } from 'pixi.js';
import { IMPACT } from '../config/fx';
import { SPECIAL_FX } from '../config/specials';
import type { GameEventBus } from '../game/events';
import type { Camera } from './Camera';
import type { Haptics } from './Haptics';
import type { HitStop } from './HitStop';

/** What makes a moment hit: the camera, the hit-stop, a white flash over the pond and the phone's vibration. */
export interface ImpactParts {
  readonly camera: Camera;
  readonly hitStop: HitStop;
  readonly haptics: Haptics;
  /** The flash's sprite, over the effects and covering the stage. */
  readonly flash: Sprite;
}

/**
 * How hard each moment hits (after the prototype): every match shakes the pond a little, more for big ones and deep
 * in a cascade, and the big rounds hold the clock for an instant; each special shakes it as it fires, a newborn
 * special flashes white, and phones buzz on the specials and the long cascades. It listens to the game's events, which
 * are said when each moment happens on screen.
 */
export class Impact {
  constructor(
    events: GameEventBus,
    private readonly parts: ImpactParts,
  ) {
    parts.flash.alpha = 0;
    const { shake } = IMPACT;
    events.on('match', ({ round, size }) => {
      this.match(round, size);
    });
    events.on('specialBorn', () => {
      this.hit(shake.born, IMPACT.flash.born);
    });
    events.on('lineFired', () => {
      this.hit(shake.line, 0);
    });
    events.on('whirlPopped', () => {
      this.hit(shake.whirlPop, IMPACT.flash.special);
      parts.hitStop.hold(SPECIAL_FX.hitStop.time);
    });
    events.on('rainbowFired', () => {
      this.hit(shake.rainbow, IMPACT.flash.special);
      parts.hitStop.hold(SPECIAL_FX.hitStop.time);
    });
  }

  /** Fades the flash on the app's clock (a hit-stop doesn't hold it). */
  tick(deltaSeconds: number): void {
    const { flash, camera } = this.parts;
    flash.alpha = Math.max(0, flash.alpha - deltaSeconds * IMPACT.flash.decay);
    flash.visible = flash.alpha > 0;
    camera.tick(deltaSeconds);
  }

  /** A cascade round clears `size` koi: the shake grows with both, and a big round holds the clock. */
  private match(round: number, size: number): void {
    const { shake, hitStop } = IMPACT;
    const cascade = round + 1;
    this.parts.camera.shake(size * shake.perKoi + round * shake.perRound);
    const huge = size >= hitStop.hugeRound || cascade >= hitStop.hugeCascade;
    if (huge || size >= hitStop.bigRound || cascade >= hitStop.bigCascade) {
      this.parts.hitStop.hold(huge ? hitStop.huge : hitStop.big);
    }
    if (round >= IMPACT.vibrateFrom) this.parts.haptics.pulse(IMPACT.vibrate.combo);
  }

  /** A special's moment: a shake, a flash over the pond (0 for none) and a buzz. */
  private hit(shake: number, flash: number): void {
    this.parts.camera.shake(shake);
    this.parts.flash.alpha = Math.max(this.parts.flash.alpha, flash);
    this.parts.haptics.pulse(IMPACT.vibrate.special);
  }
}

/** The white flash over the pond: an additive sprite covering the stage, hidden until a moment lights it. */
export function createFlash(size: { width: number; height: number }): Sprite {
  const flash = new Sprite(Texture.WHITE);
  flash.setSize(size.width, size.height);
  flash.blendMode = 'add';
  flash.alpha = 0;
  flash.visible = false;
  flash.eventMode = 'none';
  return flash;
}
