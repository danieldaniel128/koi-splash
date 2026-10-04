import type { PropKind } from '../art/pondProps';

/** A thing at the pond's edge or on the water: centre (stage px), half size (px), rotation (radians), paint seed. */
export interface PondProp {
  readonly kind: PropKind;
  readonly at: readonly [number, number];
  readonly radius: readonly [number, number];
  readonly turn: number;
  readonly seed: number;
}

/**
 * The pond scene around the board, in stage px: the shape of the water, the bank around it and the moon's
 * reflection. The look is an ink print by moonlight: deep indigo water, pale ink lines, a touch of gold.
 */
export const POND = {
  /**
   * How far the water reaches past the board on each side. The sides run off the edge of a phone screen, so the
   * board reads as a patch of a bigger pond, not a tray; the strip below the board is open water for the moon.
   */
  margin: { left: 26, right: 26, top: 24, bottom: 70 },
  cornerRadius: 46,
  /** The shore wanders in and out by up to this many px, in bends about this long (px). */
  shoreWobble: 10,
  shoreBend: 110,

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

  // --- the moon's reflection on the open water below the board: centre (stage px) and radius (px)
  moonAt: [262, 582],
  moonRadius: 19,
  moon: '#f7ecc8',

  /**
   * Stones, lily pads and reeds at the corners and on the open water, never over the board. Stones and pads also
   * shape the water: ripples stop at them and the foam outlines them. At most 8 stones and pads (MAX_PROPS). Reeds
   * fan out toward their `turn` (0 = up).
   */
  props: [
    { kind: 'stone', at: [-4, 108], radius: [40, 26], turn: -0.25, seed: 11 },
    { kind: 'stone', at: [48, 98], radius: [16, 10], turn: 0.5, seed: 12 },
    { kind: 'reeds', at: [370, 96], radius: [52, 52], turn: -1.75, seed: 21 },
    { kind: 'stone', at: [344, 112], radius: [18, 11], turn: 0.3, seed: 13 },
    { kind: 'lotus-pad', at: [48, 590], radius: [27, 27], turn: 0, seed: 31 },
    { kind: 'pad', at: [100, 612], radius: [17, 17], turn: 0, seed: 32 },
    { kind: 'pad', at: [186, 604], radius: [11, 11], turn: 0, seed: 34 },
    { kind: 'stone', at: [352, 620], radius: [42, 27], turn: 0.18, seed: 14 },
    { kind: 'reeds', at: [12, 672], radius: [66, 66], turn: 0.3, seed: 22 },
    { kind: 'reeds', at: [302, 680], radius: [54, 54], turn: -0.3, seed: 23 },
  ] satisfies readonly PondProp[] as readonly PondProp[],

  /** Fireflies over the bank: where each one hovers (stage px; below 640 is only seen on tall phones). */
  fireflies: [
    [34, 12],
    [296, 8],
    [150, 652],
    [338, 640],
    [84, 700],
  ],
  /** How far a firefly wanders from its spot (px), and its glow's size (px) and colour. */
  fireflyRoam: 22,
  fireflySize: 26,
  firefly: '#f3f7b0',
} as const;
