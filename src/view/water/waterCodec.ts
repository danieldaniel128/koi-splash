import { WATER } from '../../config/water';

/**
 * How the water simulation stores its state: each texel holds the surface height and its vertical speed, each in
 * -WATER.stateRange..WATER.stateRange packed into two 8-bit channels (a high byte and the remainder at full 8-bit
 * resolution), so the simulation runs on any phone GPU. The shaders pack and unpack the same way (packWater and
 * unpackWater in common.glsl); this mirror keeps the two in step, and gives the colour of flat water.
 */

/** A value as its two channels (0..1 each), as sim.frag writes it; past the range it is capped at its ends. */
export function packWater(value: number): [number, number] {
  const x = Math.min(Math.max((value / WATER.stateRange) * 0.5 + 0.5, 0), 1) * 255;
  const high = Math.min(Math.floor(x), 254);
  return [high / 255, x - high];
}

/** The value two channels hold, as the shaders read it back. */
export function unpackWater(high: number, low: number): number {
  return ((high + low / 255) * 2 - 1) * WATER.stateRange;
}
