/**
 * How the special koi look and move (after the prototype's). Sizes are shares of a cell, times in seconds, speeds in
 * radians per second.
 */
export const SPECIAL_LOOK = {
  /** A striped koi: its bands, how many across and the fine line between them. */
  stripes: { count: 5, line: 'rgba(24, 12, 30, 0.55)' },
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
