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

  // --- the moon's reflection on the open water below the board: centre (stage px) and radius (px)
  moonAt: [262, 584],
  moonRadius: 16,
  moon: '#f7ecc8',

  /**
   * Stones, lily pads and reeds at the corners and on the open water, never over the board. Stones and pads also
   * shape the water: ripples stop at them and the foam outlines them. At most 8 stones and pads (MAX_PROPS).
   */
  props: [
    { kind: 'stone', at: [-2, 106], radius: [34, 22], turn: -0.25, seed: 11 },
    { kind: 'stone', at: [42, 98], radius: [14, 9], turn: 0.5, seed: 12 },
    { kind: 'reeds', at: [372, 90], radius: [50, 50], turn: 0, seed: 21 },
    { kind: 'stone', at: [348, 114], radius: [13, 8], turn: 0.3, seed: 13 },
    { kind: 'lotus-pad', at: [46, 586], radius: [23, 23], turn: 0, seed: 31 },
    { kind: 'pad', at: [92, 606], radius: [15, 15], turn: 0, seed: 32 },
    { kind: 'pad', at: [176, 600], radius: [10, 10], turn: 0, seed: 34 },
    { kind: 'stone', at: [352, 616], radius: [34, 22], turn: 0.18, seed: 14 },
    { kind: 'reeds', at: [-14, 646], radius: [54, 54], turn: 0, seed: 22 },
  ] satisfies readonly PondProp[] as readonly PondProp[],
} as const;
