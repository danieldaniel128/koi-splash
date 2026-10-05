import { THEME } from '../theme/theme';

/**
 * The points that pop up where they were made (after the prototype): small ones pop up, rise and fade there; big ones
 * (`flyMin` and up) fly into the score with a soft glow, and the score takes them as they land. Their colour is the
 * cascade round's (THEME.color.combo1..4) and their size grows with the koi they count: `sizeBase` + `sizePerKoi` a
 * koi, at most `sizeMax` px (the label is drawn at that size and scaled down).
 */
export const POINTS = {
  /** Drawn white and tinted with the round's colour; the stroke stays dark. */
  fill: '#ffffff',
  stroke: THEME.color.outline,
  fontWeight: `${THEME.weight.black}` as const,
  font: THEME.font.number,
  sizeBase: 17,
  sizePerKoi: 1.5,
  sizeMax: 30,
  /** Pop in, rise and hold, then fade (s, px). */
  pop: 0.18,
  rise: 22,
  hold: 0.35,
  fade: 0.3,
  /** The most labels kept for reuse. */
  pool: 16,
  /**
   * A big gain pops up over `flyPop` s (rising `flyRise` px, `flyScale` big), then flies into the score over
   * `flyTime`, shrinking by `flyShrink`.
   */
  flyMin: 100,
  flyPop: 0.35,
  flyRise: 18,
  flyScale: 1.25,
  flyTime: 0.65,
  flyShrink: 0.45,
  /** How far the flight bows out sideways on its way up (px). */
  flyBow: 60,
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

/**
 * The pond is won: before the end card, a beat of celebration (s): sparkles burst from the board's middle (`count`,
 * up to `reach` cells out, `size` px, each living about `life` s, drifting `drift` px up, starting within `spread`
 * s), the camera pushes in and the pond flashes.
 */
export const CELEBRATION = {
  count: 36,
  reach: 3.2,
  size: 26,
  life: 1.1,
  drift: 40,
  spread: 0.25,
  /** The most sparkles kept for reuse. */
  sparkles: 48,
} as const;
