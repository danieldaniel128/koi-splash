import { Assets } from 'pixi.js';
import type { Spritesheet, Texture } from 'pixi.js';
import { ART_ATLAS } from '../config/art';
import type { StepProgress } from '../core/BootPipeline';
import { ArtBook } from '../view/ArtBook';
import type { ArtScale } from '../view/ArtBook';
import type { GameScreen } from './screen';

/**
 * The game's art and what it's made for: the art book its textures come from, the cell and the koi the art is
 * painted for (stage px) and its pixels per stage px. A sprite showing it scales it to the board's own cell.
 */
export interface ArtSet extends ArtScale {
  readonly koiSize: number;
}

/**
 * The game's art: the shipped atlases of the tier this screen needs, loaded with Pixi's Assets (`progress` follows
 * the download), or the code painters' art painted for this very board when the page asks for it (`?paint=1`, to
 * try a painter's change without baking) or the atlases can't be loaded.
 */
export async function loadArt(screen: GameScreen, progress: StepProgress): Promise<ArtSet> {
  if (new URLSearchParams(window.location.search).has('paint')) return paintedArt(screen);
  const tier = atlasTier(screen.resolution.art, screen.layout.board.koiSize);
  try {
    const frames = await loadAtlases(tier, progress);
    return {
      book: new ArtBook(frames),
      cellSize: ART_ATLAS.cellSize,
      koiSize: ART_ATLAS.koiSize,
      resolution: tier,
    };
  } catch (error) {
    console.warn('the art atlases did not load; the art is painted instead', error);
    return paintedArt(screen);
  }
}

/** The art painted on the spot for this board, at its own resolution; `onPaint` sees every picture painted. */
export function paintedArt(
  { layout, resolution }: GameScreen,
  onPaint?: (name: string, canvas: HTMLCanvasElement) => void,
): ArtSet {
  const { cellSize, koiSize } = layout.board;
  return { book: new ArtBook(null, onPaint), cellSize, koiSize, resolution: resolution.art };
}

/**
 * The atlas tier as sharp as painting for this board would be: the art is painted for ART_ATLAS's koi, so a bigger
 * koi needs more pixels per stage px. The highest tier at most.
 */
export function atlasTier(resolution: number, koiSize: number): number {
  const needed = Math.ceil(resolution * (koiSize / ART_ATLAS.koiSize) - 1e-6);
  const { tiers } = ART_ATLAS;
  return tiers.find((tier) => tier >= needed) ?? tiers[tiers.length - 1] ?? 1;
}

/**
 * Every frame of one tier's sheets, by name. The tier's folder lists its sheets (sheets.json); each is a Pixi
 * spritesheet (its JSON and its PNG).
 */
async function loadAtlases(tier: number, progress: StepProgress): Promise<Map<string, Texture>> {
  const folder = `${import.meta.env.BASE_URL}${ART_ATLAS.folder}/@${tier}x/`; // public/, wherever the page is
  const response = await fetch(`${folder}sheets.json`);
  if (!response.ok) throw new Error(`no atlas list at ${folder} (${response.status})`);
  const listed: unknown = await response.json();
  if (!Array.isArray(listed) || !listed.every((name) => typeof name === 'string')) {
    throw new Error(`the atlas list at ${folder} is not a list of sheets`);
  }
  const urls = listed.map((name) => folder + name);
  const sheets = await Assets.load<Spritesheet>(urls, progress);
  const frames = new Map<string, Texture>();
  for (const url of urls) {
    const sheet = sheets[url];
    if (!sheet) throw new Error(`the atlas ${url} did not load`);
    for (const [name, texture] of Object.entries(sheet.textures)) frames.set(name, texture);
  }
  return frames;
}
