/**
 * The koi variety (from the koi bank) used for each piece kind. Kind 0 is the first entry. Five colours that never
 * share a hue with the indigo water: red, gold, rose pink, jade (Midorigoi, a real green koi) and amethyst purple.
 */
export const KOI_SET = ['m3-red', 'm3-gold', 'dream-rose-gold', 'dream-jade', 'dream-amethyst'] as const;

export const KOI_LOOK = {
  /** Size of the square a koi is painted in, as a share of the cell. The fish fits a circle of ~0.43 of it. */
  scale: 1.08,
  /** Body width (0.12 slim .. 0.28 chubby): chubby enough that the colour fills the cell. */
  build: 0.245,
  /** Bake textures at this multiple of the screen resolution, so they stay sharp when the stage is scaled up. */
  bakeResolution: 2,
  /** Poses in one baked tail beat, and how far the tail swings in them (1 = the painter's widest). */
  swimFrames: 12,
  tailSwing: 0.55,
  /**
   * The cartoon outline: one even stroke of dark ink around each koi (px), so the shapes read crisply on a phone;
   * softer around the fins and tail, which are under the water.
   */
  outline: '#050c1b',
  outlineWidth: 1.3,
  finOutlineAlpha: 0.7,
  /**
   * The fins and tail are under the surface: they take on this pale moonlit water colour (a dark one turns gold and
   * red muddy), the fins by this share and the rear of the body by a smaller one.
   */
  underwater: '#9cc3d3',
  finsUnder: 0.3,
  tailUnder: 0.22,
} as const;

/** How the koi swim while they wait between moves (radians, seconds, px). */
export const KOI_SWIM = {
  /** Tail beats per second at rest, and how much faster they beat per 100 px/s of speed. */
  restBeat: 0.55,
  beatPerSpeed: 0.9,
  /** Fastest tail beat (beats per second). */
  maxBeat: 3.2,
  /** A slow sway of the whole body at rest: angle and speed (radians, radians per second). */
  sway: 0.07,
  swaySpeed: 0.9,
  /** How quickly a koi turns to its new heading (share of the gap closed per second). */
  turnRate: 3.5,
  /** Every so often one resting koi flicks its tail and turns: seconds between flicks (random in this range). */
  flickEvery: [0.9, 2.2],
  /** How far a flick turns the koi (radians, random in this range, either way). */
  flickTurn: [0.35, 0.9],
  /** A flick makes the tail beat this much faster, calming over this many seconds. */
  flickBeat: 2.4,
  flickCalm: 0.9,
  /** Where the tail is, from the centre, as a share of the koi's painted size. */
  tailAt: 0.36,
} as const;
