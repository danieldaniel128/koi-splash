import { Container, Geometry, Mesh, RenderTexture, Shader, UniformGroup } from 'pixi.js';
import type { Renderer, TextureSource } from 'pixi.js';
import { WATER } from '../../config/water';
import common from './shaders/common.glsl?raw';
import simFragment from './shaders/sim.frag?raw';
import vertex from './shaders/water.vert?raw';
import waves from './shaders/waves.glsl?raw';
import { packWater } from './waterCodec';

/** The stage rectangle the simulation covers (the pond). */
export interface SimArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Flat water (height 0, speed 0), packed as the simulation stores it. */
const FLAT_WATER: [number, number, number, number] = [...packWater(0), ...packWater(0)];

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
    /** The pond's shape (uShoreField and the pond uniforms in common.glsl): where the water ends. */
    private readonly pondShape: PondShapeResources,
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
    this.reset();
  }

  /**
   * Calms the water: both state textures back to flat. Called at start, and after a lost WebGL context is restored
   * (the textures come back as zeros, which unpack to a deep trough all over the pond).
   */
  reset(): void {
    for (const target of [this.front, this.back]) {
      this.renderer.render({ container: new Container(), target, clear: true, clearColor: FLAT_WATER });
    }
  }

  /** The current state texture, for shaders that draw the water. */
  get texture(): TextureSource {
    return this.front.source;
  }

  /**
   * Pushes the surface at a stage point: negative `push` presses it down (a fish diving, a splash), positive lifts
   * it. Applied on the next step. Past WATER.maxDrops in one step, it takes the place of the weakest push if it's
   * stronger, so a splash is never crowded out by the koi's wakes. O(1), O(maxDrops) once the step is full.
   */
  drop(stageX: number, stageY: number, radius: number, push: number): void {
    const slot = this.dropCount < WATER.maxDrops ? this.dropCount++ : this.weakestDrop(push);
    if (slot < 0) return;
    const cellX = ((stageX - this.area.x) / this.area.width) * this.cols;
    const cellY = ((stageY - this.area.y) / this.area.height) * this.rows;
    this.drops.set([cellX, cellY, radius / WATER.cellSize, push], slot * 4);
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

  /** The slot of the weakest push this step, if `push` is stronger; else -1. */
  private weakestDrop(push: number): number {
    let weakest = -1;
    let strength = Math.abs(push);
    for (let i = 0; i < this.dropCount; i++) {
      const other = Math.abs(this.drops[i * 4 + 3] ?? 0);
      if (other < strength) {
        strength = other;
        weakest = i;
      }
    }
    return weakest;
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
        ...this.pondShape,
        simUniforms: {
          uSimSize: { value: [cols, rows], type: 'vec2<f32>' },
          uSimArea: { value: [x, y, width, height], type: 'vec4<f32>' },
          uDamping: { value: WATER.damping, type: 'f32' },
          uViscosity: { value: WATER.viscosity, type: 'f32' },
          uShore: { value: [WATER.shoreDamping, WATER.shoreBand], type: 'vec2<f32>' },
          uDrops: { value: this.drops, type: 'vec4<f32>', size: WATER.maxDrops },
        },
      },
    });
  }
}

/** The pond's shape as shader resources: its uniforms and its baked distance field. */
export interface PondShapeResources {
  readonly pond: UniformGroup;
  readonly uShoreField: TextureSource;
}

/**
 * A fragment shader with the shared helpers (noise, the pond's outline, lines) in front of it. Marked GLSL ES 3:
 * Pixi compiles anything else as WebGL 1 shaders, which lack fwidth (constant-width lines). Its textures are read at
 * high precision: left undeclared, Pixi makes them lowp, too coarse for the water state's low byte on the phone GPUs
 * that honour it (the pond would never settle).
 */
export function withCommon(fragment: string): string {
  return `#version 300 es\nprecision highp float;\nprecision highp sampler2D;\n${common}\n${fragment}`;
}

/** A fragment shader with the shared helpers and the wave-reading code in front of it (high precision for unpacking). */
export function withWaves(fragment: string): string {
  return withCommon(`${waves}\n${fragment}`);
}
