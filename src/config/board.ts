import { parseShape } from '../model/shape';
import type { BoardSpec } from '../model/types';
import { LEVEL } from './level';

/** The board's shape for the level (drawn in LEVEL.shape). */
export const SHAPE = parseShape(LEVEL.shape);

/** The board the level is played on: its shape and how many koi colours are in play. */
export const BOARD: BoardSpec = {
  ...SHAPE,
  kinds: 5,
};
