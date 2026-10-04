import type { BoosterSlot } from '../ui/BoosterBar';

/** How the HUD moves (s, scale). Its look is in the theme (src/theme). */
export const HUD_MOTION = {
  /** The score counts up to a new value in this long, and swells while it does. */
  countUp: 0.35,
  scoreBump: 1.18,
  /** The moves counter pops when a move is spent, warns at `lowMoves` left and pulses at `lastMoves`. */
  movesBump: 1.3,
  movesSettle: 0.3,
  lowMoves: 5,
  lastMoves: 3,
  /** The goal chip pops when its count ticks down, and a star pops as it's lost. */
  goalBump: 1.3,
  goalSettle: 0.4,
  starEarned: 1.7,
} as const;

/** The goal chips' icons, baked from the same painters as the board: the lotus's radius and a koi's size (px). */
export const GOAL_TRAY = {
  iconRadius: 13,
  koiSize: 34,
} as const;

/**
 * The booster bar under the pond, left to right: which icon, its name, and how many the player starts with (the
 * prototype gives one of each per pond). The boosters themselves come later.
 */
export const BOOSTERS = [
  { icon: 'swap', name: 'Swap', count: 1 },
  { icon: 'special', name: 'Special', count: 1 },
  { icon: 'feed', name: 'Feed', count: 1 },
] as const satisfies readonly BoosterSlot[];

/** The end-of-level card fades in and pops (s). */
export const RESULT_CARD = {
  fadeIn: 0.3,
  popIn: 0.45,
  /** The stars earned land one by one: the first this long after the card, then one every `starStep` (s). */
  firstStar: 0.4,
  starStep: 0.35,
  starPop: 0.4,
} as const;

/** Phones play upright: this media query is a phone (touch, short) held sideways. */
export const PORTRAIT_LOCK = {
  sidewaysPhone: '(orientation: landscape) and (pointer: coarse) and (max-height: 540px)',
} as const;
