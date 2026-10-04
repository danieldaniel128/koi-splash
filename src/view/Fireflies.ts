import { Container, Sprite, Texture } from 'pixi.js';
import { paintGlow } from '../art/glow';

/** How a firefly wanders and glows (seconds, px). */
export interface FireflyLook {
  /** Where each one hovers, stage px. */
  readonly spots: readonly (readonly [number, number])[];
  /** How far it wanders from its spot, and the size and colour of its glow. */
  readonly roam: number;
  readonly size: number;
  readonly color: string;
}

interface Firefly {
  readonly sprite: Sprite;
  readonly home: readonly [number, number];
  readonly phase: number;
  readonly blink: number;
}

/**
 * A few fireflies drifting over the bank on the moonlit night: soft glowing dots that wander in slow loops and
 * pulse on and off, each at its own pace. They keep to the bank, never over the board.
 */
export class Fireflies extends Container {
  private readonly flies: Firefly[];
  private readonly roam: number;
  private time = 0;

  constructor(look: FireflyLook, random: () => number = Math.random) {
    super();
    const glow = Texture.from(paintGlow(look.color, 64));
    this.flies = look.spots.map((home) => {
      const sprite = new Sprite(glow);
      sprite.anchor.set(0.5);
      sprite.setSize(look.size);
      sprite.blendMode = 'add';
      this.addChild(sprite);
      return { sprite, home, phase: random() * Math.PI * 2, blink: 0.6 + random() * 0.6 };
    });
    this.roam = look.roam;
  }

  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    const t = this.time;
    for (const { sprite, home, phase, blink } of this.flies) {
      sprite.x = home[0] + (Math.sin(t * 0.31 + phase) * 0.7 + Math.sin(t * 0.73 + phase * 2) * 0.3) * this.roam;
      sprite.y = home[1] + (Math.cos(t * 0.27 + phase) * 0.6 + Math.sin(t * 0.61 + phase * 3) * 0.4) * this.roam * 0.6;
      sprite.alpha = 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(t * blink + phase)), 2);
    }
  }
}
