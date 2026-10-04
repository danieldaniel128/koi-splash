import type { GoalDef } from '../model/goals';
import type { PadSpec } from '../model/pads';

/**
 * The one level for now. Change any number here: more lotuses, 15 hits to bloom, a score goal instead.
 * Only valid swaps spend a move.
 */
export const LEVEL = {
  /**
   * Tuned by simulation (400 boards each): a player who aims at the buds blooms 3 lotuses in a median of 6 moves and
   * wins about 70% within 15; a player who ignores them wins about 10% even with 20.
   */
  moves: 15,
  /**
   * The board's shape, drawn row by row from the top: # is a cell, . is no cell (the bank comes in). Keep a notch or
   * bay at least 2 cells wide, so there is room for the stones on both of its sides.
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
  /** The rating: a star at each of these scores (see starsFor). */
  stars: { scores: [1000, 2000, 3000] },
  pads: {
    /** One bud per lotus in the goal (keep these two equal for a lotus goal). */
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
