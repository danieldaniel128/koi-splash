import type { GoalDef } from '../model/goals';
import type { PadSpec } from '../model/pads';

/**
 * The one level for now. Change any number here: more lotuses, 15 hits to bloom, a score goal instead.
 * Only valid swaps spend a move.
 */
export const LEVEL = {
  /**
   * Tuned on the earlier plain 7 x 9 board, with lotuses the only goal: there a player who aimed at the buds bloomed 3
   * lotuses in a median of 6 moves and won about 70% of boards within 15, and one who ignored them about 10% even
   * with 20.
   */
  moves: 15,
  /** Moves left at which the level warns it's running out (the HUD warms, the music tenses), then that it's nearly over. */
  movesWarning: { low: 5, last: 3 },
  /**
   * The board's shape, drawn row by row from the top: # is a cell, . is no cell (the bank comes in). A notch 1 cell
   * wide is too thin for stones on both its sides, so it gets one stone along it; a wider one gets a row on each side.
   */
  shape: ['..###..', '.#####.', '#######', '#######', '.#####.', '#######', '#######', '.#####.', '..###..'],
  /**
   * The goals, all to be reached to win. Mix and match: { type: 'lotus', count }, { type: 'score', target }, or
   * { type: 'koi', kind, count } to clear that many koi of one colour (kind 0 is the first of KOI_SET).
   */
  goals: [
    { type: 'lotus', count: 3 },
    { type: 'koi', kind: 0, count: 10 }, // 10 red koi
  ] as readonly GoalDef[],
  /**
   * The rating: a star at each of these scores (see starsFor). Set from the final scores of whole levels played
   * through (2340 to 4480, median 3070): a plain win earns one or two stars, a great one three.
   */
  stars: { scores: [1500, 2800, 4000] },
  pads: {
    /** One bud per lotus in the goal (fewer buds than lotuses to bloom fails at startup). */
    buds: 3,
    emptyPads: 2,
    /** Matches touching a bud before it blooms, and touching an empty pad before it drifts away. */
    hitsToBloom: 2,
    hitsToDrift: 1,
    /** Pads are at least this many cells apart, so they never cluster. */
    spacing: 2,
  } satisfies PadSpec,
} as const;

export const SCORE = {
  pointsPerPiece: 10,
  /** Paid for each goal as it's met, on top of the points of the round that met it. */
  goalBonus: 500,
} as const;
