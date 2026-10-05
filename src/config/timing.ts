/**
 * Motion timings in seconds. These are the main feel dials. Paced on a commercial match-3: a plain match settles in
 * about 0.7 s and a cascade round in about 0.6 s, so the board answers as fast as the player thinks.
 */
export const TIMING = {
  /** Two koi slide past each other; the one the player drags rises toward the surface and passes over. */
  swap: 0.16,
  /** How much the dragged koi grows as it lifts (1 = not at all), and how much the other one sinks. */
  swapLift: 1.16,
  swapSink: 0.92,
  /** A swap that makes no match: slide part of the way, then back. */
  invalidSwap: 0.26,
  /** How far the koi travel toward each other before bouncing back, as a share of a cell. */
  invalidReach: 0.35,
  /**
   * A koi swiped into a lily pad: how far it darts (share of a cell), how fast, how long the swim back takes and how
   * much it squashes on the bump.
   */
  bumpReach: 0.3,
  bumpIn: 0.09,
  bumpOut: 0.3,
  bumpSquash: 0.86,
  /**
   * A refused move (a swap that makes nothing, a swipe into a pad or the bank): the koi shake their heads, rocking
   * `angle` rad side to side `times` times over `duration` s.
   */
  refuse: { angle: 0.3, times: 2.5, duration: 0.4 },
  /** A koi under a finger squashes to this size and springs back over this long (s). */
  touchSquash: 0.88,
  touchTime: 0.2,
  /**
   * Matched koi dive: they swim forward and down into the deep (s), gliding this far ahead (share of a cell) and
   * shrinking to this size as they go, tinted toward the pale water.
   */
  dive: 0.32,
  /** As it goes, a matched koi kicks: it swells this much over this long (s), then sinks for the rest of the dive. */
  diveKick: 1.14,
  diveKickTime: 0.07,
  diveGlide: 0.35,
  diveScale: 0.45,
  diveTint: '#a9cfe0',
  /** The koi above start swimming down at this share of the dive, so there is no dead pause between them. */
  swimStartAt: 0.3,
  /** Swimming down into a gap: a base time plus a time per row (s), at swimming pace. */
  swimBase: 0.12,
  swimPerRow: 0.06,
  /** New koi rise from the deep into the empty cells, the lowest first. */
  rise: 0.28,
  riseStagger: 0.035,
  /** Where in the rise the new koi breaks the surface (a small ring). */
  riseSurfaceAt: 0.55,
  /**
   * The specials, after the prototype (see SpecialTiming): a shape spirals into its special; a striped koi's sweep
   * takes a cell every `sweep`; a whirlpool spins up, then drains its neighbours (corners a little later); a rainbow
   * koi rises, then its beams leave one by one and land; a caught special fires a beat after the blast reaches it.
   */
  specials: {
    merge: 0.36,
    sweep: 0.024,
    whirlSpin: 0.32,
    whirlPull: 0.34,
    whirlCorner: 0.03,
    rainbowRise: 0.3,
    rainbowStep: 0.05,
    rainbowTravel: 0.14,
    chain: 0.1,
    dive: 0.32,
  },
} as const;
