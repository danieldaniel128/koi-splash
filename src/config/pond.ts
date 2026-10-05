export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** A spot pinned to a corner of a rectangle (the pond, the stage), so it moves with that corner on any screen. */
export interface Anchor {
  readonly corner: Corner;
  /** px from the corner: +x is right, +y is down. */
  readonly offset: readonly [number, number];
}

/** What a prop on the water is: a stone, or a lily pad. */
export type PropKind = 'stone' | 'pad';

/** The looks the pond's border can have (each one a painter in SHORE_STYLES, src/art/shoreStyles.ts). */
export type ShoreStyle = 'stones';

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
  margin: { left: 14, right: 14, top: 16, bottom: 16 },
  cornerRadius: 24,
  /** The shore wanders in and out by up to this many px, in bends about this long (px): a little, under the stones. */
  shoreWobble: 3,
  shoreBend: 110,
  /**
   * The border along the shore: its style (a painter in SHORE_STYLES) and how its pieces are laid (see
   * ringAlongShore), px: each piece's half length along the shore and half depth across it, the gap between
   * neighbours, how far out onto the bank it sits (the rest covers the water's edge), how much bigger the corner
   * pieces are, and the seed that shapes them. LAYOUT.shoreWidth keeps room for it on screen.
   */
  shore: {
    style: 'stones' satisfies ShoreStyle,
    length: [11, 17],
    depth: [9, 12],
    gap: 1.5,
    outward: 5,
    cornerScale: 1.3,
    seed: 5,
  },

  /** Width (px) of the dark wet band on the bank along the water (the bank's colours are in the theme). */
  wetBand: 16,

  /**
   * Where the moon's reflection sits on the water, under the koi (from the pond's corner): there is little open
   * water round the board, so it shows there, softened (WATER.moonUnderBoard).
   */
  moonSpot: { corner: 'bottom-right', offset: [-100, -40] } satisfies Anchor,

  /**
   * Stones standing in the water, never over the board (none in this pond: the shore stones frame it). They shape
   * the water: ripples stop at them and the foam outlines them. Together with the lily pads on the board they share
   * MAX_PROPS (16) slots in the water shaders. Each is pinned to a corner of the pond (offset in px). Kept as a level
   * knob although this pond has none: the water already handles them, so a pond with rocks is config only.
   */
  props: [] satisfies readonly PondPropSpot[],

  /**
   * Fireflies over the bank, where each one hovers: at the top of the screen, and low round the pond, in the bays its
   * shape leaves at its bottom corners (the booster bar under the pond would hide them).
   */
  fireflies: {
    top: [
      { corner: 'top-left', offset: [34, 12] },
      { corner: 'top-right', offset: [-64, 8] },
    ] satisfies readonly Anchor[],
    belowPond: [
      { corner: 'bottom-left', offset: [14, -20] },
      { corner: 'bottom-right', offset: [-32, -38] },
      { corner: 'bottom-left', offset: [68, -12] },
    ] satisfies readonly Anchor[],
  },
  /** How far a firefly wanders from its spot (px), and its glow's size (px). Its colour is in the theme. */
  fireflyRoam: 22,
  fireflySize: 26,
} as const;

/** The lily pads on the board (between the koi) and how they react: sizes in stage px, times in seconds. */
export const BOARD_PADS = {
  /** Pad radius as a share of a cell: with the koi's size, leaves a fifth of a cell of water around every pad. */
  radius: 0.38,
  /** Baked opening stages of a bud, from closed to full bloom. */
  stages: 4,
  /**
   * The seed that shapes the lotus's petals (the buds on the board and the goal's icon are the same flower), and the
   * empty pad's. The pads are painted in `looks` looks, each with its leaf and lotus turned its own way (never the
   * sprite, so the shadow and the moonlit rim stay where the moon puts them), from these seeds on.
   */
  lotusSeed: 7,
  emptySeed: 11,
  looks: 3,
  /** Gentle rocking on the water (radians, radians per second). */
  rock: 0.06,
  rockSpeed: 0.9,
  /** A hit: the pad pops to this size and settles back. */
  hitPop: 1.3,
  hitTime: 0.25,
  /** A bloom: the lotus rises to this size, holds, then flies to the goal in the HUD. */
  bloomLift: 1.7,
  bloomRise: 0.3,
  bloomHold: 0.1,
  flyTime: 0.45,
  /** An empty pad drifts this far away (px) while it fades. */
  driftDistance: 36,
  driftTime: 0.6,
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
