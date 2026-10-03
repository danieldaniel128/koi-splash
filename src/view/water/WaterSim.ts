import { Container, Geometry, Mesh, RenderTexture, Shader, UniformGroup } from 'pixi.js';
import type { Renderer, TextureSource } from 'pixi.js';
import { WATER } from '../../config/water';
import common from './shaders/common.glsl?raw';
import simFragment from './shaders/sim.frag?raw';
import vertex from './shaders/water.vert?raw';
import waves from './shaders/waves.glsl?raw';

/** The stage rectangle the simulation covers (the pond). */
export interface SimArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Packed "flat water" (height 0, speed 0): each value is 127.5 / 255 split into a high and a low byte. */
const FLAT_WATER: [number, number, number, number] = [127 / 255, 0.5, 127 / 255, 0.5];

/**
 * A height-field water simulation on the GPU. Two textures take turns: each step reads one and writes the other.
 * Drops (pushes on the surface) are queued from anywhere and applied on the next step: fish moving, flicking,
 * diving or landing all come down to drops. The shaders that draw the water read `uniforms` and `texture`.
 */
export class WaterSim {
  /** For the drawing shaders: where the simulation sits on the stage, its size and the wave steepness. */
  readonly uniforms: UniformGroup;

  private readonly cols: number;
  private readonly rows: number;
  /** The latest state (read by the drawing shaders) and the one the next step writes into; they swap every step. */
  private front: RenderTexture;
  private back: RenderTexture;
  private readonly stepper: Mesh<Geometry, Shader>;
  private readonly stepInput: { uState: TextureSource };
  private readonly drops: Float32Array;
  private dropCount = 0;
  private pending = 0;
  private time = 0;

  constructor(
    private readonly renderer: Renderer,
    private readonly area: SimArea,
    /** The pond's outline (uPond, uPondShape in common.glsl): where the water ends. */
    private readonly pondShape: UniformGroup,
  ) {
    this.cols = Math.round(area.width / WATER.cellSize);
    this.rows = Math.round(area.height / WATER.cellSize);
    this.front = this.createTarget();
    this.back = this.createTarget();
    this.drops = new Float32Array(WATER.maxDrops * 4);
    const shader = this.createStepShader();
    this.stepper = new Mesh({ geometry: this.quad(), shader });
    this.stepInput = shader.resources as { uState: TextureSource };
    this.uniforms = new UniformGroup({
      uSimArea: { value: [area.x, area.y, area.width, area.height], type: 'vec4<f32>' },
      uSimSize: { value: [this.cols, this.rows], type: 'vec2<f32>' },
      uWaveScale: { value: WATER.waveScale, type: 'f32' },
      uTime: { value: 0, type: 'f32' },
      uPixelRatio: { value: 1, type: 'f32' },
    });
    for (const target of [this.front, this.back]) {
      renderer.render({ container: new Container(), target, clear: true, clearColor: FLAT_WATER }); // start calm
    }
  }

  /** The current state texture, for shaders that draw the water. */
  get texture(): TextureSource {
    return this.front.source;
  }

  /**
   * Pushes the surface at a stage point: negative `push` presses it down (a fish diving, a splash), positive lifts
   * it. Applied on the next step; past WATER.maxDrops in one step, extra drops are skipped. O(1).
   */
  drop(stageX: number, stageY: number, radius: number, push: number): void {
    if (this.dropCount >= WATER.maxDrops) return;
    const cellX = ((stageX - this.area.x) / this.area.width) * this.cols;
    const cellY = ((stageY - this.area.y) / this.area.height) * this.rows;
    this.drops.set([cellX, cellY, radius / WATER.cellSize, push], this.dropCount * 4);
    this.dropCount++;
  }

  /**
   * Advances the water at a fixed rate (WATER.stepsPerSecond), whatever the frame rate. Then read `texture`.
   * Each step is one GPU pass over the cols x rows cells (about 140 x 175), cheap even on phones.
   */
  update(deltaSeconds: number): void {
    this.time += deltaSeconds;
    this.uniforms.uniforms.uTime = this.time;
    this.pending = Math.min(this.pending + deltaSeconds * WATER.stepsPerSecond, WATER.maxStepsPerFrame);
    while (this.pending >= 1) {
      this.step();
      this.pending--;
    }
  }

  private step(): void {
    this.stepInput.uState = this.front.source;
    // clear first: Pixi blends what it draws over the target, which would mix the packed bytes with the old ones
    this.renderer.render({
      container: this.stepper,
      target: this.back,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
    [this.front, this.back] = [this.back, this.front];
    this.drops.fill(0);
    this.dropCount = 0;
  }

  private createTarget(): RenderTexture {
    // nearest sampling: each texel holds packed bytes, so blending neighbours would corrupt the values
    return RenderTexture.create({ width: this.cols, height: this.rows, scaleMode: 'nearest', resolution: 1 });
  }

  /** A quad covering every cell of the simulation. */
  private quad(): Geometry {
    const { cols, rows } = this;
    return new Geometry({
      attributes: { aPosition: [0, 0, cols, 0, cols, rows, 0, rows] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
  }

  private createStepShader(): Shader {
    const { cols, rows } = this;
    const { x, y, width, height } = this.area;
    return Shader.from({
      gl: { vertex, fragment: withCommon(simFragment) },
      resources: {
        uState: this.front.source,
        pond: this.pondShape,
        simUniforms: {
          uSimSize: { value: [cols, rows], type: 'vec2<f32>' },
          uSimArea: { value: [x, y, width, height], type: 'vec4<f32>' },
          uDamping: { value: WATER.damping, type: 'f32' },
          uShore: { value: [WATER.shoreDamping, WATER.shoreBand], type: 'vec2<f32>' },
          uDrops: { value: this.drops, type: 'vec4<f32>', size: WATER.maxDrops },
        },
      },
    });
  }
}

/**
 * A fragment shader with the shared helpers (noise, the pond's outline, lines) in front of it. Marked GLSL ES 3:
 * Pixi compiles anything else as WebGL 1 shaders, which lack fwidth (constant-width lines).
 */
export function withCommon(fragment: string): string {
  return `#version 300 es\nprecision highp float;\n${common}\n${fragment}`;
}

/** A fragment shader with the shared helpers and the wave-reading code in front of it (high precision for unpacking). */
export function withWaves(fragment: string): string {
  return withCommon(`${waves}\n${fragment}`);
}
