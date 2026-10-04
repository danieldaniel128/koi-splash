/** How the HUD moves (s, scale). Its look is in ui/theme.ts. */
export const HUD_MOTION = {
  /** The score counts up to a new value in this long, and swells while it does. */
  countUp: 0.55,
  scoreBump: 1.18,
  /** The moves counter pops when a move is spent. */
  movesBump: 1.3,
  movesSettle: 0.3,
  /** A goal slot pops when its lotus lands. */
  slotBump: 1.45,
  slotSettle: 0.45,
} as const;

/** The goal in the HUD: one slot per lotus up to this many; a bigger goal shows a count instead. */
export const GOAL_TRAY = {
  maxSlots: 5,
  /** The lotus icon's radius (px), baked from the same painter as the pads on the board. */
  iconRadius: 13,
} as const;

/** The specials bar under the pond: a slot per power. Placeholders for now, locked until the powers exist. */
export const POWER_BAR = {
  slots: 3,
} as const;
