import { HUD } from './hud';

/** The points that pop up over a match, then fly to the score. */
export const POINTS = {
  /** The score's own gold and font, so the points land in it seamlessly. */
  fill: HUD.gold,
  stroke: '#0a1a2e',
  fontSize: 24,
  font: HUD.numberFont,
  /** Pop in, rise a little and hold (s, px), then fly to the score and shrink into it (s, scale). */
  pop: 0.28,
  rise: 14,
  hold: 0.2,
  flight: 0.5,
  landScale: 0.45,
} as const;
