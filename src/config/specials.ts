import { TIMING } from './timing';
import { SPECIAL_MENU } from './ui';
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

/**
 * The boosters' motions, after the prototype (times in seconds, sizes in cells).
 * - swap: both koi leap in crossing arcs; the leap takes `min` + `perCell` per cell apart past the first (at most
 *   `max`) and peaks `height` high (a little lower for near swaps), the second koi `height2` of that, landing at
 *   `second` of the leap. They grow by `grow` at the top and bow `bend` of the way sideways; the first spins a full
 *   turn, the second tilts `tilt` rad and back; the game stops for `hitStop` as they cross
 * - feed: `pellets` (`pellet` cells across) are lobbed from the button over `throw`, scattering `scatter` round the
 *   food, and float for
 *   `food`; the school turns to it (`turn`), then each koi swims a bowed path (`bend` per cell, up to 3) in `swim0` +
 *   `swimPer` per cell (at most `swimMax`), `stagger` after the one before, the koi pushed aside `pushed` later; the
 *   board holds `hold` once they're in place. It gathers up to `lines` lines of 3
 * - special: the koi rises `rise` cells and spins `spinTurns` turns in `spin`, `sparkles` per second swirling in
 */
export const BOOSTER_MOTION = {
  swap: {
    min: 0.45,
    max: 0.8,
    perCell: 0.075,
    height: 1.05,
    height2: 0.62,
    grow: 0.42,
    bend: 0.22,
    second: 0.9,
    tilt: -0.6,
    hitStop: 0.06,
  },
  feed: {
    /** A swim's bow puts its curve's control point at most this many cells to the side (the path bulges half that). */
    maxBow: 1.2,
    pellets: 9,
    pellet: 0.26,
    throw: 0.5,
    lob: 0.75,
    scatter: 0.6,
    food: 1.5,
    turn: 0.16,
    swim0: 0.34,
    swimPer: 0.085,
    swimMax: 0.95,
    bend: 0.32,
    stagger: 0.035,
    pushed: 0.1,
    hold: 0.16,
    lines: 3,
  },
  special: { rise: 0.3, spin: 0.42, spinTurns: 2, sparkles: 40 },
} as const;

/**
 * How the board answers an armed booster (after the prototype): the koi it can't take dim by `dim` (easing in at
 * `dimIn` per second), the ones it can pulse by `pulse` in a wave at `pulseSpeed`, and the picked koi lifts `lift`
 * cells over a gold ring with pink arcs.
 */
export const BOOSTER_MARKS = {
  dim: 0.5,
  dimIn: 6,
  pulse: 0.05,
  pulseSpeed: 4.2,
  lift: 0.14,
  gold: '#ffd76a',
  pink: '#ffb3d1',
} as const;

/**
 * The timings the sounds follow (s), so they line up with what they go with: a whirlpool's spin and pull, the morph's
 * spin, the petals' stagger, the lotus's unfolding, and how high a run of prism chimes climbs.
 */
export const SPECIALS_SOUND = {
  whirl: TIMING.specials.whirlSpin + TIMING.specials.whirlPull,
  morph: BOOSTER_MOTION.special.spin,
  petalStagger: SPECIAL_MENU.stagger,
  bloom: { unfold: 0.85, stagger: 0.04 },
  chimeMax: 9,
} as const;
