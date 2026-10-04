/**
 * How the special koi look and move (after the prototype's). Sizes are shares of a cell, times in seconds, speeds in
 * radians per second.
 */
export const SPECIAL_LOOK = {
  /** A striped koi: its bands, how many across and the fine line between them. */
  stripes: { count: 7, line: 'rgba(30, 14, 24, 0.85)' },
  /** Its sheen: a light bar baked in frames, sweeping tail to head every `every` s, each sweep `sweep` s long. */
  sheen: { frames: 10, every: 1.5, sweep: 0.5 },
  /** The glow under a striped koi: stretched along it (length, width), its strength and how it pulses. */
  glow: { length: 1.9, width: 1.3, alpha: 0.45, pulse: 0.2, speed: 5 },
  /** A rainbow koi: how fast its colours flow, its prism glow (size, spin) and the sparkles orbiting it. */
  rainbow: {
    flow: 1.9,
    glow: 1.8,
    glowSpin: 0.8,
    glowAlpha: 0.7,
    sparkles: 3,
    sparkleSize: 0.32,
    orbit: 0.36,
  },
  /** A whirlpool: its eddy's size and spin, how fast the koi curled in its eye turns, and the curl's radius. */
  whirl: { eddy: 1.2, spin: 2.6, koiSpin: 1.7, curl: 0.21 },
} as const;

/**
 * The specials' effects (sizes in cells, times in seconds), after the prototype: the line beam, the whirlpool's
 * vortex and pop, the rainbow's prism beams, how hard each pushes the water, and a short hit-stop on the big moments.
 */
export const SPECIAL_FX = {
  /** The beam grows to `length` boards long along the line, `width` cells thick, and fades over `life`. */
  beam: { life: 0.55, length: 2.2, width: 1.3, push: 0.5, pushRadius: 12 },
  /** The vortex grows from `from` to `to` cells across while it spins up (rad/s), then fades over `fade`. */
  vortex: { from: 1.2, to: 3.1, spin0: 3, spinMax: 15, fade: 0.45, pull: -0.9, pop: 1.6, popRadius: 22 },
  /** Prism beams: how far they bow out (share of their length), their life, widths (px) and the splash they land with. */
  prism: {
    bend: 0.22,
    life: 0.46,
    widths: [10, 4.5, 1.6],
    alphas: [0.3, 0.85, 1],
    push: 0.45,
    pushRadius: 10,
  },
  /** A special is born: a flash of its glow (cells) and a ring in the water. */
  birth: { flash: 1.6, life: 0.4, push: 0.8, pushRadius: 16 },
  /** The game's clock slows to this for a moment on a whirlpool's pop or a rainbow's first beam (s). */
  hitStop: { scale: 0.08, time: 0.07 },
} as const;
