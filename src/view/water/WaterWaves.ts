import { UniformGroup } from 'pixi.js';
import { WATER } from '../../config/water';
import waves from './shaders/waves.glsl?raw';

/**
 * The state every water shader shares: the clock and the ripple rings. One uniform group is handed to all of them,
 * so the bottom, the surface and the koi refraction always agree on where the waves are.
 */
export class WaterWaves {
  readonly uniforms = new UniformGroup({
    uTime: { value: 0, type: 'f32' },
    uRipples: { value: new Float32Array(WATER.maxRipples * 4), type: 'vec4<f32>', size: WATER.maxRipples },
    uRippleSpeed: { value: WATER.rippleSpeed, type: 'f32' },
    uRippleLife: { value: WATER.rippleLife, type: 'f32' },
    uWaveScale: { value: WATER.waveScale, type: 'f32' },
  });

  private readonly ripples: Float32Array;
  private nextRipple = 0;
  private time = 0;

  constructor() {
    this.ripples = this.uniforms.uniforms.uRipples;
  }

  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    this.uniforms.uniforms.uTime = this.time;
  }

  /** Starts a ring at a stage point. A ring buffer of slots: past the limit, the oldest ring is replaced. */
  ripple(x: number, y: number, strength: number): void {
    this.ripples.set([x, y, this.time, strength], this.nextRipple * 4);
    this.nextRipple = (this.nextRipple + 1) % WATER.maxRipples;
  }
}

/**
 * A fragment shader with the shared wave code in front of it. High precision: the noise hashes and stage-pixel
 * positions break down at the medium precision phones default to in fragment shaders.
 */
export function withWaves(fragment: string): string {
  return `precision highp float;\nconst int MAX_RIPPLES = ${WATER.maxRipples};\n${waves}\n${fragment}`;
}
