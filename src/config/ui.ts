import type { BoosterSlot } from '../model/boosters';
import type { SpecialType } from '../model/types';
import { THEME } from '../theme/theme';
import type { Bus } from './audio';

/** One petal of the special booster's menu: which special it makes, and its name. */
export interface PetalChoice {
  readonly type: SpecialType;
  readonly name: string;
}

/**
 * The sound menu's sizes (stage px): the button, a booster orb to line up with, the panel, a row, its padding, and
 * the gap between the panel and the bar.
 */
export interface SoundMenuLook {
  readonly button: number;
  readonly barOrb: number;
  readonly width: number;
  readonly row: number;
  readonly padding: number;
  readonly gap: number;
}

/** How the HUD moves (s, scale). Its look is in the theme (src/theme). */
export const HUD_MOTION = {
  /** The score counts up to a new value in this long, and swells while it does. */
  countUp: 0.35,
  scoreBump: 1.18,
  /** The moves counter pops when a move is spent, warns when moves are low and pulses on the last few (LEVEL.movesWarning). */
  movesBump: 1.3,
  movesSettle: 0.3,
  /** The goal chip pops when its count ticks down, and a star pops as it's lost. */
  goalBump: 1.3,
  goalSettle: 0.4,
  starEarned: 1.7,
  /** A met goal's bonus rises out of its chip for this long (s). */
  bonusRise: 1.3,
} as const;

/** How the booster bar answers: a press swells a button's orb, and a booster just spent shrinks it (scale, s). */
export const BAR_MOTION = {
  pressBump: 0.9,
  pressSettle: 0.3,
  spentBump: 0.85,
  spentSettle: 0.35,
} as const;

/** The "no" shake of a press the game can't take (a booster, the pill): px either way, then still, over `time` s. */
export const NOPE_SHAKE = { offsets: [-5, 4, -2], time: 0.34 } as const;

/**
 * The goal chips' icons, baked from the same painters as the board (px): the lotus's radius and the size it is shown
 * at (its painting has room round it for the shadow), and a koi's size, baked and shown.
 */
export const GOAL_TRAY = {
  iconRadius: 13,
  lotusSize: 38,
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
  /** A won pond is celebrated for this long before the card opens (s). */
  winBeat: 0.9,
  fadeIn: 0.3,
  popIn: 0.45,
  /** The stars earned land one by one: the first this long after the card, then one every `starStep` (s). */
  firstStar: 0.4,
  starStep: 0.35,
  starPop: 0.4,
} as const;

/** A lost graphics context that hasn't come back after this long (s) is given up on: the error screen shows. */
export const GPU_LOSS = {
  giveUpAfter: 5,
} as const;

/** Phones play upright: this media query is a phone (touch, short) held sideways. */
export const PORTRAIT_LOCK = {
  sidewaysPhone: '(orientation: landscape) and (pointer: coarse) and (max-height: 540px)',
} as const;

/**
 * The sound menu (stage px): the speaker button at the bar's right end, lined up with the boosters' orbs, opens a
 * small panel above the bar with a switch per channel, top to bottom. `gap` keeps the panel clear of the bar's top,
 * where an armed booster rises with its badge (about 15 px over it).
 */
export const SOUND_MENU = {
  look: {
    button: 36,
    barOrb: THEME.size.boosterOrb,
    width: 176,
    row: 44,
    padding: THEME.space.xs,
    gap: 20,
  } satisfies SoundMenuLook,
  channels: [
    { id: 'music', name: 'Music' },
    { id: 'ambience', name: 'Ambience' },
    { id: 'sfx', name: 'Effects' },
  ] as const satisfies readonly { id: Bus; name: string }[],
} as const;

/**
 * The banner lane over the top of the pond (after the prototype's): one banner at a time, the newest winning. It pops
 * in over `popIn` s, holds and fades out over `fadeOut`, `lasts` s in all. Its top is `top` cells below the board's
 * and it's `height` cells tall. A combo banner grows by `growPerRound` a round past the second, `maxGrowth` rounds
 * at most.
 */
export const BANNER = {
  lasts: 1.2,
  popIn: 0.2,
  fadeOut: 0.25,
  top: 0.35,
  height: 1.4,
  growPerRound: 0.07,
  maxGrowth: 4,
  text: {
    combo: 'Combo x',
    made: { line: 'Striped koi!', whirl: 'Whirlpool!', rainbow: 'Rainbow koi!' },
    reshuffle: 'Swirl!',
    goalsMet: 'All goals met!',
    goalsMetSub: 'Bonus moves',
    won: 'Pond complete!',
  },
} as const;
