import { THEME } from '../theme/theme';

/** The points that pop up over a match, then fly to the score. */
export const POINTS = {
  /** The score's own gold and font, so the points land in it seamlessly. */
  fill: THEME.color.gold,
  stroke: '#0a1a2e',
  fontSize: 24,
  fontWeight: '900',
  font: THEME.font.number,
  /** Pop in, rise a little and hold (s, px), then fly to the score and shrink into it (s, scale). */
  pop: 0.18,
  rise: 14,
  hold: 0.08,
  flight: 0.32,
  landScale: 0.45,
} as const;
