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
import { bakeContact, bakePose, bakePoses, bakeShadow, stillPose } from './KoiTextures';
import type { KoiBake } from './KoiTextures';
import type { KoiMarks } from './KoiWaterline';

/** A special koi's colours: its glow, and a striped koi's band. */
export interface SpecialColors {
  readonly glow: string;
  readonly band: string;
}

/** Where a koi body spans across its canvas, left to right (px). */
type BodySpan = ReturnType<typeof bodySpan>;

/** Every kind of special koi. */
const SPECIAL_TYPES = ['line', 'whirl', 'rainbow'] as const satisfies readonly Special['type'][];

/**
 * The special koi's textures, from the board's own koi painter (see art/specialKoi). They're baked in the background
 * once the game is shown, a little at a time between frames (warmUpJobs), so a special's first appearance doesn't
 * stall play and loading doesn't wait for them; anything the game asks for before its turn is baked on the spot.
 * Each is kept once baked.
 */
export class SpecialTextures {
  /** A white glow and a white sparkle (tinted per sprite), and the rainbow's prism glow. */
  readonly glow: Texture;
  readonly sparkle: Texture;
  readonly prism: Texture;
  private readonly cache = new Map<string, Texture[]>();
  private readonly curledMarks = new Map<Kind, KoiMarks>();
  private readonly previews = new Map<string, string>();
  /** Where each colour's koi body spans across its canvas: what a striped koi's bands fit. */
  private readonly spans = new Map<Kind, BodySpan>();
  /** The petal menu's pictures, painted, before they're read back as image URLs (see readPictures). */
  private readonly pictures = new Map<string, HTMLCanvasElement>();
  private sheet: PictureSheet | null = null;

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
   * Everything still to bake, as small jobs in the order to run them, one colour at a time (O(frames) canvas paints
   * each at most). Reading a canvas back waits for the GPU to finish everything drawn before it, so every job that
   * reads one (a striped koi's fit, a whirlpool's curl, the petal menu's pictures) comes before the big paints, the
   * striped and rainbow koi's tail beats, and each reads what was painted a few frames before: the pictures are
   * painted with the whirlpools, put on one sheet, then read back in one go.
   */
  warmUpJobs(): (() => void)[] {
    const forEachColour = (bake: (kind: Kind) => void): (() => void)[] =>
      [...this.varieties.keys()].map((kind) => () => {
        bake(kind);
      });
    return [
      ...forEachColour((kind) => this.spanOf(kind)),
      ...forEachColour((kind) => {
        // the whirlpool's first: curling its koi (and its shadow and waterline) reads them back, best before the
        // other two are painted
        this.marks(specialOf('whirl'), kind);
        for (const type of ['whirl', 'line', 'rainbow'] as const) this.picture(type, kind);
      }),
      () => {
        this.drawPictures();
      },
      () => {
        this.readPictures();
      },
      ...forEachColour((kind) => {
        this.poses(specialOf('line'), kind);
        this.sheen(kind);
      }),
      ...forEachColour((kind) => this.poses(specialOf('rainbow'), kind)),
    ];
  }

  /** A special koi's poses: a striped or rainbow koi's tail beat, or a whirlpool's koi curled into its eye. */
  poses(special: Special, kind: Kind): readonly Texture[] {
    return this.cached(`${special.type}:${kind}`, () => {
      const id = this.variety(kind);
      if (special.type !== 'whirl') return bakePoses(id, this.bake, this.dressing(special.type, kind));
      const straight = bakeInkedKoi(getVariety(id), stillPose(this.bake), this.bake.ink);
      return [Texture.from(curl(straight, straight.width * SPECIAL_LOOK.whirl.curl))];
    });
  }

  /**
   * What a special koi casts into the water, when its shape isn't its kind's: a whirlpool's curled koi casts a curled
   * shadow and meets the water along its curl. Null for the specials that keep the koi's own shape.
   */
  marks(special: Special, kind: Kind): KoiMarks | null {
    if (special.type !== 'whirl') return null;
    const known = this.curledMarks.get(kind);
    if (known) return known;
    const id = this.variety(kind);
    const curled = (canvas: HTMLCanvasElement, koiPx: number): HTMLCanvasElement =>
      curl(canvas, Math.ceil(koiPx) * SPECIAL_LOOK.whirl.curl);
    const { size, resolution, contactResolution } = this.bake;
    const still = bakeKoi(getVariety(id), stillPose(this.bake));
    const contact = bakeContact(id, this.bake, 0); // padded round the koi: curled round the same centre
    const marks = {
      shadow: bakeShadow(curled(still, size * resolution), this.bake),
      contacts: [Texture.from(curled(contact, size * contactResolution))],
    };
    this.curledMarks.set(kind, marks);
    return marks;
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
    const url = this.picture(type, kind).toDataURL(); // wanted before the warm-up got to it: this one on its own
    this.pictures.delete(key);
    this.previews.set(key, url);
    return url;
  }

  /** A kind's colours as a special. */
  color(kind: Kind): SpecialColors {
    const colors = this.colors[kind];
    if (!colors) throw new RangeError(`no special colours for kind ${kind}`);
    return colors;
  }

  /** Where a colour's koi body spans across its canvas, measured once from its painted body. */
  private spanOf(kind: Kind): BodySpan {
    const known = this.spans.get(kind);
    if (known) return known;
    const body = bakeKoi(getVariety(this.variety(kind)), { ...stillPose(this.bake), parts: 'body' });
    const span = bodySpan(body);
    this.spans.set(kind, span);
    return span;
  }

  /** How a striped or rainbow koi is dressed before it's inked (see specialKoi). */
  private dressing(type: 'line' | 'rainbow', kind: Kind): (part: HTMLCanvasElement) => void {
    if (type === 'rainbow') return rainbow;
    const look = { ...SPECIAL_LOOK.stripes, band: this.color(kind).band, body: this.spanOf(kind) };
    return (part) => {
      stripe(part, look);
    };
  }

  /** Puts the petal menu's pictures not made yet side by side on one sheet, for readPictures to read back. */
  private drawPictures(): void {
    const missing = [...this.varieties.keys()]
      .flatMap((kind) => SPECIAL_TYPES.map((type) => ({ type, kind })))
      .filter(({ type, kind }) => !this.previews.has(`${type}:${kind}`));
    this.sheet = drawSideBySide(
      missing.map(({ type, kind }) => [`${type}:${kind}`, this.picture(type, kind)]),
    );
    this.pictures.clear(); // on the sheet now
  }

  /** Reads the sheet back in one go, and cuts out each picture still missing as an image URL. */
  private readPictures(): void {
    const sheet = this.sheet;
    this.sheet = null;
    if (!sheet) return;
    const pixels = context(sheet.canvas).getImageData(0, 0, sheet.canvas.width, sheet.canvas.height);
    for (const place of sheet.places) {
      if (!this.previews.has(place.key)) this.previews.set(place.key, cutOut(pixels, place));
    }
  }

  /**
   * What a preview shows: a whirlpool's koi on its eddy, or the special's first pose, painted on its own while its
   * tail beat isn't baked yet (much less for the GPU to draw before the picture can be read back). Kept until read.
   */
  private picture(type: Special['type'], kind: Kind): HTMLCanvasElement {
    const key = `${type}:${kind}`;
    const known = this.pictures.get(key);
    if (known) return known;
    const baked = this.cache.get(key)?.[0];
    const picture =
      type === 'whirl'
        ? onEddy(canvasOf(this.eddy(kind)), canvasOf(this.whirlKoi(kind)))
        : baked
          ? canvasOf(baked)
          : bakePose(this.variety(kind), this.bake, 0, this.dressing(type, kind));
    this.pictures.set(key, picture);
    return picture;
  }

  /** A whirlpool's koi, curled into its eye. */
  private whirlKoi(kind: Kind): Texture {
    const [koi] = this.poses(specialOf('whirl'), kind);
    if (!koi) throw new Error(`no whirlpool koi for kind ${kind}`);
    return koi;
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

/** A special of this type, for its textures (a striped koi's bands look the same either way). */
function specialOf(type: Special['type']): Special {
  return type === 'line' ? { type, along: 'col' } : { type };
}

/** Pictures drawn side by side on one canvas, and where each is on it, by its key. */
interface PictureSheet {
  readonly canvas: HTMLCanvasElement;
  readonly places: readonly Place[];
}

/** Where a picture is on a sheet. */
interface Place {
  readonly key: string;
  readonly x: number;
  readonly width: number;
  readonly height: number;
}

/** The pictures, by key, drawn side by side on one canvas. Null when there are none. */
function drawSideBySide(pictures: readonly (readonly [string, HTMLCanvasElement])[]): PictureSheet | null {
  if (pictures.length === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = pictures.reduce((sum, [, picture]) => sum + picture.width, 0);
  canvas.height = Math.max(...pictures.map(([, picture]) => picture.height));
  const ctx = context(canvas);
  const places: Place[] = [];
  let x = 0;
  for (const [key, picture] of pictures) {
    ctx.drawImage(picture, x, 0);
    places.push({ key, x, width: picture.width, height: picture.height });
    x += picture.width;
  }
  return { canvas, places };
}

/** One picture cut out of the sheet's pixels, as an image URL. */
function cutOut(sheet: ImageData, at: Place): string {
  const canvas = document.createElement('canvas');
  canvas.width = at.width;
  canvas.height = at.height;
  // kept on the CPU: the pixels are already here, so encoding them needs nothing from the GPU
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('special previews: 2D canvas not available');
  ctx.putImageData(sheet, -at.x, 0, at.x, 0, at.width, at.height);
  return canvas.toDataURL();
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('special textures: 2D canvas not available');
  return ctx;
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
  const ctx = context(canvas);
  ctx.drawImage(eddy, 0, 0);
  ctx.drawImage(koi, (eddy.width - koi.width) / 2, (eddy.height - koi.height) / 2);
  return canvas;
}
