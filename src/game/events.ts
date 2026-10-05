import { EventBus } from '../core/EventBus';
import type { BoosterType } from '../model/boosters';
import type { SpecialType } from '../model/types';

/**
 * What happens in the game that something else may care about (the sounds, for now), by name and payload. The game
 * and its views say what happened; they never know who listens.
 */
export interface GameEvents {
  /** A valid swap starts, or a swap that makes nothing bounces back. */
  swap: undefined;
  invalidSwap: undefined;
  /**
   * A move was spent: how many are left, and whether every goal is met already (the moves left are a victory lap,
   * nothing to warn about).
   */
  moveSpent: { movesLeft: number; goalsMet?: boolean };
  /**
   * A cascade round clears: which round of the turn (0 = the swap's own), how many koi, and the strongest special it
   * made, if any.
   */
  match: { round: number; size: number; made?: SpecialType };
  /** A koi slips under; a koi settles into a new cell. */
  dive: undefined;
  land: undefined;
  /** The lily pads: a bud opens a stage, a lotus blooms, an empty pad drifts away. */
  budHit: undefined;
  bloom: undefined;
  padDrift: undefined;
  /** The board had no move left and was dealt again. */
  reshuffle: undefined;
  /** A goal was met (the nth this level, from 0); the last one, so every goal is met and the rest is a victory lap. */
  goalMet: { n: number };
  allGoalsMet: undefined;
  /** A special is born, or fires. */
  specialBorn: { type: SpecialType };
  lineFired: undefined;
  whirlFired: undefined;
  whirlPopped: undefined;
  rainbowRose: undefined;
  rainbowFired: undefined;
  /** A rainbow koi's beam lands on its nth koi. */
  prismHit: { n: number };
  /** The boosters: armed (its place on the bar), put away, a tap it can't take, a koi picked up. */
  boosterArmed: { type: BoosterType; slot: number };
  boosterCancelled: undefined;
  boosterRefused: undefined;
  koiLifted: undefined;
  /** Swap booster: two koi leap (for `duration` s) and land; the second, `low`, a little lower. */
  koiLeapt: { duration: number };
  koiLanded: { low: boolean };
  /** Feed booster: pellets thrown; a fed koi reaches the food. */
  pelletsThrown: undefined;
  koiFed: undefined;
  /** Special booster: the petals open; a koi spins up into a special. */
  petalsOpened: undefined;
  koiMorphed: undefined;
  /** A level starts: the first one, and each again after Play again. */
  levelStarted: undefined;
  /** The level ends; a star lands on the end card (the kth, from 0). */
  won: undefined;
  lost: undefined;
  starLanded: { k: number };
  /** A button takes (play again, the sound toggle). */
  buttonClicked: undefined;
}

/** The game's event bus. */
export type GameEventBus = EventBus<GameEvents>;

export function createGameEvents(): GameEventBus {
  return new EventBus<GameEvents>();
}
