import { gsap } from 'gsap';
import { Container, Sprite, Text, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { paintDroplet, paintFoamBurst, paintGlow } from '../art/glow';
import { POINTS, SPLASH } from '../config/fx';
import type { RippleSurface } from './BoardAnimator';

/** Pixel size the flash, foam and droplet textures are painted at (then scaled to their stage size). */
const FLASH_TEXTURE = 128;
const FOAM_TEXTURE = 160;
const DROPLET_TEXTURE = 32;
/** Different foam bursts painted at startup; each dive picks one, turned any way, so no two splashes match. */
const FOAM_VARIANTS = 4;

/**
 * Effects drawn over the water where a match dives: one splash per match (a bright flash over the whole match, a burst
 * of foam where each koi goes under, and droplets of different sizes thrown up in arcs, each landing with a small ring
 * of its own) and the points the match earned, which fly up to the score. Everything is short-lived, so the board is
 * readable again at once.
 * Positions are in the board's space: this layer sits exactly on the board.
 */
export class SplashFx extends Container {
  /** Score labels are reused: making a Text draws a canvas, too slow to do for every match. */
  private readonly spareLabels: Text[] = [];
  private readonly flashTexture = Texture.from(paintGlow(SPLASH.flash, FLASH_TEXTURE, SPLASH.flashCore));
  private readonly dropletTexture = Texture.from(paintDroplet(SPLASH.ink, DROPLET_TEXTURE));
  private readonly foamTextures: Texture[] = [];

  constructor(
    /** Where the score is shown, in this layer's space: the points fly there. */
    private readonly scoreAt: PointData,
    /** The pond: landing droplets push it. */
    private readonly water: RippleSurface,
    private readonly random: () => number = Math.random,
  ) {
    super();
    for (let i = 0; i < FOAM_VARIANTS; i++) {
      this.foamTextures.push(Texture.from(paintFoamBurst(SPLASH.ink, FOAM_TEXTURE, SPLASH.foamBlobs, random)));
    }
  }

  /**
   * A match dives at these points: one flash stretched over all of them, a burst of foam at each, and droplets thrown
   * up from each. O(droplets).
   */
  splash(points: readonly PointData[]): void {
    if (points.length === 0) return;
    this.flash(points);
    for (const point of points) this.foam(point);
    const extra = Math.max(0, points.length - 3) * SPLASH.dropletsPerExtraKoi;
    for (let i = 0; i < SPLASH.droplets + extra; i++) {
      const from = points[Math.floor(this.random() * points.length)] ?? points[0];
      if (from) this.droplet(from);
    }
  }

  /** The points a match earned pop up at `at`, then fly to the score and shrink into it. */
  points(at: PointData, amount: number): void {
    const label = this.spareLabels.pop() ?? createLabel();
    label.text = `+${amount}`;
    label.position.copyFrom(at);
    label.alpha = 1;
    label.scale.set(0.4);
    this.addChild(label);
    const flyAt = POINTS.pop + POINTS.hold;
    gsap
      .timeline({
        onComplete: () => {
          this.removeChild(label);
          this.spareLabels.push(label);
        },
      })
      .to(label.scale, { x: 1, y: 1, duration: POINTS.pop, ease: 'back.out(3)' }, 0)
      .to(label, { y: at.y - POINTS.rise, duration: flyAt, ease: 'power1.out' }, 0)
      .to(label, { x: this.scoreAt.x, y: this.scoreAt.y, duration: POINTS.flight, ease: 'power2.in' }, flyAt)
      .to(label.scale, { x: POINTS.landScale, y: POINTS.landScale, duration: POINTS.flight, ease: 'power1.in' }, flyAt)
      .to(label, { alpha: 0, duration: 0.1 }, flyAt + POINTS.flight - 0.1);
  }

  /** A soft flash over the whole match, stretched along it, that blooms and fades. */
  private flash(points: readonly PointData[]): void {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const width = SPLASH.flashSize + (right - left) * SPLASH.flashStretch;
    const height = SPLASH.flashSize + (bottom - top) * SPLASH.flashStretch;
    const flash = this.bloom(this.flashTexture, { x: (left + right) / 2, y: (top + bottom) / 2 }, width, height);
    flash.blendMode = 'add';
    this.fade(flash, SPLASH.flashLife, SPLASH.flashAlpha, 0);
  }

  /** A burst of foam where one koi goes under: one of the painted bursts, any size in range, turned any way. */
  private foam(at: PointData): void {
    const texture = this.foamTextures[Math.floor(this.random() * this.foamTextures.length)];
    if (!texture) return;
    const size = this.between(SPLASH.foamSize);
    const foam = this.bloom(texture, at, size, size);
    foam.rotation = this.random() * Math.PI * 2;
    this.fade(foam, SPLASH.foamLife, SPLASH.foamAlpha, this.random() * SPLASH.foamStagger);
  }

  /** A sprite centred at `at`, `width` x `height` px when fully bloomed (see fade). */
  private bloom(texture: Texture, at: PointData, width: number, height: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.copyFrom(at);
    sprite.width = width;
    sprite.height = height;
    this.addChild(sprite);
    return sprite;
  }

  /** Blooms a sprite out from a third of its size to its full size while it fades from `alpha`, then removes it. */
  private fade(sprite: Sprite, life: number, alpha: number, delay: number): void {
    const { x, y } = sprite.scale;
    sprite.scale.set(x * 0.35, y * 0.35);
    sprite.alpha = alpha;
    gsap
      .timeline({
        delay,
        onComplete: () => {
          sprite.destroy();
        },
      })
      .to(sprite.scale, { x, y, duration: life, ease: 'power3.out' }, 0)
      .to(sprite, { alpha: 0, duration: life, ease: 'power1.in' }, 0);
  }

  /**
   * One droplet: thrown out from a koi in a random direction, it arcs up (lifted on screen and swelling as it
   * nears the viewer), falls back and lands, pushing a small ring into the water where it lands.
   */
  private droplet(from: PointData): void {
    const angle = this.random() * Math.PI * 2;
    const reach = this.between(SPLASH.dropletReach);
    const start = { x: from.x + Math.cos(angle) * SPLASH.dropletStart, y: from.y + Math.sin(angle) * SPLASH.dropletStart };
    const land = { x: from.x + Math.cos(angle) * reach, y: from.y + Math.sin(angle) * reach };
    const arc = this.between(SPLASH.dropletArc);
    const size = (this.between(SPLASH.dropletSize) * 2) / DROPLET_TEXTURE;
    const drop = new Sprite(this.dropletTexture);
    drop.anchor.set(0.5);
    this.addChild(drop);
    const flight = { t: 0 };
    gsap.to(flight, {
      t: 1,
      duration: this.between(SPLASH.dropletLife),
      ease: 'none',
      onUpdate: () => {
        const { t } = flight;
        const lift = Math.sin(t * Math.PI);
        const out = 1 - (1 - t) * (1 - t); // fast out of the water, slowing as it falls
        drop.position.set(start.x + (land.x - start.x) * out, start.y + (land.y - start.y) * out - arc * lift);
        drop.scale.set(size * (1 + 0.6 * lift));
      },
      onComplete: () => {
        drop.destroy();
        this.water.ripple(this.toGlobal(land), SPLASH.landPush, SPLASH.landRadius);
      },
    });
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.random() * (max - min);
  }
}

function createLabel(): Text {
  const label = new Text({
    text: '',
    style: {
      fill: POINTS.fill,
      fontSize: POINTS.fontSize,
      fontWeight: '800',
      fontFamily: POINTS.font,
      stroke: { color: POINTS.stroke, width: 4, join: 'round' },
    },
  });
  label.anchor.set(0.5);
  return label;
}
