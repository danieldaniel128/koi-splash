import { Texture } from 'pixi.js';
import { paintGlow } from '../art/glow';
import { bakeInkedKoi } from '../art/koiInk';
import { bakeKoi, getVariety } from '../art/koiBank';
import {
  curl,
  paintPrismGlow,
  paintSparkle,
  paintWhirlpool,
  rainbow,
  sheenFrames,
  stripe,
} from '../art/specialKoi';
import { SPECIAL_LOOK } from '../config/specials';
import type { Kind, Special } from '../model/types';
import { bakePoses, stillPose } from './KoiTextures';
import type { KoiBake } from './KoiTextures';

/** A special koi's colours: its glow, and a striped koi's band. */
export interface SpecialColors {
  readonly glow: string;
  readonly band: string;
}

/**
 * The special koi's textures, from the board's own koi painter (see art/specialKoi). Baked the first time a special
 * of a kind appears and kept, so boot pays nothing for specials a game may never make; O(frames) canvas paints per
 * new kind of special.
 */
export class SpecialTextures {
  /** A white glow and a white sparkle (tinted per sprite), and the rainbow's prism glow. */
  readonly glow: Texture;
  readonly sparkle: Texture;
  readonly prism: Texture;
  private readonly cache = new Map<string, Texture[]>();

  constructor(
    private readonly varieties: readonly string[],
    private readonly bake: KoiBake,
    private readonly colors: readonly SpecialColors[],
  ) {
    const px = bake.size * bake.resolution;
    this.glow = Texture.from(paintGlow('#ffffff', Math.ceil(px)));
    this.sparkle = Texture.from(paintSparkle(Math.ceil(px * 0.5)));
    this.prism = Texture.from(paintPrismGlow(Math.ceil(px * 1.6)));
  }

  /** A special koi's poses: a striped or rainbow koi's tail beat, or a whirlpool's koi curled into its eye. */
  poses(special: Special, kind: Kind): readonly Texture[] {
    return this.cached(`${special.type}:${kind}`, () => {
      const id = this.variety(kind);
      if (special.type === 'line') {
        const look = { ...SPECIAL_LOOK.stripes, band: this.color(kind).band };
        return bakePoses(id, this.bake, (part) => {
          stripe(part, look);
        });
      }
      if (special.type === 'rainbow') return bakePoses(id, this.bake, rainbow);
      const straight = bakeInkedKoi(getVariety(id), stillPose(this.bake), this.bake.ink);
      return [Texture.from(curl(straight, straight.width * SPECIAL_LOOK.whirl.curl))];
    });
  }

  /** A striped koi's sheen, frame by frame from tail to head. */
  sheen(kind: Kind): readonly Texture[] {
    return this.cached(`sheen:${kind}`, () => {
      const body = bakeKoi(getVariety(this.variety(kind)), { ...stillPose(this.bake), parts: 'body' });
      return sheenFrames(body, SPECIAL_LOOK.sheen.frames).map((canvas) => Texture.from(canvas));
    });
  }

  /** A whirlpool's eddy in the kind's colour. */
  eddy(kind: Kind): Texture {
    const [texture] = this.cached(`eddy:${kind}`, () => {
      const size = this.bake.size * this.bake.resolution * SPECIAL_LOOK.whirl.eddy * 2;
      return [Texture.from(paintWhirlpool(size, this.color(kind).glow))];
    });
    if (!texture) throw new Error(`no eddy for kind ${kind}`);
    return texture;
  }

  /** A kind's colours as a special. */
  color(kind: Kind): SpecialColors {
    const colors = this.colors[kind];
    if (!colors) throw new RangeError(`no special colours for kind ${kind}`);
    return colors;
  }

  private variety(kind: Kind): string {
    const id = this.varieties[kind];
    if (!id) throw new RangeError(`no koi variety for kind ${kind}`);
    return id;
  }

  private cached(key: string, bake: () => Texture[]): Texture[] {
    const known = this.cache.get(key);
    if (known) return known;
    const made = bake();
    this.cache.set(key, made);
    return made;
  }
}
