import { parseShape } from '../model/shape';
import type { BoardSpec } from '../model/rules';
import { LEVEL } from './level';

/** The board the level is played on: its shape (from LEVEL.shape) and how many koi colours are in play. */
export const BOARD: BoardSpec = {
  ...parseShape(LEVEL.shape),
  kinds: 5,
};
