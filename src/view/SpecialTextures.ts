import { Texture } from 'pixi.js';
import { paintGlow } from '../art/glow';
import { bakeInkedKoi } from '../art/koiInk';
import { bakeKoi, getVariety } from '../art/koiBank';
import {
  bodySpan,
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

/** Every kind of special koi. */
const SPECIAL_TYPES = ['line', 'whirl', 'rainbow'] as const satisfies readonly Special['type'][];

/**
 * The special koi's textures, from the board's own koi painter (see art/specialKoi). The game bakes them all while
 * it loads (bakeAll), so a special's first appearance never stalls play; each is kept once baked.
 */
export class SpecialTextures {
  /** A white glow and a white sparkle (tinted per sprite), and the rainbow's prism glow. */
  readonly glow: Texture;
  readonly sparkle: Texture;
  readonly prism: Texture;
  private readonly cache = new Map<string, Texture[]>();
  private readonly previews = new Map<string, string>();

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

  /**
   * Bakes every special of every colour now, with its petal preview, so nothing is painted during play.
   * O(colours x specials x frames) canvas paints.
   */
  bakeAll(): void {
    for (const kind of this.varieties.keys()) {
      for (const type of SPECIAL_TYPES) this.preview(type, kind); // bakes its poses (and a whirlpool's eddy) too
      this.sheen(kind);
    }
  }

  /** A special koi's poses: a striped or rainbow koi's tail beat, or a whirlpool's koi curled into its eye. */
  poses(special: Special, kind: Kind): readonly Texture[] {
    return this.cached(`${special.type}:${kind}`, () => {
      const id = this.variety(kind);
      if (special.type === 'line') {
        const body = bakeKoi(getVariety(id), { ...stillPose(this.bake), parts: 'body' });
        const look = { ...SPECIAL_LOOK.stripes, band: this.color(kind).band, body: bodySpan(body) };
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

  /**
   * A picture of a koi of this kind as a special, as an image URL for the UI (the special booster's petals): the
   * striped or rainbow koi as it swims, a whirlpool's eddy with its koi curled in the eye. Cached.
   */
  preview(type: Special['type'], kind: Kind): string {
    const key = `${type}:${kind}`;
    const known = this.previews.get(key);
    if (known) return known;
    const special: Special = type === 'line' ? { type, along: 'col' } : { type };
    const [pose] = this.poses(special, kind);
    const koi = pose ? canvasOf(pose) : null;
    if (!koi) throw new Error(`no ${type} preview for kind ${kind}`);
    const url = (type === 'whirl' ? onEddy(canvasOf(this.eddy(kind)), koi) : koi).toDataURL();
    this.previews.set(key, url);
    return url;
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

/** The canvas a texture was made from (every special texture is painted on one). */
function canvasOf(texture: Texture): HTMLCanvasElement {
  const resource: unknown = texture.source.resource;
  if (!(resource instanceof HTMLCanvasElement)) throw new Error('special texture without a canvas');
  return resource;
}

/** A whirlpool's koi drawn in its eddy's eye, on one canvas the eddy's size. */
function onEddy(eddy: HTMLCanvasElement, koi: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = eddy.width;
  canvas.height = eddy.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('special preview: 2D canvas not available');
  ctx.drawImage(eddy, 0, 0);
  ctx.drawImage(koi, (eddy.width - koi.width) / 2, (eddy.height - koi.height) / 2);
  return canvas;
}
