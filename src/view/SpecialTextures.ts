import type { Texture } from 'pixi.js';
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
  paintBeam,
  paintSparkle,
  paintWhirlpool,
  rainbow,
  sheenFrames,
  stripe,
} from '../art/specialKoi';
import type { SpecialColors } from '../config/koi';
import { SPECIAL_LOOK } from '../config/specials';
import type { PieceColor, Special } from '../model/types';
import { canvasOf, frameName } from './ArtBook';
import type { ArtBook } from './ArtBook';
import { bakeContact, bakePose, paintShadow, stillPose, tailWag } from './KoiTextures';
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
 * The special koi's textures, from the art book: the shipped atlases, or else the board's own koi painter (see
 * art/specialKoi). The loading screen takes them a little at a time between frames (warmUpJobs), so the bar keeps
 * moving while they're painted; anything the game asks for before its turn is made on the spot. Each is kept once
 * made.
 */
export class SpecialTextures {
  /** A white glow and a white sparkle (tinted per sprite), the rainbow's glow, and a striped koi's white beam. */
  readonly glow: Texture;
  readonly sparkle: Texture;
  readonly rainbowGlow: Texture;
  readonly beam: Texture;
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
    private readonly art: ArtBook,
  ) {
    const px = bake.size * bake.resolution;
    this.glow = art.texture('fx/glow', () => paintGlow('#ffffff', Math.ceil(px)));
    this.sparkle = art.texture('fx/sparkle', () => paintSparkle(Math.ceil(px * 0.5)));
    this.rainbowGlow = art.texture('fx/rainbow-glow', () => paintRainbowGlow(Math.ceil(px * 1.6)));
    this.beam = art.texture('fx/beam', () => paintBeam(128, 32));
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
    // a striped koi's fit is only measured to paint its bands: the atlases have them already
    const spans = this.art.baked ? [] : forEachColor((color) => this.spanOf(color));
    return [
      ...spans,
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
      return [
        this.art.texture(`special/whirlpool/${id}/koi`, () => {
          const straight = bakeInkedKoi(getVariety(id), stillPose(this.bake), this.bake.ink);
          return curl(straight, straight.width * SPECIAL_LOOK.whirlpool.curl);
        }),
      ];
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
    const marks = {
      shadow: this.art.texture(`special/whirlpool/${id}/shadow`, () => {
        const still = bakeKoi(getVariety(id), stillPose(this.bake));
        return paintShadow(curled(still, size * resolution), this.bake);
      }),
      contacts: [
        this.art.texture(`special/whirlpool/${id}/contact`, () => {
          const contact = bakeContact(id, this.bake, 0); // padded round the koi: curled round the same center
          return curled(contact, size * contactResolution);
        }),
      ],
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
      const id = this.variety(color);
      return this.art.textures(`special/striped/${id}/sheen`, SPECIAL_LOOK.sheen.frames, () => {
        const body = { ...stillPose(this.bake), parts: 'body' } as const;
        const bodies = Array.from({ length: this.bake.frames }, (_, i) =>
          bakeKoi(getVariety(id), { ...body, tailWag: tailWag(i / this.bake.frames, this.bake) }),
        );
        return sheenFrames(inEveryPose(bodies), SPECIAL_LOOK.sheen.frames);
      });
    });
  }

  /**
   * Every texture baked so far: the glows and the sparkle, every special koi's poses, sheen and eddy, and the
   * whirlpools' shadows and waterlines (for the GPU to take them early).
   */
  allTextures(): Texture[] {
    const marks = [...this.curledMarks.values()].flatMap((mark) => [mark.shadow, ...mark.contacts]);
    return [
      this.glow,
      this.sparkle,
      this.rainbowGlow,
      this.beam,
      ...[...this.cache.values()].flat(),
      ...marks,
    ];
  }

  /** A whirlpool's eddy in its color's glow. */
  eddy(color: PieceColor): Texture {
    const [texture] = this.cached(`eddy:${color}`, () => {
      const size = this.bake.size * this.bake.resolution * SPECIAL_LOOK.whirlpool.eddy * 2;
      return [
        this.art.texture(`fx/eddy/${this.variety(color)}`, () =>
          paintWhirlpool(size, this.tintsOf(color).glow),
        ),
      ];
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
      : this.art.canvas(this.poseName(special.type, color, 0), () =>
          bakePose(this.variety(color), this.bake, 0, this.dressing(special.type, color)),
        );
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
    const pose = baked.length;
    baked.push(
      this.art.texture(this.poseName(type, color, pose), () =>
        bakePose(this.variety(color), this.bake, pose, this.dressing(type, color)),
      ),
    );
    if (baked.length < this.bake.frames) this.partBeats.set(key, baked);
    else {
      this.partBeats.delete(key);
      this.cache.set(key, baked);
    }
  }

  /** A striped or rainbow koi's pose's name in the art book: `special/striped/m3-red/05`. */
  private poseName(type: 'striped' | 'rainbow', color: PieceColor, pose: number): string {
    return frameName(`special/${type}/${this.variety(color)}`, pose);
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
