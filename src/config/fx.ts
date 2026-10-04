/**
 * One splash per match, drawn over the water: a bright flash where the koi break the surface, a broken crown of foam
 * thrown out, and droplets of different sizes thrown up in arcs that land with small rings of their own. Stage px,
 * seconds. The flash and crown stretch along the match: their size is this many px plus the match's length.
 */
export const SPLASH = {
  /** Moonlit white for the droplets, and the pale water-light of the flash. */
  ink: '#eef8f8',
  flash: '#bdeaf0',
  /** The flash: size (px), how long it lasts, peak strength, and the share of it that's a solid white core. */
  flashSize: 70,
  flashLife: 0.34,
  flashAlpha: 1,
  flashCore: 0.3,
  /** The crown of foam: size (px), how long it lasts, strength. */
  crownSize: 60,
  crownLife: 0.42,
  crownAlpha: 0.9,
  /** Droplets for a match of three, and how many more for each koi past three. */
  droplets: 10,
  dropletsPerExtraKoi: 3,
  /** Droplet radius (px), how far from its koi it lands (px), how high it arcs (px) and how long it flies (s). */
  dropletSize: [1.2, 3.2],
  dropletReach: [12, 44],
  dropletArc: [8, 26],
  dropletLife: [0.36, 0.62],
  /** Droplets leave from this far around a matched koi (px). */
  dropletStart: 8,
  /** Where a droplet lands it pushes the water (push in water-height units, radius in px): a small ring. */
  landPush: 0.035,
  landRadius: 8,
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
