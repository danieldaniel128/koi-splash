import { LAYOUT } from './layout';

/**
 * The texture atlases the game's art ships in (see "Asset pipeline" in the README), baked by `npm run bake:art` from
 * the code painters into public/art/@1x, @2x and @3x. Changing a number here means baking again.
 */
export const ART_ATLAS = {
  /** Where the atlases are, next to the page. */
  folder: 'art',
  /** Each tier is painted at this many pixels per stage px; the game loads the smallest one sharp enough. */
  tiers: [1, 2, 3],
  /**
   * The cell the art is painted for (stage px), about a phone's: on a bigger board the sprites scale up, and the
   * game picks a higher tier to stay as sharp as painting for that board would be.
   */
  cellSize: 41,
  koiSize: 41 - LAYOUT.cellGap,
  /** A sheet's largest side (px): every WebGL device takes a texture this big. Bigger art goes on more sheets. */
  maxSheetSize: 2048,
} as const;
