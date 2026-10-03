/**
 * The game is laid out on a fixed logical stage and scaled to fit the window, so every position in the code is in
 * these units no matter the phone. 360 x 640 is a common phone viewport in CSS pixels.
 */
export const STAGE = {
  width: 360,
  height: 640,
  background: '#0b1e2d',
} as const;

/** Where the board sits on the stage. The space above it is kept for the HUD. */
export const BOARD_LAYOUT = {
  top: 128,
} as const;
