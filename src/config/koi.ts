/**
 * The koi variety (from the koi bank) used for each piece kind. Kind 0 is the first entry. Five colours that never
 * share a hue with the indigo water: red, gold, rose pink, jade (Midorigoi, a real green koi) and amethyst purple.
 */
export const KOI_SET = ['m3-red', 'm3-gold', 'dream-rose-gold', 'dream-jade', 'dream-amethyst'] as const;

/** One entry per kind, in KOI_SET order: a list of another length doesn't compile. */
type OnePerKind<T, Set extends readonly unknown[] = typeof KOI_SET> = { readonly [K in keyof Set]: T };

/**
 * Each kind's colours as a special koi, in KOI_SET order: its glow (under a striped koi, a whirlpool's arms, beams)
 * and the band of a striped koi (the other bands are white).
 */
export const KOI_COLORS = [
  { glow: '#ff7b6b', band: '#e3443a' },
  { glow: '#ffd86b', band: '#f0a92e' },
  { glow: '#ffa6c9', band: '#ec7fa8' },
  { glow: '#7ff0b0', band: '#3fbf74' },
  { glow: '#c39bff', band: '#9a62e6' },
] as const satisfies OnePerKind<{ glow: string; band: string }>;

export const KOI_LOOK = {
  /** Body width (0.12 slim .. 0.28 chubby): chubby enough that the colour fills the cell. */
  build: 0.245,
  /**
   * The koi, pads and stones are baked at the screen's pixels per stage px times this, so a koi lifted in a swap or
   * a window grown a little after the start stays sharp; never above maxBakeResolution, so a big screen doesn't bake
   * huge textures.
   */
  bakeHeadroom: 1.25,
  maxBakeResolution: 4,
  /** Poses in one baked tail beat, and how far the tail swings in them (1 = the painter's widest). */
  swimFrames: 12,
  tailSwing: 0.55,
  /**
   * The cartoon outline: one even stroke of dark ink around each koi (px), so the shapes read crisply on a phone;
   * softer around the fins and tail, which are under the water.
   */
  outline: '#050c1b',
  outlineWidth: 1.9,
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
