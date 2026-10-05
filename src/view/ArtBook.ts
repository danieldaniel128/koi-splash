import { Texture } from 'pixi.js';
import { blank, context } from '../art/canvas';

/** Paints one picture of the game's art on a canvas of its own (see src/art). */
export type PaintFrame = () => HTMLCanvasElement;

/** Paints a run of pictures that are made together (a striped koi's sheen), in order. */
export type PaintFrames = () => readonly HTMLCanvasElement[];

/**
 * Where every texture of the game's art comes from, by name (see "Asset pipeline" in the README): a frame of the
 * shipped atlases when they were loaded, or else painted on the spot by the painter given with the name. The names
 * are the atlases' frame names, so a picture is found by the same name whichever way it was made. `onPaint` sees
 * every picture painted, with its name: the bake page records them into the atlases.
 */
export class ArtBook {
  /** True when the textures come from the atlases (only a frame missing from them is painted). */
  readonly baked: boolean;

  constructor(
    private readonly frames: ReadonlyMap<string, Texture> | null,
    private readonly onPaint?: (name: string, canvas: HTMLCanvasElement) => void,
  ) {
    this.baked = frames !== null;
  }

  /** The texture named `name`: the atlas's frame, or `paint`'s picture. */
  texture(name: string, paint: PaintFrame): Texture {
    return this.frames?.get(name) ?? Texture.from(this.painted(name, paint()));
  }

  /** The textures named `prefix`/00, /01... (`count` of them): all from the atlas, or all painted by `paint`. */
  textures(prefix: string, count: number, paint: PaintFrames): Texture[] {
    const names = Array.from({ length: count }, (_, i) => frameName(prefix, i));
    const found = names.map((name) => this.frames?.get(name));
    if (found.every((texture) => texture !== undefined)) return found;
    return paint().map((canvas, i) => Texture.from(this.painted(frameName(prefix, i), canvas)));
  }

  /** The picture named `name` on a canvas of its own (for the HTML UI's images): cut from the atlas, or painted. */
  canvas(name: string, paint: PaintFrame): HTMLCanvasElement {
    const baked = this.frames?.get(name);
    return baked ? canvasOf(baked) : this.painted(name, paint());
  }

  private painted(name: string, canvas: HTMLCanvasElement): HTMLCanvasElement {
    this.onPaint?.(name, canvas);
    return canvas;
  }
}

/** Frame `index` of a run, two digits so the names sort in order: `koi/m3-red/swim/07`. */
export function frameName(prefix: string, index: number): string {
  return `${prefix}/${String(index).padStart(2, '0')}`;
}

/**
 * A texture's picture on a canvas: its own canvas when it was painted on one, or else its frame cut out of the atlas
 * image it's on.
 */
export function canvasOf(texture: Texture): HTMLCanvasElement {
  const resource: unknown = texture.source.resource;
  const { x, y, width, height } = texture.frame;
  const whole = x === 0 && y === 0 && width === texture.source.width && height === texture.source.height;
  if (resource instanceof HTMLCanvasElement && whole) return resource;
  if (!isDrawable(resource)) throw new Error('a texture without a picture to draw');
  const canvas = blank(width, height);
  context(canvas).drawImage(resource, x, y, width, height, 0, 0, width, height);
  return canvas;
}

function isDrawable(resource: unknown): resource is CanvasImageSource {
  return (
    resource instanceof HTMLCanvasElement ||
    resource instanceof HTMLImageElement ||
    (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap)
  );
}

/**
 * The art book and what its art is made for: the cell (stage px) and the pixels per stage px. A sprite showing it
 * scales it to its own board's cell.
 */
export interface ArtScale {
  readonly book: ArtBook;
  readonly cellSize: number;
  readonly resolution: number;
}
