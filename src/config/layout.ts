import type { LayoutConfig } from '../layout/gameLayout';
import { BOARD } from './board';
import { POND } from './pond';

/**
 * How the game is laid out on any screen (see layoutGame), in stage px. The stage is at least 360 x 640 (a common
 * phone viewport in CSS pixels) and grows to cover the whole screen; everything else is placed from these values.
 */
export const LAYOUT = {
  cols: BOARD.cols,
  rows: BOARD.rows,
  designWidth: 360,
  designHeight: 640,
  hudHeight: 80,
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
  pondAlign: 0.8,
  minCell: 36,
  maxCell: 60,
} as const satisfies LayoutConfig;
