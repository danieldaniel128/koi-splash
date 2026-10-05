import { THEME } from '../theme/theme';

/** The points that pop up over a match, then fly to the score. */
export const POINTS = {
  /** The score's own gold and font, so the points land in it seamlessly. */
  fill: THEME.color.gold,
  stroke: '#0a1a2e',
  fontSize: 24,
  fontWeight: '900',
  font: THEME.font.number,
  /** Pop in, rise a little and hold (s, px), then fly to the score and shrink into it (s, scale). */
  pop: 0.18,
  rise: 14,
  hold: 0.08,
  flight: 0.32,
  landScale: 0.45,
} as const;

/**
 * The camera over the pond (after the prototype). Shake: a shake level from 0 to 1 that decays by `decay` a second and
 * moves the pond up to `max` px at full (level squared, so small shakes stay small), jittering at `x` and `y` Hz.
 * Players who ask for less motion get `gentle` of it and no push-in. Punch: a push-in of `zoom` about a point, in
 * over `in`, held for `hold`, out over `out` (s).
 */
export const CAMERA = {
  shake: { max: 11, decay: 1.7, x: 73, y: 57, gentle: 0.35 },
  punch: { zoom: 0.07, in: 0.5, hold: 0.35, out: 0.4 },
} as const;

/**
 * How hard each moment hits: shake added per koi a round takes and per cascade round, and by each special; the
 * animations' clock held still (hit-stop, s) on big rounds (`bigRound` koi or a cascade's `bigCascade`th round) and
 * huge ones; the vibration on phones (ms).
 */
export const IMPACT = {
  shake: { perKoi: 0.02, perRound: 0.12, line: 0.3, whirlPop: 0.42, rainbow: 0.35, born: 0.15, win: 0.5 },
  hitStop: { big: 0.07, huge: 0.13, bigRound: 5, hugeRound: 9, bigCascade: 3, hugeCascade: 4 },
  vibrate: { special: 18, combo: 12, win: [24, 60, 30] },
  /** A white flash over the pond (its strength, 0 to 1) that fades at `decay` a second. */
  flash: { born: 0.12, special: 0.18, win: 0.35, decay: 3.2 },
  /** A vibration for cascades from this round on (0 = the swap's own). */
  vibrateFrom: 2,
} as const;
