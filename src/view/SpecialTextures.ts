import { Texture } from 'pixi.js';
import { blank, context, copyCanvas } from '../art/canvas';
import { paintGlow } from '../art/glow';
import { bakeInkedKoi } from '../art/koiInk';
import type { Dressing } from '../art/koiInk';
import { bakeKoi, getVariety } from '../art/koiBank';
import {
  bodySpan,
  curl,
  inEveryPose,
  paintPrismGlow,
  paintSparkle,
  paintWhirlpool,
  rainbow,
  sheenFrames,
  stripe,
} from '../art/specialKoi';
import type { SpecialColors } from '../config/koi';
import { SPECIAL_LOOK } from '../config/specials';
import type { Kind, Special } from '../model/types';
import { bakeContact, bakePose, bakePoses, bakeShadow, stillPose, tailWag } from './KoiTextures';
import type { KoiBake } from './KoiTextures';
import type { KoiMarks } from './KoiWaterline';

/** Where a koi body spans across its canvas, left to right (px). */
type BodySpan = ReturnType<typeof bodySpan>;

/** Every special koi the petal menu shows: a striped koi either way, so its petal can show the line it will get. */
const PREVIEWED: readonly Special[] = [
  { type: 'whirl' },
  { type: 'line', along: 'col' },
  { type: 'line', along: 'row' },
  { type: 'rainbow' },
];

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
      // the whirlpool's first: curling its koi (and its shadow and waterline) reads them back, best before the
      // other two are painted
      ...forEachColour((kind) => this.marks(specialOf('whirl'), kind)),
      ...forEachColour((kind) => {
        for (const special of PREVIEWED) this.picture(special, kind);
      }),
      () => {
        this.drawPictures();
      },
      () => {
        this.readPictures();
      },
      ...forEachColour((kind) => this.poses(specialOf('line'), kind)),
      ...forEachColour((kind) => this.sheen(kind)),
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
    const contact = bakeContact(id, this.bake, 0); // padded round the koi: curled round the same center
    const marks = {
      shadow: bakeShadow(curled(still, size * resolution), this.bake),
      contacts: [Texture.from(curled(contact, size * contactResolution))],
    };
    this.curledMarks.set(kind, marks);
    return marks;
  }

  /**
   * A striped koi's sheen, frame by frame from tail to head, cut to the part of the body that every pose covers so
   * it never spills past a bending tail.
   */
  sheen(kind: Kind): readonly Texture[] {
    return this.cached(`sheen:${kind}`, () => {
      const variety = getVariety(this.variety(kind));
      const body = { ...stillPose(this.bake), parts: 'body' } as const;
      const bodies = Array.from({ length: this.bake.frames }, (_, i) =>
        bakeKoi(variety, { ...body, tailWag: tailWag(i / this.bake.frames, this.bake) }),
      );
      return sheenFrames(inEveryPose(bodies), SPECIAL_LOOK.sheen.frames).map((canvas) =>
        Texture.from(canvas),
      );
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
   * striped koi facing along its line, the rainbow koi as it swims, a whirlpool's eddy with its koi curled in the eye.
   * Cached.
   */
  preview(special: Special, kind: Kind): string {
    const key = previewKey(special, kind);
    const known = this.previews.get(key);
    if (known) return known;
    const url = this.picture(special, kind).toDataURL(); // wanted before the warm-up got to it: this one on its own
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
  private dressing(type: 'line' | 'rainbow', kind: Kind): Dressing {
    if (type === 'rainbow') return rainbow;
    const look = { ...SPECIAL_LOOK.stripes, band: this.color(kind).band, body: this.spanOf(kind) };
    return (part, pose) => {
      stripe(part, look, pose);
    };
  }

  /** Puts the petal menu's pictures not made yet side by side on one sheet, for readPictures to read back. */
  private drawPictures(): void {
    const missing = [...this.varieties.keys()]
      .flatMap((kind) => PREVIEWED.map((special) => ({ special, kind })))
      .filter(({ special, kind }) => !this.previews.has(previewKey(special, kind)));
    this.sheet = drawSideBySide(
      missing.map(({ special, kind }) => [previewKey(special, kind), this.picture(special, kind)]),
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
  private picture(special: Special, kind: Kind): HTMLCanvasElement {
    const key = previewKey(special, kind);
    const known = this.pictures.get(key);
    if (known) return known;
    const picture = special.type === 'whirl' ? this.whirlPicture(kind) : this.swimmingPicture(special, kind);
    this.pictures.set(key, picture);
    return picture;
  }

  /** A whirlpool's koi on its eddy. */
  private whirlPicture(kind: Kind): HTMLCanvasElement {
    return onEddy(canvasOf(this.eddy(kind)), canvasOf(this.whirlKoi(kind)));
  }

  /** A striped or rainbow koi in its first pose; a striped koi facing along its line (a row's swims across). */
  private swimmingPicture(special: Special & { type: 'line' | 'rainbow' }, kind: Kind): HTMLCanvasElement {
    const baked = this.cache.get(`${special.type}:${kind}`)?.[0];
    const koi = baked
      ? canvasOf(baked)
      : bakePose(this.variety(kind), this.bake, 0, this.dressing(special.type, kind));
    return special.type === 'line' && special.along === 'row' ? quarterTurned(koi) : koi;
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

/** A special's picture's key: its type (and a striped koi's line) and its kind. */
function previewKey(special: Special, kind: Kind): string {
  return `${special.type === 'line' ? `line-${special.along}` : special.type}:${kind}`;
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
  const width = pictures.reduce((sum, [, picture]) => sum + picture.width, 0);
  const canvas = blank(width, Math.max(...pictures.map(([, picture]) => picture.height)));
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
  const canvas = blank(at.width, at.height);
  // kept on the CPU: the pixels are already here, so encoding them needs nothing from the GPU
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('special previews: 2D canvas not available');
  ctx.putImageData(sheet, -at.x, 0, at.x, 0, at.width, at.height);
  return canvas.toDataURL();
}

/** The canvas a texture was made from (every special texture is painted on one). */
function canvasOf(texture: Texture): HTMLCanvasElement {
  const resource: unknown = texture.source.resource;
  if (!(resource instanceof HTMLCanvasElement)) throw new Error('special texture without a canvas');
  return resource;
}

/** A whirlpool's koi drawn in its eddy's eye, on one canvas the eddy's size. */
function onEddy(eddy: HTMLCanvasElement, koi: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = copyCanvas(eddy);
  const ctx = context(canvas);
  ctx.drawImage(koi, (eddy.width - koi.width) / 2, (eddy.height - koi.height) / 2);
  return canvas;
}

/** A picture turned a quarter clockwise: a head-up koi then faces right. */
function quarterTurned(picture: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = blank(picture.height, picture.width);
  const ctx = context(canvas);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(picture, -picture.width / 2, -picture.height / 2);
  return canvas;
}
