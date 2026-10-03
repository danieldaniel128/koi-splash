/** The match splash drawn over the water: thin ink rings, droplets and the points that pop up. Stage px, seconds. */
export const SPLASH = {
  /** Moonlight-white for the rings and droplets, matching the ripple lines. */
  ink: '#eef6f6',
  /** Rings per diving koi: how many, the delay between them, how long each lives. */
  rings: 2,
  ringGap: 0.09,
  ringLife: 0.6,
  /** A ring grows from this radius to that one, and thins from this line width to that one. */
  ringFrom: 7,
  ringTo: 30,
  ringWidth: [1.8, 0.5],
  /** Droplets thrown up per diving koi, how far they land (px, random in this range) and how long they fly. */
  droplets: 4,
  dropletReach: [10, 24],
  dropletLife: 0.45,
  dropletSize: 1.7,
} as const;

/** The points that rise from a match. */
export const POINTS = {
  fill: '#ffd76a',
  stroke: '#0a1a2e',
  fontSize: 22,
  /** How far they rise (px) and how long they stay. */
  rise: 30,
  life: 0.85,
} as const;
