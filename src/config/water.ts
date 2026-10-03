/** The pond water shader's look. Colours are 0..1 RGB. */
export const WATER = {
  deep: [0.02, 0.07, 0.11],
  shallow: [0.05, 0.2, 0.25],
  light: [0.55, 0.85, 0.9],
  /** Size of one caustic cell in stage units: bigger = broader light pattern. */
  causticScale: 46,
  causticSpeed: 0.6,
  causticStrength: 0.3,
  /** How much darker the corners get (0 = none). */
  vignette: 0.45,
  /** Ripple rings: px per second outward, ring thickness in px, seconds until gone. */
  rippleSpeed: 140,
  rippleWidth: 10,
  rippleLife: 1.4,
  /** Most rings alive at once; must match MAX_RIPPLES in water.frag. */
  maxRipples: 8,
} as const;
