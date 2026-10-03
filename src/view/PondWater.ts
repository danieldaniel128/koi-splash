import { Color, Geometry, Mesh, Shader } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { WATER } from '../config/water';
import fragment from './shaders/water.frag?raw';
import vertex from './shaders/water.vert?raw';

/** Where the board sits on the stage, so the pond can frame it and draw a socket under every cell. */
export interface PondLayout {
  readonly width: number;
  readonly height: number;
  readonly boardX: number;
  readonly boardY: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
}

interface WaterUniforms {
  uTime: number;
  uRipples: Float32Array;
}

type UniformDefs = Record<string, { value: unknown; type: string; size?: number }>;

/**
 * The pond: one quad drawn by a custom WebGL shader (see shaders/water.frag). The CPU side only advances the clock
 * and records ripples; everything visible is computed per pixel on the GPU.
 */
export class PondWater extends Mesh<Geometry, Shader> {
  private readonly waterUniforms: WaterUniforms;
  private readonly ripples = new Float32Array(WATER.maxRipples * 4);
  private nextRipple = 0;
  private time = 0;

  constructor(layout: PondLayout) {
    const { width, height } = layout;
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { waterUniforms: createUniforms(layout) },
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

function createUniforms(layout: PondLayout): UniformDefs {
  const boardWidth = layout.cols * layout.cellSize;
  const boardHeight = layout.rows * layout.cellSize;
  const margin = WATER.pondMargin;
  return {
    uTime: { value: 0, type: 'f32' },
    uSize: { value: [layout.width, layout.height], type: 'vec2<f32>' },
    uPond: {
      value: [
        layout.boardX - margin,
        layout.boardY - margin,
        boardWidth + margin * 2,
        boardHeight + margin * 2,
      ],
      type: 'vec4<f32>',
    },
    uPondRadius: { value: WATER.pondRadius, type: 'f32' },
    uGrid: { value: [layout.boardX, layout.boardY, layout.cellSize, layout.cols], type: 'vec4<f32>' },
    uRows: { value: layout.rows, type: 'f32' },
    uMoonPos: {
      value: [layout.boardX + boardWidth * WATER.moonAt[0], layout.boardY + boardHeight * WATER.moonAt[1]],
      type: 'vec2<f32>',
    },
    ...colors({
      uBankTop: WATER.bankTop,
      uBankBottom: WATER.bankBottom,
      uMoon: WATER.moon,
      uPondIn: WATER.pondIn,
      uPondOut: WATER.pondOut,
      uEdgeGlow: WATER.edgeGlow,
      uCaustic: WATER.caustic,
    }),
    uCausticSpacing: { value: WATER.causticSpacing, type: 'f32' },
    uCausticAlpha: { value: WATER.causticAlpha, type: 'f32' },
    uRipples: { value: new Float32Array(WATER.maxRipples * 4), type: 'vec4<f32>', size: WATER.maxRipples },
    uRippleSpeed: { value: WATER.rippleSpeed, type: 'f32' },
    uRippleWidth: { value: WATER.rippleWidth, type: 'f32' },
    uRippleLife: { value: WATER.rippleLife, type: 'f32' },
  };
}

/** Hex colours from the config as vec3 uniforms (0..1 RGB). */
function colors(hexByName: Record<string, string>): UniformDefs {
  const defs: UniformDefs = {};
  for (const [name, hex] of Object.entries(hexByName)) {
    defs[name] = { value: new Color(hex).toArray().slice(0, 3), type: 'vec3<f32>' };
  }
  return defs;
}
