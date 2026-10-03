/** HUD look, in stage units. It sits in the space above the board (see BOARD_LAYOUT.top). */
export const HUD = {
  top: 40,
  fontSize: 20,
  textColor: '#f3ead8',
  barTop: 34,
  barHeight: 8,
  barBack: '#1d3a4f',
  barFill: '#ffc94a',
} as const;

/** The end-of-level card. */
export const RESULT = {
  dimColor: '#06121c',
  dimAlpha: 0.72,
  textColor: '#f3ead8',
  titleSize: 32,
  detailSize: 18,
  lineGap: 40,
  hintAlpha: 0.7,
  fadeIn: 0.3,
  popIn: 0.45,
} as const;
