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
  /** The lotus goal: bloom every bud. Swap for { type: 'score', target: 1500 } to play for points instead. */
  goal: { type: 'lotus', count: 3 } as GoalDef,
  pads: {
    /** One bud per lotus in the goal (keep these two equal for a lotus goal). */
    buds: 3,
    emptyPads: 2,
    /** Matches touching a bud before it blooms, and touching an empty pad before it drifts away. */
    hitsToBloom: 2,
    hitsToDrift: 1,
  } satisfies PadSpec,
} as const;

export const SCORE = {
  pointsPerPiece: 10,
} as const;
