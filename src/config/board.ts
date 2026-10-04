import type { BoardSpec } from '../model/rules';

export const BOARD = {
  cols: 7,
  rows: 9,
  kinds: 5,
} as const satisfies BoardSpec;
