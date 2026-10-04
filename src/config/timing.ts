/** Motion timings in seconds. These are the main feel dials. */
export const TIMING = {
  /** Two koi slide past each other; the one the player drags rises toward the surface and passes over. */
  swap: 0.2,
  /** How much the dragged koi grows as it lifts (1 = not at all), and how much the other one sinks. */
  swapLift: 1.16,
  swapSink: 0.92,
  /** A swap that makes no match: slide part of the way, then back. */
  invalidSwap: 0.34,
  /** How far the koi travel toward each other before bouncing back, as a share of a cell. */
  invalidReach: 0.35,
  /** Matched koi dive: a quick squash as they kick, then they sink away into the deep, turning a little. */
  diveKick: 0.07,
  diveSink: 0.34,
  /** How small a diving koi gets before it's gone, and how far it turns (radians). */
  diveScale: 0.45,
  diveTurn: 0.9,
  /** The pale water-blue a diving koi cools toward as it sinks (it fades out as it goes, so it melts into the blue). */
  diveTint: '#a9cfe0',
  /** Falling starts at this share of the dive, so there is no dead pause between them. */
  fallStartAt: 0.55,
  /** Koi glide down into the gaps: base time plus time per row. */
  fallBase: 0.16,
  fallPerRow: 0.075,
  /** How far a gliding koi turns its head down (0 = keeps its heading, 1 = straight down). */
  fallTurn: 0.5,
  /** New koi rise from the deep into the empty cells, the lowest first. */
  rise: 0.42,
  riseStagger: 0.06,
  /** Where in the rise the new koi breaks the surface (a small ring). */
  riseSurfaceAt: 0.55,
} as const;
