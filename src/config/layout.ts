import { POND } from './pond';

/** What the layout is built from: the grid, the bands above and below it, and the spacing. Stage px. */
export interface LayoutConfig {
  readonly cols: number;
  readonly rows: number;
  /** The design size: the stage is never smaller than this, so nothing gets cramped on small screens. */
  readonly designWidth: number;
  readonly designHeight: number;
  /** The HUD band above the pond and the specials bar below it. */
  readonly hudHeight: number;
  readonly barHeight: number;
  /** Space between the screen edges and everything, and between the HUD, the pond's shore and the bar. */
  readonly sidePadding: number;
  readonly sectionGap: number;
  /** Room the shore takes outside the water all round (the stones), so they stay on screen. */
  readonly shoreWidth: number;
  /** Water between the board and the pond's shore on each side. The whole pond stays on screen. */
  readonly pondMargin: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  /** Water between neighbouring cells: koi and pads are drawn inside cell - gap. */
  readonly cellGap: number;
  /**
   * Where the pond sits in the height left over (0 top, 0.5 centred, 1 bottom). Low leaves an open scene above it,
   * like the art over the board in commercial match-3s.
   */
  readonly pondAlign: number;
  /** Bounds for a cell's size, so a tablet doesn't get giant koi and a small phone tiny ones. */
  readonly minCell: number;
  readonly maxCell: number;
  /** The instruction pill shown while a booster is armed: its height, and the gap between it and the board under it. */
  readonly pillHeight: number;
  readonly pillGap: number;
}

/**
 * How the game is laid out on any screen (see layoutGame), in stage px. The stage is at least 360 x 640 (a common
 * phone viewport in CSS pixels) and grows to cover the whole screen; everything else is placed from these values.
 */
export const LAYOUT = {
  designWidth: 360,
  designHeight: 640,
  hudHeight: 84,
  barHeight: 76,
  sidePadding: 8,
  sectionGap: 6,
  /** The stones around the pond reach this far out from the water (see POND.shore). */
  shoreWidth: 15,
  pondMargin: POND.margin,
  /**
   * Water between neighbouring koi (px): a koi is painted in a square of its cell minus this. The fish fits a circle
   * of ~0.43 of that square, so even at 1 px there is about a sixth of a cell of water between neighbours however
   * they turn. Higher = more space.
   */
  cellGap: 1,
  pondAlign: 1, // all the room left over goes to the garden above the pond
  minCell: 36,
  maxCell: 60,
  pillHeight: 40,
  pillGap: 12,
} as const satisfies Omit<LayoutConfig, 'cols' | 'rows'>; // the board's size comes from its shape
