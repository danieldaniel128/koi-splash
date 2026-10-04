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
  starLost: 1.5,
} as const;

/** The goal chip's lotus icon: its radius (px), baked from the same painter as the lotuses on the board. */
export const GOAL_TRAY = {
  iconRadius: 13,
} as const;

/** The specials bar under the pond: a slot per power. Placeholders for now, locked until the powers exist. */
export const POWER_BAR = {
  slots: 3,
} as const;

/** The end-of-level card fades in and pops (s). */
export const RESULT_CARD = {
  fadeIn: 0.3,
  popIn: 0.45,
} as const;

/** Phones play upright: this media query is a phone (touch, short) held sideways. */
export const PORTRAIT_LOCK = {
  sidewaysPhone: '(orientation: landscape) and (pointer: coarse) and (max-height: 540px)',
} as const;
