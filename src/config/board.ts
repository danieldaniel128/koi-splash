import { KOI_SET } from './koi';

/**
 * The board the level is played on: one koi colour per entry of KOI_SET. Its shape is drawn in LEVEL.shape and read
 * while the game boots (see measureScreen), so a slip in the drawing shows the error screen.
 */
export const BOARD = {
  kinds: KOI_SET.length,
} as const;
