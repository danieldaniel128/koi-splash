/** The pond water shader's look. */
export const WATER = {
  bankTop: '#0b2038',
  bankBottom: '#050d19',
  moon: '#fff4d2',
  /** Moon glow position as a share of the board (0..1 across, 0..1 down). */
  moonAt: [0.76, 0.2],
  pondIn: '#1d5876',
  pondOut: '#0f3450',
  edgeGlow: '#5ac8f0',
  caustic: '#bef0ff',
  /** The pond reaches this far past the board on every side, with this corner radius. */
  pondMargin: 14,
  pondRadius: 24,
  /** Grid spacing of the caustic net's oval loops, and how bright the loops are. */
  causticSpacing: 30,
  causticAlpha: 0.075,
  /** Ripple rings: px per second outward, ring thickness in px, seconds until gone. */
  rippleSpeed: 140,
  rippleWidth: 12,
  rippleLife: 1.4,
  /** Ring strength for a swap, and for a match of 3 (each extra koi in the match adds matchRippleExtra). */
  swapRipple: 0.7,
  matchRipple: 1.3,
  matchRippleExtra: 0.25,
  /** Most rings alive at once; must match MAX_RIPPLES in water.frag. */
  maxRipples: 8,
} as const;
