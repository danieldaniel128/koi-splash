import { ColorMatrixFilter, Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { SPECIAL_LOOK } from '../config/specials';
import { SPECTRUM } from '../art/specialKoi';
import type { Special } from '../model/types';
import type { Koi } from './Koi';
import type { SpecialTextures } from './SpecialTextures';

/** What a special koi wears on top of its own poses, following it every frame. */
interface Look {
  follow(koi: Koi, time: number): void;
  destroy(): void;
}

/**
 * What the looks draw with: the layers under the koi (glows, eddies) and over them (sheen, sparkles), and the color
 * flow every rainbow koi shares.
 */
interface Layers {
  readonly under: Container;
  readonly over: Container;
  readonly rainbowHue: RainbowHue;
}

/**
 * The special koi's life at rest (after the prototype's): a striped koi faces its line over a pulsing glow, a sheen
 * sweeping along it now and then; a rainbow koi's colours flow over a spinning prism glow with sparkles orbiting it;
 * a whirlpool's eddy turns under its curled koi. one look per special type (LOOKS); each follows its koi.
 */
export class SpecialLooks {
  readonly under = new Container();
  readonly over = new Container();
  readonly rainbowHue = new RainbowHue();
  private readonly looks = new Map<Koi, Look>();
  private time = 0;

  constructor(private readonly textures: SpecialTextures) {}

  /** Dresses a koi that has become special (replacing any look it had). */
  add(koi: Koi, special: Special): void {
    this.remove(koi);
    this.looks.set(koi, LOOKS[special.type](koi, special, this.textures, this));
  }

  remove(koi: Koi): void {
    this.looks.get(koi)?.destroy();
    this.looks.delete(koi);
  }

  has(koi: Koi): boolean {
    return this.looks.has(koi);
  }

  /** Every look follows its koi. Call once per frame after the koi moved. O(specials). */
  follow(deltaSeconds: number): void {
    this.time += deltaSeconds;
    this.rainbowHue.turn(this.time);
    for (const [koi, look] of this.looks) look.follow(koi, this.time);
  }
}

/**
 * The colors flowing over every rainbow koi: one hue-turning filter they all share (one program, one set of
 * uniforms, turned once a frame), drawn at the screen's resolution like the koi. Made with the first rainbow koi and
 * destroyed with the last.
 */
class RainbowHue {
  private filter: ColorMatrixFilter | null = null;
  private users = 0;

  /** A rainbow koi takes the filter. */
  take(): ColorMatrixFilter {
    this.users++;
    this.filter ??= new ColorMatrixFilter({ resolution: 'inherit' });
    return this.filter;
  }

  /** A rainbow koi is done with it; the last one destroys it. */
  release(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users > 0 || !this.filter) return;
    this.filter.destroy();
    this.filter = null;
  }

  /** The colors flow on with the clock (s). */
  turn(time: number): void {
    this.filter?.hue((time * SPECIAL_LOOK.rainbow.flow * 180) / Math.PI, false);
  }
}

type LookMaker = (koi: Koi, special: Special, textures: SpecialTextures, layers: Layers) => Look;

/** one look per special type (Strategy): a new special is one entry here. */
const LOOKS: Readonly<Record<Special['type'], LookMaker>> = {
  line: (koi, special, textures, layers) => new StripedLook(koi, special, textures, layers),
  rainbow: (koi, _special, textures, layers) => new RainbowLook(koi, textures, layers),
  whirl: (koi, _special, textures, layers) => new WhirlLook(koi, textures, layers),
};

/** A striped koi: it faces along its line, over a glow of its colour that pulses, with a sheen sweeping it. */
class StripedLook implements Look {
  private readonly glow: Sprite;
  private readonly sheen: Sprite;
  private readonly frames: readonly Texture[];
  private readonly facing: number;
  private readonly phase = Math.random() * SPECIAL_LOOK.sheen.every;

  constructor(koi: Koi, special: Special, textures: SpecialTextures, layers: Layers) {
    // along its line, whichever way round is nearer to where it was heading (head up is 0, right is PI / 2)
    const axis = special.type === 'line' && special.along === 'row' ? Math.PI / 2 : 0;
    this.facing = Math.cos(koi.heading - axis) >= 0 ? axis : axis + Math.PI;
    this.glow = additive(textures.glow, textures.tintsOf(koi.color).glow);
    this.frames = textures.sheen(koi.color);
    this.sheen = additive(this.frames[0] ?? textures.glow);
    layers.under.addChild(this.glow);
    layers.over.addChild(this.sheen);
  }

  follow(koi: Koi, time: number): void {
    const { glow: look, sheen } = SPECIAL_LOOK;
    koi.heading = this.facing;
    this.glow.position.copyFrom(koi.position);
    this.glow.rotation = koi.rotation;
    this.glow.setSize(koi.width * look.width, koi.height * look.length);
    this.glow.alpha = koi.alpha * (look.alpha + Math.sin(time * look.speed) * look.pulse);
    const sweep = ((time + this.phase) % sheen.every) / sheen.sweep; // 0..1 while sweeping, then past 1
    this.sheen.visible = sweep < 1;
    this.sheen.texture = this.frames[Math.floor(sweep * this.frames.length)] ?? this.sheen.texture;
    copyPose(koi, this.sheen);
  }

  destroy(): void {
    this.glow.destroy();
    this.sheen.destroy();
  }
}

/** A rainbow koi: its colors flow (RainbowHue), over a spinning prism glow, with sparkles orbiting it. */
class RainbowLook implements Look {
  private readonly glow: Sprite;
  private readonly sparkles: Sprite[];
  private readonly hue: RainbowHue;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    private readonly koi: Koi,
    textures: SpecialTextures,
    layers: Layers,
  ) {
    this.glow = additive(textures.prism);
    this.sparkles = Array.from({ length: SPECIAL_LOOK.rainbow.sparkles }, () => additive(textures.sparkle));
    this.hue = layers.rainbowHue;
    koi.filters = [this.hue.take()];
    layers.under.addChild(this.glow);
    layers.over.addChild(...this.sparkles);
  }

  follow(koi: Koi, time: number): void {
    const look = SPECIAL_LOOK.rainbow;
    this.glow.position.copyFrom(koi.position);
    this.glow.rotation = time * look.glowSpin;
    this.glow.setSize(koi.width * look.glow * (1 + 0.06 * Math.sin(time * 3)));
    this.glow.alpha = koi.alpha * look.glowAlpha;
    this.sparkles.forEach((sparkle, k) => {
      const angle = time * (1.5 + 0.45 * k) + this.phase + 2.1 * k;
      const reach = koi.width * (look.orbit + 0.05 * Math.sin(time * 2.3 + k));
      const twinkle = 0.5 + 0.5 * Math.sin(time * 7 + 1.9 * k + this.phase);
      sparkle.position.set(koi.x + Math.cos(angle) * reach, koi.y + Math.sin(angle) * reach * 0.8);
      sparkle.setSize(koi.width * look.sparkleSize * (0.5 + 0.5 * twinkle));
      sparkle.alpha = koi.alpha * (0.3 + 0.7 * twinkle);
      sparkle.tint = SPECTRUM[(2 * k + Math.floor(time * 1.5)) % SPECTRUM.length] ?? '#ffffff';
    });
  }

  destroy(): void {
    this.koi.filters = [];
    this.hue.release();
    this.glow.destroy();
    for (const sparkle of this.sparkles) sparkle.destroy();
  }
}

/** A whirlpool: an eddy of its colour turning under the koi curled in its eye, which turns too. */
class WhirlLook implements Look {
  private readonly eddy: Sprite;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    private readonly koi: Koi,
    textures: SpecialTextures,
    layers: Layers,
  ) {
    this.eddy = new Sprite(textures.eddy(koi.color));
    this.eddy.anchor.set(0.5);
    layers.under.addChild(this.eddy);
    koi.spin = SPECIAL_LOOK.whirl.koiSpin; // the curled koi turns in the eye, head first, with the water
  }

  follow(koi: Koi, time: number): void {
    const look = SPECIAL_LOOK.whirl;
    this.eddy.position.copyFrom(koi.position);
    this.eddy.rotation = time * look.spin + this.phase;
    this.eddy.setSize(koi.width * look.eddy);
    this.eddy.alpha = koi.alpha;
  }

  destroy(): void {
    this.koi.spin = null;
    this.eddy.destroy();
  }
}

/** A sprite drawn additively (light over what's under it), centred, optionally tinted. */
function additive(texture: Texture, tint?: string): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.blendMode = 'add';
  if (tint) sprite.tint = tint;
  return sprite;
}

/** Puts a sprite exactly over a koi: same place, turn, size and fade. */
function copyPose(koi: Koi, sprite: Sprite): void {
  sprite.position.copyFrom(koi.position);
  sprite.rotation = koi.rotation;
  sprite.scale.copyFrom(koi.scale);
  sprite.alpha = koi.alpha;
}
