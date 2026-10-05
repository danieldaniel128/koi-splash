// The bake page (see tools/bakeArt.mts): paints every picture of the game's art with the same code the game paints
// it with when it has no atlases, records each under its frame name, and packs them into sheets for one tier.
import { blank, context } from '../../src/art/canvas';
import { packSheets } from '../../src/art/atlas';
import { ART_ATLAS } from '../../src/config/art';
import { POND } from '../../src/config/pond';
import type { PondPropSpot } from '../../src/config/pond';
import { BOARD_PADS } from '../../src/config/pond';
import { THEME } from '../../src/theme/theme';
import type { ArtSet } from '../../src/boot/art';
import { bakeKoi, createSpecialKoi, goalIcons, koiBake } from '../../src/boot/koi';
import { propLook } from '../../src/boot/pond';
import { ArtBook } from '../../src/view/ArtBook';
import { pelletTexture } from '../../src/view/BoosterMotions';
import { fireflyGlow } from '../../src/view/Fireflies';
import { padLook } from '../../src/view/PadView';
import { PondProps } from '../../src/view/water/PondProps';

/** One packed sheet: its picture as a PNG data URL, and where each frame is on it. */
export interface BakedSheet {
  readonly png: string;
  readonly width: number;
  readonly height: number;
  readonly frames: Record<string, { x: number; y: number; width: number; height: number }>;
}

declare global {
  interface Window {
    /** The tiers to bake, and the bake of one of them (read by tools/bakeArt.mts). */
    artTiers: readonly number[];
    bakeArt: (tier: number) => BakedSheet[];
  }
}

/** The stones standing in the pond (none in this one), placed anywhere: only their look is baked. */
const PROP_SPOTS: readonly PondPropSpot[] = POND.props;

/** Every picture of the art at one tier, by frame name. */
function paintEverything(tier: number): Map<string, HTMLCanvasElement> {
  const painted = new Map<string, HTMLCanvasElement>();
  const book = new ArtBook(null, (name, canvas) => painted.set(name, canvas));
  const art: ArtSet = { book, cellSize: ART_ATLAS.cellSize, koiSize: ART_ATLAS.koiSize, resolution: tier };
  const bake = koiBake(art.koiSize, art.resolution);
  goalIcons(art);
  for (const job of bakeKoi(bake, book).inBetweenJobs()) job();
  for (const job of createSpecialKoi(bake, book).warmUpJobs()) job();
  for (let k = 0; k < BOARD_PADS.looks; k++) padLook({ ...art, look: propLook() }, k);
  new PondProps(
    PROP_SPOTS.map((spot) => ({ ...spot, at: [0, 0] as [number, number] })),
    { ...art, look: propLook() },
  ).destroy();
  fireflyGlow(book, THEME.scene.firefly);
  pelletTexture(art);
  return painted;
}

/** The pictures packed on sheets no bigger than ART_ATLAS.maxSheetSize, in name order so a bake is repeatable. */
function packEverything(painted: Map<string, HTMLCanvasElement>): BakedSheet[] {
  const names = [...painted.keys()].sort();
  const pictures = names.map((name) => painted.get(name) ?? blank(1));
  const { slots, sheets } = packSheets(pictures, ART_ATLAS.maxSheetSize);
  return sheets.map((size, sheet) => {
    const canvas = blank(size.width, size.height);
    const ctx = context(canvas);
    const frames: BakedSheet['frames'] = {};
    slots.forEach((slot, i) => {
      const picture = pictures[i];
      const name = names[i];
      if (slot.sheet !== sheet || !picture || !name) return;
      ctx.drawImage(picture, slot.x, slot.y);
      frames[name] = { x: slot.x, y: slot.y, width: slot.width, height: slot.height };
    });
    return { png: canvas.toDataURL('image/png'), width: size.width, height: size.height, frames };
  });
}

window.artTiers = ART_ATLAS.tiers;
window.bakeArt = (tier) => packEverything(paintEverything(tier));
