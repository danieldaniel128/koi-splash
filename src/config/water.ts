/** The pond: the water simulation, how the koi disturb it, and how it's drawn. */
export const WATER = {
  // --- simulation (a height field on the GPU)
  /** Size of one simulation cell in stage px: smaller = finer waves, more GPU work. */
  cellSize: 3,
  stepsPerSecond: 60,
  /** After a long frame, catch up at most this many steps (so a hitch can't snowball). */
  maxStepsPerFrame: 3,
  /** Share of the wave motion kept each step: lower = water calms down sooner. */
  damping: 0.988,
  /** Most surface pushes per step; must match MAX_DROPS in sim.frag. */
  maxDrops: 32,
  /** How steep the drawn waves look: scales the refraction, the focused light and the koi bending together. */
  waveScale: 5,

  // --- koi disturbing the water
  /** A koi moving faster than this (px/s) leaves a wake. */
  wakeMinSpeed: 25,
  /** Wake push at full speed, and its radius (px). Pushes are in water-height units (-1..1). */
  wakePush: 0.12,
  wakeRadius: 11,
  /** Speed (px/s) at which the wake is at full strength. */
  wakeFullSpeed: 700,
  /** Each resting koi flicks its tail every few seconds (random between these), making a small ripple. */
  flickEvery: [3.5, 8],
  flickPush: 0.22,
  flickRadius: 7,
  /** The tail-flick wiggle: rotation (radians) and how fast it settles. */
  flickTurn: 0.12,
  flickSettle: 5,
  /** A match splashes the water: radius (px) and push per unit of ripple strength. */
  splashRadius: 24,
  splashPush: 0.55,
  /** Ripple strength for a swap, and for a match of 3 (each extra koi in the match adds matchRippleExtra). */
  swapRipple: 0.5,
  matchRipple: 1,
  matchRippleExtra: 0.2,

  // --- bank around the pond: indigo with a faint seigaiha (overlapping waves) pattern
  bank: '#0f1d3a',
  bankPattern: '#1f3a66',
  /** Width of one seigaiha circle in px. */
  patternSize: 34,
  moon: '#fff4d2',
  /** Moon position as a share of the board (0..1 across, 0..1 down): its glow and where its light comes from. */
  moonAt: [0.78, 0.12],

  // --- pond shape: reaches this far past the board on every side, with this corner radius
  pondMargin: 14,
  pondRadius: 26,

  // --- the pond under the koi (toon colours: saturated blue, lighter by the shore)
  shore: '#5aa8ec',
  shallow: '#3a7fd8',
  deep: '#1f4fa6',
  /** Distance from the shore (px) over which the pond goes from shallow to deep, and the light shore band's width. */
  depth: 110,
  shoreBand: 9,
  caustic: '#8fd0ff',
  causticStrength: 22,
  /** How far the waves shift the water body (px per unit of slope). */
  refraction: 14,

  // --- the surface over the koi
  /** Water height (-1..1) above which a wave crest is drawn as a white foam line. */
  crest: 0.035,
  foamLines: 0.9,
  glints: 0.85,
  shoreFoam: 0.9,
  sparkles: 0.8,
  /** Glints and sparkles over the board itself are scaled by this, so they never hide a koi. */
  boardGlare: 0.4,

  // --- koi under the surface
  /** How far the waves shift the koi (px per unit of slope). */
  koiRefraction: 3,
  /** The white foam outline around each koi: strength, and how far out it sits (px). */
  koiOutline: 0.55,
  koiOutlineWidth: 2,
  shadowOffset: [5, 9],
  shadowAlpha: 0.3,
  shadowBlur: 4,
} as const;
