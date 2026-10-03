import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { POINTS, SPLASH } from '../config/fx';

/**
 * Effects drawn over the water where koi dive: thin ink rings that spread and fade, a few droplets thrown up, and
 * the points the match earned. Everything is short-lived and thin, so the board is readable again at once.
 * Positions are in the board's space: this layer sits exactly on the board.
 */
export class SplashFx extends Container {
  /** Score labels are reused: making a Text draws a canvas, too slow to do for every match. */
  private readonly spareLabels: Text[] = [];

  /** A koi dives at `at`: rings spread from it and droplets fly up. O(rings + droplets). */
  splash(at: PointData): void {
    for (let i = 0; i < SPLASH.rings; i++) this.ring(at, i * SPLASH.ringGap);
    for (let i = 0; i < SPLASH.droplets; i++) this.droplet(at, (i + Math.random() * 0.6) / SPLASH.droplets);
  }

  /** The points a match earned rise from `at` and fade. */
  points(at: PointData, amount: number): void {
    const label = this.spareLabels.pop() ?? createLabel();
    label.text = `+${amount}`;
    label.position.copyFrom(at);
    label.alpha = 1;
    label.scale.set(0.4);
    this.addChild(label);
    gsap
      .timeline({
        onComplete: () => {
          this.removeChild(label);
          this.spareLabels.push(label);
        },
      })
      .to(label.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(3)' }, 0)
      .to(label, { y: at.y - POINTS.rise, duration: POINTS.life, ease: 'power1.out' }, 0)
      .to(label, { alpha: 0, duration: POINTS.life * 0.35 }, POINTS.life * 0.65);
  }

  /** One ring: grows fast then slows, thinning and fading as it goes. */
  private ring(at: PointData, delay: number): void {
    const ring = new Graphics();
    this.addChild(ring);
    const spread = { t: 0 };
    const [widthFrom, widthTo] = SPLASH.ringWidth;
    gsap.to(spread, {
      t: 1,
      duration: SPLASH.ringLife,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        const { t } = spread;
        ring
          .clear()
          .circle(at.x, at.y, SPLASH.ringFrom + (SPLASH.ringTo - SPLASH.ringFrom) * t)
          .stroke({ width: widthFrom + (widthTo - widthFrom) * t, color: SPLASH.ink, alpha: (1 - t) * 0.95 });
      },
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  /** One droplet: thrown outward, swelling as it rises toward the viewer, then shrinking as it falls back. */
  private droplet(at: PointData, turn: number): void {
    const angle = turn * Math.PI * 2;
    const [near, far] = SPLASH.dropletReach;
    const reach = near + Math.random() * (far - near);
    const life = SPLASH.dropletLife * (0.8 + Math.random() * 0.4);
    const drop = new Graphics().circle(0, 0, SPLASH.dropletSize).fill(SPLASH.ink);
    drop.position.copyFrom(at);
    this.addChild(drop);
    gsap
      .timeline({
        onComplete: () => {
          drop.destroy();
        },
      })
      .to(drop, { x: at.x + Math.cos(angle) * reach, y: at.y + Math.sin(angle) * reach, duration: life }, 0)
      .to(drop.scale, { x: 1.5, y: 1.5, duration: life * 0.4, ease: 'power2.out' }, 0)
      .to(drop.scale, { x: 0.4, y: 0.4, duration: life * 0.6, ease: 'power2.in' }, life * 0.4)
      .to(drop, { alpha: 0, duration: life * 0.3 }, life * 0.7);
  }
}

function createLabel(): Text {
  const label = new Text({
    text: '',
    style: {
      fill: POINTS.fill,
      fontSize: POINTS.fontSize,
      fontWeight: '800',
      fontFamily: 'Georgia, "Times New Roman", serif',
      stroke: { color: POINTS.stroke, width: 4, join: 'round' },
    },
  });
  label.anchor.set(0.5);
  return label;
}
