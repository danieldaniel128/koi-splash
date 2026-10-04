import { HUD } from './hud';

/**
 * One splash per match, drawn over the water: a bright flash over the match, a burst of foam where each koi goes
 * under, and droplets of different sizes thrown up in arcs that land with small rings of their own. Stage px, seconds.
 */
export const SPLASH = {
  /** Moonlit white for the droplets, and the pale water-light of the flash. */
  ink: '#eef8f8',
  flash: '#bdeaf0',
  /**
   * The flash: size (px) plus this share of the match's length (so a line gets a long flash along it), how long it
   * lasts, peak strength, and the share of it that's a solid white core.
   */
  flashSize: 76,
  flashStretch: 0.7,
  flashLife: 0.34,
  flashAlpha: 1,
  flashCore: 0.3,
  /**
   * The foam burst at each koi: soft blobs in one, size (px, random in range), how long it lasts, strength, and up
   * to how late it starts (s), so the bursts of one match don't pop in step.
   */
  foamBlobs: 22,
  foamSize: [48, 66],
  foamLife: 0.4,
  foamAlpha: 0.85,
  foamStagger: 0.06,
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
