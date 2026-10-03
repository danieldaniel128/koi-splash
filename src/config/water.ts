/** The pond's look: the water shaders (bottom and surface), koi shadows and refraction. */
export const WATER = {
  // --- bank around the pond: indigo with a faint seigaiha (overlapping waves) pattern
  bank: '#0f1d3a',
  bankPattern: '#1f3a66',
  /** Width of one seigaiha circle in px. */
  patternSize: 34,
  moon: '#fff4d2',
  /** Moon glow position as a share of the board (0..1 across, 0..1 down). */
  moonAt: [0.78, 0.12],

  // --- pond shape: reaches this far past the board on every side, with this corner radius
  pondMargin: 14,
  pondRadius: 26,

  // --- water bands, from the shore inward, and where they change (px from the shore)
  shore: '#4fc4c9',
  mid: '#2486a6',
  deep: '#1a6386',
  bands: [12, 60],
  /** Stones are this colour multiplied in (darker = more visible). */
  stone: '#b4cdd8',
  light: '#bff6ff',
  lightStrength: 0.16,
  /** Grid spacing of the light loops on the bottom. */
  lightSpacing: 34,
  /** How far the waves shift the bottom (px per unit of slope). */
  refraction: 10,
  /** Half thickness of a ripple ring's white line, px. */
  ringWidth: 2.2,

  // --- waves
  /** Overall steepness of the waves: scales the refraction of the bottom and the koi together. */
  waveScale: 3.2,

  // --- sparkles on the surface (drawn above the koi)
  sparkleSpacing: 46,
  /** Share of cells that hold a sparkle. */
  sparkleChance: 0.3,
  sparkleSize: 7,
  /** Sparkles over the board itself are scaled by this, so they never hide a koi. */
  boardGlare: 0.45,

  // --- koi under the surface
  /** How far the waves shift the koi (px per unit of slope). */
  koiRefraction: 1.8,
  shadowOffset: [5, 9],
  shadowAlpha: 0.3,
  shadowBlur: 4,

  // --- ripple rings
  rippleSpeed: 120,
  rippleLife: 1.6,
  /** Ring strength for a swap, and for a match of 3 (each extra koi in the match adds matchRippleExtra). */
  swapRipple: 0.6,
  matchRipple: 1,
  matchRippleExtra: 0.2,
  /** Most rings alive at once; must match MAX_RIPPLES in the shaders. */
  maxRipples: 8,
} as const;
