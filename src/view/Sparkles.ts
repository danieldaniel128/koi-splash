import { gsap } from 'gsap';
import { Container, Sprite } from 'pixi.js';
import type { PointData, Texture } from 'pixi.js';
import { CELEBRATION } from '../config/fx';
import { Pool } from '../core/Pool';

/**
 * Sparkles bursting out of a point and drifting up as they fade (the pond is won). Additive, over everything on the
 * pond; the sprites are reused.
 */
export class Sparkles extends Container {
  private readonly sprites: Pool<Sprite>;

  constructor(texture: Texture) {
    super();
    this.eventMode = 'none';
    this.sprites = new Pool<Sprite>({
      create: () => new Sprite({ texture, anchor: 0.5, blendMode: 'add' }),
      cap: CELEBRATION.sparkles,
      discard: (sprite) => {
        sprite.destroy();
      },
    });
  }

  /** `count` sparkles burst from `at`, up to `reach` px out. */
  burst(at: PointData, count: number, reach: number): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.sprites.acquire();
      const angle = Math.random() * Math.PI * 2;
      const out = reach * (0.35 + 0.65 * Math.sqrt(Math.random()));
      const life = CELEBRATION.life * (0.7 + Math.random() * 0.6);
      sprite.position.copyFrom(at);
      sprite.alpha = 1;
      sprite.setSize(CELEBRATION.size * (0.6 + Math.random() * 0.8));
      this.addChild(sprite);
      gsap
        .timeline({
          delay: Math.random() * CELEBRATION.spread,
          onComplete: () => {
            this.removeChild(sprite);
            this.sprites.release(sprite);
          },
        })
        .to(sprite, {
          x: at.x + Math.cos(angle) * out,
          y: at.y + Math.sin(angle) * out - CELEBRATION.drift,
          duration: life,
          ease: 'power2.out',
        })
        .to(sprite, { alpha: 0, duration: life * 0.6, ease: 'power1.in' }, life * 0.4);
    }
  }
}
