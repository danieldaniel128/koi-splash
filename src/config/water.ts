/** The pond's look: the water shaders (bottom and surface), koi shadows and refraction. */
export const WATER = {
  // --- bank around the pond
  bankDark: '#050b10',
  bankMoss: '#13261f',
  moon: '#fff4d2',
  /** Moon position as a share of the board (0..1 across, 0..1 down): its glow and its reflection on the water. */
  moonAt: [0.78, 0.12],

  // --- pond shape: reaches this far past the board on every side, with this corner radius
  pondMargin: 14,
  pondRadius: 26,

  // --- bottom and water body
  sand: '#7d6b4f',
  pebble: '#4d4a44',
  shallowWater: '#1f4f58',
  deepWater: '#071c28',
  /** Distance from the shore (px) over which the pond goes from shallow to fully deep. */
  depth: 110,
  caustic: '#cdeef0',
  causticStrength: 0.32,
  /** How far the waves shift the bottom (px per unit of slope). */
  refraction: 14,

  // --- waves
  /** Overall steepness of the waves: scales refraction, caustic bending and glints together. */
  waveScale: 3.2,

  // --- surface (drawn above the koi)
  glintStrength: 0.75,
  /** Higher = smaller, sharper moon glints. */
  glintSharpness: 220,
  moonReflection: 0.28,
  /** Faint sky reflection on the surface, stronger on steep wave slopes. */
  skyReflection: 0.06,
  foam: 0.45,

  // --- koi under the surface
  /** How far the waves shift the koi (px per unit of slope). */
  koiRefraction: 3,
  shadowOffset: [5, 9],
  shadowAlpha: 0.38,
  shadowBlur: 5,

  // --- ripple rings
  rippleSpeed: 120,
  rippleLife: 1.8,
  /** Ring strength for a swap, and for a match of 3 (each extra koi in the match adds matchRippleExtra). */
  swapRipple: 0.6,
  matchRipple: 1.1,
  matchRippleExtra: 0.2,
  /** Most rings alive at once; must match MAX_RIPPLES in the shaders. */
  maxRipples: 8,
} as const;
