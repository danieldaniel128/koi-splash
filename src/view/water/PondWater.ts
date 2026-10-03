import { Color, defaultFilterVert, Filter, Geometry, GlProgram, Mesh, Shader } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { WATER } from '../../config/water';
import koiRefraction from './shaders/koiRefraction.frag?raw';
import surface from './shaders/surface.frag?raw';
import vertex from './shaders/water.vert?raw';
import pondBottom from './shaders/water.frag?raw';
import { WaterWaves, withWaves } from './WaterWaves';

/** Where the board sits on the stage, so the pond can frame it. */
export interface PondLayout {
  readonly width: number;
  readonly height: number;
  readonly boardX: number;
  readonly boardY: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
}

type UniformDefs = Record<string, { value: unknown; type: string; size?: number }>;

/**
 * The pond, in three GPU passes that share one set of waves:
 * - `bottom`: drawn below the koi (refracted sandy bottom, caustics, depth, the bank around the pond)
 * - `surface`: drawn above the koi (moon glints and reflection, sky sheen, shore foam), mostly transparent
 * - `koiFilter`: goes on the koi layer, bending it through the same waves
 */
export class PondWater {
  readonly bottom: Mesh<Geometry, Shader>;
  readonly surface: Mesh<Geometry, Shader>;
  readonly koiFilter: Filter;
  private readonly waves = new WaterWaves();
  private readonly koiUniforms: { uAreaOrigin: number[]; uStageTransform: number[] };

  constructor(layout: PondLayout) {
    const shape = pondShape(layout);
    this.bottom = quad(layout, withWaves(pondBottom), { ...shape, ...bottomLook(layout) }, this.waves);
    this.surface = quad(layout, withWaves(surface), { ...shape, ...surfaceLook() }, this.waves);
    this.koiFilter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: withWaves(koiRefraction) }),
      resources: {
        waves: this.waves.uniforms,
        koiUniforms: {
          uAreaOrigin: { value: [0, 0], type: 'vec2<f32>' },
          uStageTransform: { value: [0, 0, 1], type: 'vec3<f32>' },
          uKoiRefraction: { value: WATER.koiRefraction, type: 'f32' },
          uWaterTint: { value: color(WATER.mid), type: 'vec3<f32>' },
        },
      },
    });
    this.koiUniforms = (
      this.koiFilter.resources as { koiUniforms: { uniforms: PondWater['koiUniforms'] } }
    ).koiUniforms.uniforms;
  }

  /** Advances the waves. Call once per frame. */
  tick(deltaSeconds: number): void {
    this.waves.tick(deltaSeconds);
  }

  /** Starts a ripple ring at a point in global (screen) space. */
  ripple(globalPoint: PointData, strength: number): void {
    const local = this.bottom.toLocal(globalPoint);
    this.waves.ripple(local.x, local.y, strength);
  }

  /**
   * Tells the koi filter how its area and the stage map onto the screen, so it reads the waves at the right stage
   * position. Call whenever the stage is resized or moved.
   */
  mapKoiFilter(areaOrigin: PointData, stageOffset: PointData, stageScale: number): void {
    this.koiUniforms.uAreaOrigin = [areaOrigin.x, areaOrigin.y];
    this.koiUniforms.uStageTransform = [stageOffset.x, stageOffset.y, stageScale];
  }
}

/** A stage-sized quad drawn by one of the water fragment shaders. */
function quad(
  layout: PondLayout,
  fragment: string,
  look: UniformDefs,
  waves: WaterWaves,
): Mesh<Geometry, Shader> {
  const { width, height } = layout;
  const geometry = new Geometry({
    attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });
  const shader = Shader.from({ gl: { vertex, fragment }, resources: { waves: waves.uniforms, look } });
  return new Mesh({ geometry, shader });
}

function pondShape(layout: PondLayout): UniformDefs {
  const margin = WATER.pondMargin;
  return {
    uPond: {
      value: [
        layout.boardX - margin,
        layout.boardY - margin,
        layout.boardWidth + margin * 2,
        layout.boardHeight + margin * 2,
      ],
      type: 'vec4<f32>',
    },
    uPondRadius: { value: WATER.pondRadius, type: 'f32' },
    uBoard: {
      value: [layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight],
      type: 'vec4<f32>',
    },
    uMoonPos: {
      value: [
        layout.boardX + layout.boardWidth * WATER.moonAt[0],
        layout.boardY + layout.boardHeight * WATER.moonAt[1],
      ],
      type: 'vec2<f32>',
    },
    uMoon: { value: color(WATER.moon), type: 'vec3<f32>' },
  };
}

function bottomLook(layout: PondLayout): UniformDefs {
  return {
    uSize: { value: [layout.width, layout.height], type: 'vec2<f32>' },
    uBank: { value: color(WATER.bank), type: 'vec3<f32>' },
    uBankPattern: { value: color(WATER.bankPattern), type: 'vec3<f32>' },
    uPatternSize: { value: WATER.patternSize, type: 'f32' },
    uShore: { value: color(WATER.shore), type: 'vec3<f32>' },
    uMid: { value: color(WATER.mid), type: 'vec3<f32>' },
    uDeep: { value: color(WATER.deep), type: 'vec3<f32>' },
    uBands: { value: [...WATER.bands], type: 'vec2<f32>' },
    uStone: { value: color(WATER.stone), type: 'vec3<f32>' },
    uLight: { value: color(WATER.light), type: 'vec3<f32>' },
    uLightStrength: { value: WATER.lightStrength, type: 'f32' },
    uLightSpacing: { value: WATER.lightSpacing, type: 'f32' },
    uRefraction: { value: WATER.refraction, type: 'f32' },
    uRingWidth: { value: WATER.ringWidth, type: 'f32' },
  };
}

function surfaceLook(): UniformDefs {
  return {
    uBoardGlare: { value: WATER.boardGlare, type: 'f32' },
    uSparkleSpacing: { value: WATER.sparkleSpacing, type: 'f32' },
    uSparkleChance: { value: WATER.sparkleChance, type: 'f32' },
    uSparkleSize: { value: WATER.sparkleSize, type: 'f32' },
  };
}

/** '#rrggbb' to the 0..1 RGB a shader expects. */
function color(hex: string): number[] {
  return new Color(hex).toArray().slice(0, 3);
}
