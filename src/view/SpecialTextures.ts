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
  paintRainbowGlow,
  paintSparkle,
  paintWhirlpool,
  rainbow,
  sheenFrames,
  stripe,
} from '../art/specialKoi';
import type { SpecialColors } from '../config/koi';
import { SPECIAL_LOOK } from '../config/specials';
import type { PieceColor, Special } from '../model/types';
import { bakeContact, bakePose, bakeShadow, stillPose, tailWag } from './KoiTextures';
import type { KoiBake } from './KoiTextures';
import type { KoiMarks } from './KoiWaterline';

/** Where a koi body spans across its canvas, left to right (px). */
type BodySpan = ReturnType<typeof bodySpan>;

/** Every special koi the petal menu shows: a striped koi either way, so its petal can show the line it will get. */
const PREVIEWED: readonly Special[] = [
  { type: 'whirlpool' },
  { type: 'striped', along: 'col' },
  { type: 'striped', along: 'row' },
  { type: 'rainbow' },
];

/**
 * The special koi's textures, from the board's own koi painter (see art/specialKoi). They're baked in the background
 * once the game is shown, a little at a time between frames (warmUpJobs), so a special's first appearance doesn't
 * stall play and loading doesn't wait for them; anything the game asks for before its turn is baked on the spot.
 * Each is kept once baked.
 */
export class SpecialTextures {
  /** A white glow and a white sparkle (tinted per sprite), and the rainbow's glow. */
  readonly glow: Texture;
  readonly sparkle: Texture;
  readonly rainbowGlow: Texture;
  private readonly cache = new Map<string, Texture[]>();
  /** Striped and rainbow tail beats the warm-up is part way through. */
  private readonly partBeats = new Map<string, Texture[]>();
  private readonly curledMarks = new Map<PieceColor, KoiMarks>();
  private readonly previews = new Map<string, string>();
  /** Where each colour's koi body spans across its canvas: what a striped koi's bands fit. */
  private readonly spans = new Map<PieceColor, BodySpan>();
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
    this.rainbowGlow = Texture.from(paintRainbowGlow(Math.ceil(px * 1.6)));
  }

  /**
   * Everything still to bake, as small jobs in the order to run them: one colour, or one pose of a tail beat, at a
   * time (O(frames) canvas paints each at most). Reading a canvas back waits for the GPU to finish everything drawn before it, so every job that
   * reads one (a striped koi's fit, a whirlpool's curl, the petal menu's pictures) comes before the big paints, the
   * striped and rainbow koi's tail beats, and each reads what was painted a few frames before: the pictures are
   * painted with the whirlpools, put on one sheet, then read back in one go.
   */
  warmUpJobs(): (() => void)[] {
    const forEachColor = (bake: (color: PieceColor) => void): (() => void)[] =>
      [...this.varieties.keys()].map((color) => () => {
        bake(color);
      });
    return [
      ...forEachColor((color) => this.spanOf(color)),
      // the whirlpool's first: curling its koi (and its shadow and waterline) reads them back, best before the
      // other two are painted
      ...forEachColor((color) => this.marks(specialOf('whirlpool'), color)),
      ...forEachColor((color) => {
        for (const special of PREVIEWED) this.picture(special, color);
      }),
      () => {
        this.drawPictures();
      },
      () => {
        this.readPictures();
      },
      ...this.poseJobs('striped'),
      ...forEachColor((color) => this.sheen(color)),
      ...this.poseJobs('rainbow'),
    ];
  }

  /** A special koi's poses: a striped or rainbow koi's tail beat, or a whirlpool's koi curled into its eye. */
  poses(special: Special, color: PieceColor): readonly Texture[] {
    if (special.type !== 'whirlpool') return this.tailBeat(special.type, color);
    return this.cached(`${special.type}:${color}`, () => {
      const id = this.variety(color);
      const straight = bakeInkedKoi(getVariety(id), stillPose(this.bake), this.bake.ink);
      return [Texture.from(curl(straight, straight.width * SPECIAL_LOOK.whirlpool.curl))];
    });
  }

  /**
   * What a special koi casts into the water, when its shape isn't its color's: a whirlpool's curled koi casts a curled
   * shadow and meets the water along its curl. Null for the specials that keep the koi's own shape.
   */
  marks(special: Special, color: PieceColor): KoiMarks | null {
    if (special.type !== 'whirlpool') return null;
    const known = this.curledMarks.get(color);
    if (known) return known;
    const id = this.variety(color);
    const curled = (canvas: HTMLCanvasElement, koiPx: number): HTMLCanvasElement =>
      curl(canvas, Math.ceil(koiPx) * SPECIAL_LOOK.whirlpool.curl);
    const { size, resolution, contactResolution } = this.bake;
    const still = bakeKoi(getVariety(id), stillPose(this.bake));
    const contact = bakeContact(id, this.bake, 0); // padded round the koi: curled round the same center
    const marks = {
      shadow: bakeShadow(curled(still, size * resolution), this.bake),
      contacts: [Texture.from(curled(contact, size * contactResolution))],
    };
    this.curledMarks.set(color, marks);
    return marks;
  }

  /**
   * A striped koi's sheen, frame by frame from tail to head, cut to the part of the body that every pose covers so
   * it never spills past a bending tail.
   */
  sheen(color: PieceColor): readonly Texture[] {
    return this.cached(`sheen:${color}`, () => {
      const variety = getVariety(this.variety(color));
      const body = { ...stillPose(this.bake), parts: 'body' } as const;
      const bodies = Array.from({ length: this.bake.frames }, (_, i) =>
        bakeKoi(variety, { ...body, tailWag: tailWag(i / this.bake.frames, this.bake) }),
      );
      return sheenFrames(inEveryPose(bodies), SPECIAL_LOOK.sheen.frames).map((canvas) =>
        Texture.from(canvas),
      );
    });
  }

  /** A whirlpool's eddy in its color's glow. */
  eddy(color: PieceColor): Texture {
    const [texture] = this.cached(`eddy:${color}`, () => {
      const size = this.bake.size * this.bake.resolution * SPECIAL_LOOK.whirlpool.eddy * 2;
      return [Texture.from(paintWhirlpool(size, this.tintsOf(color).glow))];
    });
    if (!texture) throw new Error(`no eddy for color ${color}`);
    return texture;
  }

  /**
   * A picture of a koi of this color as a special, as an image URL for the UI (the special booster's petals): the
   * striped koi facing along its line, the rainbow koi as it swims, a whirlpool's eddy with its koi curled in the eye.
   * Cached.
   */
  preview(special: Special, color: PieceColor): string {
    const key = previewKey(special, color);
    const known = this.previews.get(key);
    if (known) return known;
    const url = this.picture(special, color).toDataURL(); // wanted before the warm-up got to it: this one on its own
    this.pictures.delete(key);
    this.previews.set(key, url);
    return url;
  }

  /** A color's colours as a special. */
  tintsOf(color: PieceColor): SpecialColors {
    const colors = this.colors[color];
    if (!colors) throw new RangeError(`no special tints for color ${color}`);
    return colors;
  }

  /** Where a colour's koi body spans across its canvas, measured once from its painted body. */
  private spanOf(color: PieceColor): BodySpan {
    const known = this.spans.get(color);
    if (known) return known;
    const body = bakeKoi(getVariety(this.variety(color)), { ...stillPose(this.bake), parts: 'body' });
    const span = bodySpan(body);
    this.spans.set(color, span);
    return span;
  }

  /** How a striped or rainbow koi is dressed before it's inked (see specialKoi). */
  private dressing(type: 'striped' | 'rainbow', color: PieceColor): Dressing {
    if (type === 'rainbow') return rainbow;
    const look = { ...SPECIAL_LOOK.stripes, band: this.tintsOf(color).band, body: this.spanOf(color) };
    return (part, pose) => {
      stripe(part, look, pose);
    };
  }

  /** Puts the petal menu's pictures not made yet side by side on one sheet, for readPictures to read back. */
  private drawPictures(): void {
    const missing = [...this.varieties.keys()]
      .flatMap((color) => PREVIEWED.map((special) => ({ special, color })))
      .filter(({ special, color }) => !this.previews.has(previewKey(special, color)));
    this.sheet = drawSideBySide(
      missing.map(({ special, color }) => [previewKey(special, color), this.picture(special, color)]),
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
  private picture(special: Special, color: PieceColor): HTMLCanvasElement {
    const key = previewKey(special, color);
    const known = this.pictures.get(key);
    if (known) return known;
    const picture =
      special.type === 'whirlpool' ? this.whirlpoolPicture(color) : this.swimmingPicture(special, color);
    this.pictures.set(key, picture);
    return picture;
  }

  /** A whirlpool's koi on its eddy. */
  private whirlpoolPicture(color: PieceColor): HTMLCanvasElement {
    return onEddy(canvasOf(this.eddy(color)), canvasOf(this.whirlpoolKoi(color)));
  }

  /** A striped or rainbow koi in its first pose; a striped koi facing along its line (a row's swims across). */
  private swimmingPicture(
    special: Special & { type: 'striped' | 'rainbow' },
    color: PieceColor,
  ): HTMLCanvasElement {
    const baked = this.cache.get(`${special.type}:${color}`)?.[0];
    const koi = baked
      ? canvasOf(baked)
      : bakePose(this.variety(color), this.bake, 0, this.dressing(special.type, color));
    return special.type === 'striped' && special.along === 'row' ? quarterTurned(koi) : koi;
  }

  /** A whirlpool's koi, curled into its eye. */
  private whirlpoolKoi(color: PieceColor): Texture {
    const [koi] = this.poses(specialOf('whirlpool'), color);
    if (!koi) throw new Error(`no whirlpool koi for color ${color}`);
    return koi;
  }

  private variety(color: PieceColor): string {
    const id = this.varieties[color];
    if (!id) throw new RangeError(`no koi variety for color ${color}`);
    return id;
  }

  /** A job per pose of every colour's striped or rainbow tail beat. */
  private poseJobs(type: 'striped' | 'rainbow'): (() => void)[] {
    return [...this.varieties.keys()].flatMap((color) =>
      Array.from({ length: this.bake.frames }, () => () => {
        this.bakeNextPose(type, color);
      }),
    );
  }

  /** A striped or rainbow koi's whole tail beat, with whatever poses the warm-up hasn't got to yet baked now. */
  private tailBeat(type: 'striped' | 'rainbow', color: PieceColor): Texture[] {
    const key = `${type}:${color}`;
    for (let known = this.cache.get(key); !known; known = this.cache.get(key)) this.bakeNextPose(type, color);
    return this.cache.get(key) ?? [];
  }

  /** Bakes the next pose of a striped or rainbow koi's tail beat; the beat is kept once it has all its poses. */
  private bakeNextPose(type: 'striped' | 'rainbow', color: PieceColor): void {
    const key = `${type}:${color}`;
    if (this.cache.has(key)) return;
    const baked = this.partBeats.get(key) ?? [];
    const pose = bakePose(this.variety(color), this.bake, baked.length, this.dressing(type, color));
    baked.push(Texture.from(pose));
    if (baked.length < this.bake.frames) this.partBeats.set(key, baked);
    else {
      this.partBeats.delete(key);
      this.cache.set(key, baked);
    }
  }

  private cached(key: string, bake: () => Texture[]): Texture[] {
    const known = this.cache.get(key);
    if (known) return known;
    const made = bake();
    this.cache.set(key, made);
    return made;
  }
}

/** A special's picture's key: its type (and a striped koi's line) and its color. */
function previewKey(special: Special, color: PieceColor): string {
  return `${special.type === 'striped' ? `striped-${special.along}` : special.type}:${color}`;
}

/** A special of this type, for its textures (a striped koi's bands look the same either way). */
function specialOf(type: Special['type']): Special {
  return type === 'striped' ? { type, along: 'col' } : { type };
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
