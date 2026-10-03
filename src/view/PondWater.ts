import { Geometry, Mesh, Shader } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { WATER } from '../config/water';
import fragment from './shaders/water.frag?raw';
import vertex from './shaders/water.vert?raw';

interface WaterUniforms {
  uTime: number;
  uRipples: Float32Array;
}

/**
 * The pond: one quad drawn by a custom WebGL shader (see shaders/water.frag). The CPU side only advances the clock
 * and records ripples; everything visible is computed per pixel on the GPU.
 */
export class PondWater extends Mesh<Geometry, Shader> {
  private readonly waterUniforms: WaterUniforms;
  private readonly ripples = new Float32Array(WATER.maxRipples * 4);
  private nextRipple = 0;
  private time = 0;

  constructor(width: number, height: number) {
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { waterUniforms: createUniforms(width, height) },
    });
    super({ geometry, shader });
    this.waterUniforms = (
      shader.resources as { waterUniforms: { uniforms: WaterUniforms } }
    ).waterUniforms.uniforms;
    this.waterUniforms.uRipples = this.ripples;
  }

  /** Advances the water's clock. Call once per frame. */
  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    this.waterUniforms.uTime = this.time;
  }

  /**
   * Starts a ripple ring at a point given in global (screen) space. Uses a ring buffer of slots, so when more rings
   * than the shader supports are alive, the oldest one is replaced.
   */
  ripple(globalPoint: PointData, strength: number): void {
    const local = this.toLocal(globalPoint);
    this.ripples.set([local.x, local.y, this.time, strength], this.nextRipple * 4);
    this.nextRipple = (this.nextRipple + 1) % WATER.maxRipples;
  }
}

function createUniforms(
  width: number,
  height: number,
): Record<string, { value: unknown; type: string; size?: number }> {
  return {
    uTime: { value: 0, type: 'f32' },
    uSize: { value: [width, height], type: 'vec2<f32>' },
    uDeep: { value: [...WATER.deep], type: 'vec3<f32>' },
    uShallow: { value: [...WATER.shallow], type: 'vec3<f32>' },
    uLight: { value: [...WATER.light], type: 'vec3<f32>' },
    uCausticScale: { value: WATER.causticScale, type: 'f32' },
    uCausticSpeed: { value: WATER.causticSpeed, type: 'f32' },
    uCausticStrength: { value: WATER.causticStrength, type: 'f32' },
    uVignette: { value: WATER.vignette, type: 'f32' },
    uRipples: { value: new Float32Array(WATER.maxRipples * 4), type: 'vec4<f32>', size: WATER.maxRipples },
    uRippleSpeed: { value: WATER.rippleSpeed, type: 'f32' },
    uRippleWidth: { value: WATER.rippleWidth, type: 'f32' },
    uRippleLife: { value: WATER.rippleLife, type: 'f32' },
  };
}
