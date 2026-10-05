import { Sprite, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { CELEBRATION, IMPACT } from '../config/fx';
import { SPECIAL_FX } from '../config/specials';
import type { GameEventBus } from '../game/events';
import type { Camera } from './Camera';
import type { Haptics } from './Haptics';
import type { HitStop } from './HitStop';
import type { Sparkles } from './Sparkles';

/** What makes a moment hit: the camera, the hit-stop, a white flash over the pond and the phone's vibration. */
export interface ImpactParts {
  readonly camera: Camera;
  readonly hitStop: HitStop;
  readonly haptics: Haptics;
  /** The flash's sprite, over the effects and covering the stage. */
  readonly flash: Sprite;
  /** The sparkles a win bursts into, and where the board's middle is and how big a cell is (stage px). */
  readonly sparkles: Sparkles;
  readonly boardCentre: PointData;
  readonly cellSize: number;
}

/**
 * How hard each moment hits (after the prototype): every match shakes the pond a little, more for big ones and deep
 * in a cascade, and the big rounds hold the clock for an instant; each special shakes it as it fires, a newborn
 * special flashes white, and phones buzz on the specials and the long cascades; a won pond bursts into sparkles as
 * the camera pushes in. It listens to the game's events, which are said when each moment happens on screen.
 */
export class Impact {
  constructor(
    events: GameEventBus,
    private readonly parts: ImpactParts,
  ) {
    parts.flash.alpha = 0;
    const { shake } = IMPACT;
    events.on('match', ({ roundIndex, size }) => {
      this.match(roundIndex, size);
    });
    events.on('specialBorn', () => {
      this.hit(shake.born, IMPACT.flash.born);
    });
    events.on('stripedFired', () => {
      this.hit(shake.striped, 0);
    });
    events.on('whirlpoolPopped', () => {
      this.hit(shake.whirlpool, IMPACT.flash.special);
      parts.hitStop.hold(SPECIAL_FX.hitStop.time);
    });
    events.on('rainbowFired', () => {
      this.hit(shake.rainbow, IMPACT.flash.special);
      parts.hitStop.hold(SPECIAL_FX.hitStop.time);
    });
    events.on('won', () => {
      this.celebrate();
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
  private match(roundIndex: number, size: number): void {
    const { shake, hitStop } = IMPACT;
    const cascade = roundIndex + 1;
    this.parts.camera.shake(size * shake.perKoi + roundIndex * shake.perRound);
    const huge = size >= hitStop.hugeRound || cascade >= hitStop.hugeCascade;
    if (huge || size >= hitStop.bigRound || cascade >= hitStop.bigCascade) {
      this.parts.hitStop.hold(huge ? hitStop.huge : hitStop.big);
    }
    if (roundIndex >= IMPACT.vibrateFrom) this.parts.haptics.pulse(IMPACT.vibrate.combo);
  }

  /** The pond is won: sparkles burst from its middle as the camera pushes in on it, with a flash and a buzz. */
  private celebrate(): void {
    const { camera, sparkles, boardCentre, cellSize } = this.parts;
    camera.punch(boardCentre);
    camera.shake(IMPACT.shake.win);
    this.parts.flash.alpha = IMPACT.flash.win;
    sparkles.burst(boardCentre, CELEBRATION.count, CELEBRATION.reach * cellSize);
    this.parts.haptics.pulse(IMPACT.vibrate.win);
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
