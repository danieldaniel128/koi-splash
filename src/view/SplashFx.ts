import { gsap } from 'gsap';
import { Container, Sprite, Text, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { paintCrown, paintDroplet, paintGlow } from '../art/glow';
import { POINTS, SPLASH } from '../config/fx';
import type { RippleSurface } from './BoardAnimator';

/** Pixel size the flash, crown and droplet textures are painted at (then scaled to their stage size). */
const FLASH_TEXTURE = 128;
const CROWN_TEXTURE = 192;
const DROPLET_TEXTURE = 32;

/** The area a match covers: its centre, and how far it reaches (px) along x and y. */
interface Spread {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Effects drawn over the water where a match dives: one splash per match (a bright flash, a broken crown of foam
 * thrown out, and droplets of different sizes thrown up in arcs, each landing with a small ring of its own) and the
 * points the match earned, which fly up to the score. Everything is short-lived, so the board is readable again at
 * once.
 * Positions are in the board's space: this layer sits exactly on the board.
 */
export class SplashFx extends Container {
  /** Score labels are reused: making a Text draws a canvas, too slow to do for every match. */
  private readonly spareLabels: Text[] = [];
  private readonly flashTexture = Texture.from(paintGlow(SPLASH.flash, FLASH_TEXTURE, SPLASH.flashCore));
  private readonly dropletTexture = Texture.from(paintDroplet(SPLASH.ink, DROPLET_TEXTURE));
  private readonly crownTexture: Texture;

  constructor(
    /** Where the score is shown, in this layer's space: the points fly there. */
    private readonly scoreAt: PointData,
    /** The pond: landing droplets push it. */
    private readonly water: RippleSurface,
    private readonly random: () => number = Math.random,
  ) {
    super();
    this.crownTexture = Texture.from(paintCrown(SPLASH.ink, CROWN_TEXTURE, random));
  }

  /**
   * A match dives at these points: one flash and one crown of foam stretched over all of them, and droplets thrown
   * up from each. O(droplets).
   */
  splash(points: readonly PointData[]): void {
    if (points.length === 0) return;
    const spread = spreadOf(points);
    this.bloom(this.flashTexture, spread, SPLASH.flashSize, SPLASH.flashLife, SPLASH.flashAlpha).blendMode = 'add';
    // half turns only, so a crown stretched along a line of koi stays along it
    this.bloom(this.crownTexture, spread, SPLASH.crownSize, SPLASH.crownLife, SPLASH.crownAlpha).rotation =
      Math.round(this.random()) * Math.PI;
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

  /**
   * A sprite over the whole match that blooms out from a third of its size and fades: `size` px across plus the
   * match's own length, so a line of koi gets a long splash along it.
   */
  private bloom(texture: Texture, spread: Spread, size: number, life: number, alpha: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(spread.x, spread.y);
    const scaleX = (size + spread.width) / texture.width;
    const scaleY = (size + spread.height) / texture.height;
    sprite.scale.set(scaleX * 0.35, scaleY * 0.35);
    sprite.alpha = alpha;
    this.addChild(sprite);
    gsap
      .timeline({
        onComplete: () => {
          sprite.destroy();
        },
      })
      .to(sprite.scale, { x: scaleX, y: scaleY, duration: life, ease: 'power3.out' }, 0)
      .to(sprite, { alpha: 0, duration: life, ease: 'power1.in' }, 0);
    return sprite;
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

/** The centre of some points and how far they reach along x and y. */
function spreadOf(points: readonly PointData[]): Spread {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
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
