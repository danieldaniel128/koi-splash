import type { GoalDef } from '../model/goals';
import type { PadSpec } from '../model/pads';

/**
 * The one level for now. Change any number here: more lotuses, 15 hits to bloom, a score goal instead.
 * Only valid swaps spend a move.
 */
export const LEVEL = {
  moves: 20,
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
