import { Matrix, RenderTexture } from 'pixi.js';
import type { Container, Renderer, TextureSource } from 'pixi.js';
import type { SimArea } from './WaterSim';

/**
 * Where the koi touch the water, as a texture the pond's shaders read: each frame, every koi's contact shape (see
 * bakeKoiContact) is drawn where that koi is, so the foam at the waterline sits exactly around the koi as they swim,
 * turn, swap and dive. One small render of K sprites per frame (a single batch).
 */
export class KoiContact {
  private readonly target: RenderTexture;
  private readonly toTarget: Matrix;

  constructor(
    private readonly renderer: Renderer,
    /** The stage rectangle the mask covers. */
    readonly area: SimArea,
    /** Where the contact shapes' space (the board's) starts on the stage. */
    layerOrigin: { x: number; y: number },
    resolution: number,
  ) {
    this.target = RenderTexture.create({ width: area.width, height: area.height, resolution });
    this.toTarget = new Matrix().translate(layerOrigin.x - area.x, layerOrigin.y - area.y);
  }

  /** The latest mask, for the shaders. */
  get texture(): TextureSource {
    return this.target.source;
  }

  /** Draws the koi's contact shapes (a container in the board's space, not on the stage) into the mask. */
  draw(shapes: Container): void {
    this.renderer.render({
      container: shapes,
      target: this.target,
      clear: true,
      clearColor: [0, 0, 0, 0],
      transform: this.toTarget,
    });
  }
}
