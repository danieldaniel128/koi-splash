/** The water: the simulation, how the koi disturb it, and how it's drawn. */
export const WATER = {
  // --- simulation (a height field on the GPU)
  /** Size of one simulation cell in stage px: smaller = finer waves, more GPU work. */
  cellSize: 3,
  stepsPerSecond: 60,
  /** After a long frame, catch up at most this many steps (so a hitch can't snowball). */
  maxStepsPerFrame: 3,
  /** Share of the wave motion kept each step: lower = water calms down sooner (0.978: a ring is gone in ~1 s). */
  damping: 0.978,
  /** Near the shore the waves are soaked up instead of bouncing back: motion kept per step there, band width (px). */
  shoreDamping: 0.86,
  shoreBand: 18,
  /** Most surface pushes per step; must match MAX_DROPS in sim.frag. */
  maxDrops: 32,
  /** How steep the drawn waves look: scales the refraction and the light on the waves together. */
  waveScale: 5,

  // --- koi disturbing the water (pushes are in water-height units, -1..1; radius in px)
  /** A moving koi pushes the water at its tail every this many px of travel, so the pushes line up into a wake. */
  wakeSpacing: 7,
  wakePush: 0.035,
  wakeRadius: 8,
  /** Speed (px/s) at which the wake is at full strength. */
  wakeFullSpeed: 400,
  /** A tail flick: push and radius. */
  flickPush: 0.12,
  flickRadius: 6,
  /** Where a koi dives (a match): push and radius; a new koi surfacing pushes less. */
  divePush: 0.16,
  diveRadius: 9,
  surfacePush: 0.07,

  // --- water body (under the koi): indigo-teal, lighter in the shallows by the shore, darkest in the middle
  shallow: '#195669',
  mid: '#10405c',
  deep: '#0b2643',
  /** Distance from the shore (px) where the shallows end, and where the deep water starts. */
  shallowWidth: 26,
  deepFrom: 120,
  /** Shade cast by the bank over the first px of water (0 = none, 1 = black). */
  lipShade: 0.45,
  lipWidth: 6,
  /** How far the waves shift the water body (px per unit of slope). */
  refraction: 10,
  /** Direction the moonlight comes from (toward the upper right), for the relief and the shadows. */
  lightDir: [0.6, -0.8],

  // --- light on the bottom: soft, wide bands (moonlight focused by the surface), glowing in the shallows
  glow: '#7fd6dc',
  /** Strength of the bands, their pattern size (px) and softness (wider and softer when higher). */
  glowStrength: 0.42,
  glowSize: 84,
  glowSoftness: 0.2,
  /** How far from the shore (px) the light reaches before it fades out, and how much is left under the board. */
  glowReach: 52,
  glowUnderBoard: 0,

  // --- the simulated waves, drawn as soft relief (no lines)
  /** Moonlight colour on the waves. */
  ink: '#e3f0f2',
  /** Light and shade on the slopes of the waves: brightness change per unit of slope. */
  relief: 1.6,
  /** Crests catch a little light and troughs darken: the height (water units) where it's at full, and how much. */
  crestHeight: 0.035,
  crestLight: 0.14,
  troughShade: 0.18,
  /** A clean bright rim along strong fronts only: the slope where it starts and where it's full, its strength
   * under the koi, and over them (faint, so the koi stay clear). */
  rimGate: [0.09, 0.2],
  rimStrength: 0.55,
  rimOverKoi: 0.2,

  // --- surface details (over the water, never over a koi)
  /** Shore foam: a calligraphic stroke inside the shore that swells, tapers and breaks; width (px) and strength. */
  foamWidth: 2.7,
  foamStrength: 0.9,
  /** How far waves arriving at the shore push the foam (px per unit of height). */
  foamBreath: 60,
  /** Gold-leaf glints on the open water: colour, strength, grid size (px; one glint per few cells at a time). */
  gold: '#f0cd78',
  goldStrength: 0.95,
  goldGrid: 34,

  // --- koi under the surface
  /** How far the waves shift the koi (px per unit of slope). */
  koiRefraction: 2.5,
  /** The koi take on a little of the water colour (0 = none), so they sit in it instead of on it. */
  koiTint: 0.07,
  /** Extra room (px) around the board where the koi filter draws, for koi that sway or lift past their cell. */
  koiReach: 14,
  /** Soft shadow on the bottom: offset away from the moon (px), strength, blur (px), colour. */
  shadowOffset: [-4, 7],
  shadowAlpha: 0.26,
  shadowBlur: 5,
  shadowColor: '#020a16',
} as const;
