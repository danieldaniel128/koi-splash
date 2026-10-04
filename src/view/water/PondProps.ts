import { Container, Sprite, Texture } from 'pixi.js';
import { bakeProp } from '../../art/pondProps';
import { POND } from '../../config/pond';
import type { PondProp } from '../../config/pond';

/** Most stones and pads the water shaders take; must match MAX_PROPS in common.glsl. */
export const MAX_PROPS = 8;

/**
 * The stones, lily pads and reeds around the pond, painted once at startup (see art/pondProps) and drawn over the
 * water. The pads rock gently, as if the water moves them.
 */
export class PondProps extends Container {
  private readonly pads: { sprite: Sprite; turn: number; phase: number }[] = [];
  private time = 0;

  /** O(props) canvas paints and uploads, once. */
  constructor(props: readonly PondProp[], resolution: number) {
    super();
    for (const prop of props) {
      const texture = Texture.from(bakeProp(prop, resolution));
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(1 / resolution);
      sprite.position.set(...prop.at);
      sprite.rotation = prop.turn;
      this.addChild(sprite);
      if (prop.kind !== 'stone' && prop.kind !== 'reeds') {
        this.pads.push({ sprite, turn: prop.turn, phase: prop.seed });
      }
    }
  }

  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    for (const pad of this.pads) {
      pad.sprite.rotation = pad.turn + Math.sin(this.time * POND.padRockSpeed + pad.phase) * POND.padRock;
    }
  }
}

/**
 * The stones and pads that sit in the water, as rotated ellipses for the shaders (uProps: centre and half size;
 * uPropAxes: cosine and sine of the rotation, worked out once here instead of per pixel). Unused slots have a zero
 * size. Reeds don't block the water.
 */
export function waterShapes(props: readonly PondProp[]): { shapes: Float32Array; axes: Float32Array } {
  const shapes = new Float32Array(MAX_PROPS * 4);
  const axes = new Float32Array(MAX_PROPS * 2);
  props
    .filter((prop) => prop.kind !== 'reeds')
    .slice(0, MAX_PROPS)
    .forEach((prop, i) => {
      shapes.set([...prop.at, ...prop.radius], i * 4);
      axes.set([Math.cos(prop.turn), Math.sin(prop.turn)], i * 2);
    });
  return { shapes, axes };
}
