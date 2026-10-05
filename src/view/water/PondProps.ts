import { Container, Sprite, Texture } from 'pixi.js';
import { bakeProp } from '../../art/pondProps';
import type { PondProp } from '../../config/pond';
import type { PropLook } from '../../art/pondProps';

/**
 * Most stones and pads the water shaders take: the pond's own props first, then the lily pads on the board (see
 * PondWater.float). Must match MAX_PROPS in common.glsl.
 */
export const MAX_PROPS = 16;

/** The stones around the pond, painted once at startup (see art/pondProps) and drawn over the water. */
export class PondProps extends Container {
  /** O(props) canvas paints and uploads, once. */
  constructor(props: readonly PondProp[], resolution: number, look: PropLook) {
    super();
    for (const prop of props) {
      const texture = Texture.from(bakeProp(prop, resolution, look));
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(1 / resolution);
      sprite.position.set(...prop.at);
      sprite.rotation = prop.turn;
      this.addChild(sprite);
    }
  }
}

/**
 * The stones and pads that sit in the water, as rotated ellipses for the shaders (uProps: centre and half size;
 * uPropAxes: cosine and sine of the rotation, worked out once here instead of per pixel; uPropAfloat: a stone is all
 * in the water). Unused slots have a zero size.
 */
export function waterShapes(props: readonly PondProp[]): {
  shapes: Float32Array;
  axes: Float32Array;
  afloat: Float32Array;
  count: number;
} {
  const shapes = new Float32Array(MAX_PROPS * 4);
  const axes = new Float32Array(MAX_PROPS * 2);
  const afloat = new Float32Array(MAX_PROPS);
  const solid = props.slice(0, MAX_PROPS);
  solid.forEach((prop, i) => {
    shapes.set([...prop.at, ...prop.radius], i * 4);
    axes.set([Math.cos(prop.turn), Math.sin(prop.turn)], i * 2);
    afloat[i] = 1;
  });
  return { shapes, axes, afloat, count: solid.length };
}
