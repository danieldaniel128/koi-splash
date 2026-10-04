import type { PropKind } from '../art/pondProps';
import type { Anchor } from '../layout/anchor';

/** A thing at the pond's edge or on the water: centre (stage px), half size (px), rotation (radians), paint seed. */
export interface PondProp {
  readonly kind: PropKind;
  readonly at: readonly [number, number];
  readonly radius: readonly [number, number];
  readonly turn: number;
  readonly seed: number;
}

/** A prop as the config places it: pinned to a corner of the pond, so it stays at the shore on any screen. */
export type PondPropSpot = Omit<PondProp, 'at'> & Anchor;

/**
 * The pond scene around the board, in stage px: the shape of the water, the bank around it and the moon's
 * reflection. The look is an ink print by moonlight: deep indigo water, pale ink lines, a touch of gold.
 */
export const POND = {
  /** How far the water reaches past the board on each side, to the shore (the stones sit on it). */
  margin: { left: 16, right: 16, top: 20, bottom: 22 },
  cornerRadius: 24,
  /** The shore wanders in and out by up to this many px, in bends about this long (px): a little, under the stones. */
  shoreWobble: 3,
  shoreBend: 110,
  /**
   * The ring of stones along the shore (see shoreStones), px: each stone's half length along the shore and half
   * depth across it, the gap between neighbours, how far out onto the bank it sits (the rest covers the water's
   * edge), how much bigger the corner boulders are, and the seed that shapes them.
   */
  shore: {
    length: [11, 17],
    depth: [10, 13],
    gap: 1.5,
    outward: 4,
    cornerScale: 1.3,
    seed: 5,
  },

  // --- bank: indigo with a faint seigaiha (overlapping waves) pattern, darker and wet right at the water
  bank: '#0b1830',
  bankPattern: '#1a335c',
  /** Width of one seigaiha circle in px. */
  patternSize: 34,
  /** Width (px) of the dark wet band on the bank along the water. */
  wetBand: 16,
  /**
   * The bank darkens toward the screen edges: an oval of half the stage stretched by `stretch` (x, y), darkening by
   * up to `strength` from `from` to `to` (distance from the centre, in those half sizes).
   */
  vignette: { stretch: [1.2, 1.1], strength: 0.4, from: 0.7, to: 1.5 },

  // --- the moon's reflection on the water, under the koi: centre (from the pond's corner) and radius (px)
  moonSpot: { corner: 'bottom-right', offset: [-100, -40] } satisfies Anchor as Anchor,
  moonRadius: 19,
  moon: '#f7ecc8',

  /**
   * Stones standing in the water, never over the board (none in this pond: the shore stones frame it). They shape
   * the water: ripples stop at them and the foam outlines them. Together with the lily pads on the board they share
   * MAX_PROPS (16) slots in the water shaders. Each is pinned to a corner of the pond (offset in px).
   */
  props: [] satisfies readonly PondPropSpot[] as readonly PondPropSpot[],

  /** Fireflies over the bank, where each one hovers: at the top of the screen, and on the bank below the pond. */
  fireflies: {
    top: [
      { corner: 'top-left', offset: [34, 12] },
      { corner: 'top-right', offset: [-64, 8] },
    ] satisfies readonly Anchor[] as readonly Anchor[],
    belowPond: [
      { corner: 'bottom-left', offset: [157, 40] },
      { corner: 'bottom-right', offset: [-29, 28] },
      { corner: 'bottom-left', offset: [91, 88] },
    ] satisfies readonly Anchor[] as readonly Anchor[],
  },
  /** How far a firefly wanders from its spot (px), and its glow's size (px) and colour. */
  fireflyRoam: 22,
  fireflySize: 26,
  firefly: '#f3f7b0',
} as const;

/** The lily pads on the board (between the koi) and how they react: sizes in stage px, times in seconds. */
export const BOARD_PADS = {
  /** Pad radius as a share of a cell: with the koi's size, leaves a fifth of a cell of water around every pad. */
  radius: 0.38,
  /** Baked opening stages of a bud, from closed to full bloom. */
  stages: 4,
  /** Gentle rocking on the water (radians, radians per second). */
  rock: 0.06,
  rockSpeed: 0.9,
  /** A hit: the pad pops to this size and settles back. */
  hitPop: 1.3,
  hitTime: 0.35,
  /** A bloom: the lotus rises to this size, holds, then flies to the goal in the HUD. */
  bloomLift: 1.7,
  bloomRise: 0.45,
  bloomHold: 0.25,
  flyTime: 0.65,
  /** An empty pad drifts this far away (px) while it fades. */
  driftDistance: 36,
  driftTime: 0.9,
  /**
   * The pond's shore foam outlines each pad like its own: the shape it follows (share of the pad's radius), and how
   * fast it lets go as a blooming lotus lifts out (per unit of extra scale).
   */
  foamFit: 0.8, // pulled in, so the foam hugs the pad's rim and never reaches a neighbouring koi's head or tail
  foamLetGo: 2.5,
  /** A koi bumps into the pad: it rocks this far (radians) and settles in this long. */
  nudgeTurn: 0.22,
  nudgeTime: 0.6,
  /** How hard each event pushes the water (see WaterSurface.push), and the ring's radius (px). */
  hitPush: 0.6,
  bloomPush: 1.4,
  pushRadius: 16,
} as const;
