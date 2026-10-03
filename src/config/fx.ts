/** The match splash drawn over the water: thin ink rings, droplets and the points that pop up. Stage px, seconds. */
export const SPLASH = {
  /** Moonlight-white for the rings and droplets, matching the ripple lines. */
  ink: '#eef6f6',
  /** Rings per diving koi: how many, the delay between them, how long each lives. */
  rings: 2,
  ringGap: 0.09,
  ringLife: 0.6,
  /** A ring grows from this radius to that one, and thins from this line width to that one. */
  ringFrom: 11,
  ringTo: 34,
  ringWidth: [1.8, 0.5],
  /** Droplets thrown up per diving koi: they start this far out (px), land this far (px, random in this range). */
  droplets: 5,
  dropletStart: 8,
  dropletReach: [18, 32],
  dropletLife: 0.42,
  dropletSize: 1.3,
} as const;

/** The points that pop up over a match, then fly to the score. */
export const POINTS = {
  fill: '#ffd76a',
  stroke: '#0a1a2e',
  fontSize: 24,
  font: '"Palatino Linotype", Palatino, "Book Antiqua", "Noto Serif", serif',
  /** Pop in, rise a little and hold (s, px), then fly to the score and shrink into it (s, scale). */
  pop: 0.28,
  rise: 14,
  hold: 0.2,
  flight: 0.5,
  landScale: 0.45,
} as const;
