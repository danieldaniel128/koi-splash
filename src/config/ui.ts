import type { BoosterSlot } from '../ui/BoosterBar';
import type { PetalChoice } from '../ui/SpecialMenu';

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
  /** A met goal's bonus rises out of its chip for this long (s). */
  bonusRise: 1.3,
} as const;

/** The goal chips' icons, baked from the same painters as the board: the lotus's radius and a koi's size (px). */
export const GOAL_TRAY = {
  iconRadius: 13,
  koiSize: 34,
} as const;

/**
 * The booster bar under the pond, left to right (the prototype's): which booster, its name, how many a level gives,
 * and what the pill over the pond says while it's armed.
 */
export const BOOSTERS = [
  { type: 'swap', name: 'Swap', count: 1, tip: 'Pick two koi to swap' },
  { type: 'special', name: 'Special', count: 1, tip: 'Pick a koi to power up' },
  { type: 'feed', name: 'Feed', count: 1, tip: 'Tap a colour to feed' },
] as const satisfies readonly BoosterSlot[];

/**
 * The special booster's petals (after the prototype): one per special, left to right, on an arc `reach` cells out and
 * `spread` rad apart, fanned down for a koi in the top `topRows` rows; each `petal` cells across, blooming over
 * `open` s, `stagger` s apart, and kept `edge` px inside the screen.
 */
export const SPECIAL_MENU = {
  choices: [
    { type: 'line', name: 'Striped koi' },
    { type: 'whirl', name: 'Whirlpool' },
    { type: 'rainbow', name: 'Rainbow koi' },
  ],
  reach: 1.7,
  spread: 1.25,
  petal: 1.25,
  open: 0.3,
  stagger: 0.06,
  topRows: 3,
  edge: 44,
} as const satisfies { choices: readonly PetalChoice[] } & Record<string, unknown>;

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
