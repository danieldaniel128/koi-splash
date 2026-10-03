import type { BoardSpec } from '../model/rules';

export const BOARD = {
  cols: 7,
  rows: 9,
  kinds: 5,
  /** Size of one cell on the stage. */
  cellSize: 46,
} as const satisfies BoardSpec & { cellSize: number };
