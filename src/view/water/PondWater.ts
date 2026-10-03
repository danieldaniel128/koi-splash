import { Color, defaultFilterVert, Filter, Geometry, GlProgram, Mesh, Shader } from 'pixi.js';
import type { PointData, Renderer, TextureSource } from 'pixi.js';
import { WATER } from '../../config/water';
import type { WaterSurface } from './FishWake';
import koiRefraction from './shaders/koiRefraction.frag?raw';
import surface from './shaders/surface.frag?raw';
import pondBottom from './shaders/water.frag?raw';
import vertex from './shaders/water.vert?raw';
import { WaterSim, withWaves } from './WaterSim';

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

/** Shader resources that point at the simulation's latest state; rebound after every update. */
interface StateBinding {
  uState: TextureSource;
}

/**
 * The pond: a GPU water simulation (WaterSim) that the koi and the matches disturb, drawn toon style in three
 * passes that read the same waves:
 * - `bottom`: below the koi (the water body seen through the waves, focused light, the bank around the pond)
 * - `surface`: above the koi (white foam lines on wave crests, glints, shore foam, sparkles)
 * - `koiFilter`: on the koi layer (the koi bend under the waves and get a white foam outline)
 */
export class PondWater implements WaterSurface {
  readonly bottom: Mesh<Geometry, Shader>;
  readonly surface: Mesh<Geometry, Shader>;
  readonly koiFilter: Filter;
  private readonly sim: WaterSim;
  private readonly bindings: StateBinding[] = [];
  private readonly koiUniforms: { uAreaOrigin: number[]; uStageTransform: number[] };

  constructor(renderer: Renderer, layout: PondLayout) {
    this.sim = new WaterSim(renderer, pondArea(layout));
    const shape = pondShape(layout);
    this.bottom = this.quad(layout, withWaves(pondBottom), { ...shape, ...bottomLook(layout) });
    this.surface = this.quad(layout, withWaves(surface), { ...shape, ...surfaceLook() });
    this.koiFilter = this.createKoiFilter();
    this.koiUniforms = (
      this.koiFilter.resources as { koiUniforms: { uniforms: PondWater['koiUniforms'] } }
    ).koiUniforms.uniforms;
  }

  /** Steps the water and points every pass at the new state. Call once per frame. */
  tick(deltaSeconds: number): void {
    this.sim.update(deltaSeconds);
    for (const binding of this.bindings) binding.uState = this.sim.texture;
  }

  /** Pushes the surface at a stage point (wakes, tail flicks; later dives and jumps). */
  drop(stageX: number, stageY: number, radius: number, push: number): void {
    this.sim.drop(stageX, stageY, radius, push);
  }

  /** A splash at a point in global (screen) space: swaps and matches. */
  ripple(globalPoint: PointData, strength: number): void {
    const local = this.bottom.toLocal(globalPoint);
    this.sim.drop(local.x, local.y, WATER.splashRadius, -WATER.splashPush * strength);
  }

  /**
   * Tells the koi filter how its area and the stage map onto the screen, so it reads the waves at the right stage
   * position. Call whenever the stage is resized or moved.
   */
  mapKoiFilter(areaOrigin: PointData, stageOffset: PointData, stageScale: number): void {
    this.koiUniforms.uAreaOrigin = [areaOrigin.x, areaOrigin.y];
    this.koiUniforms.uStageTransform = [stageOffset.x, stageOffset.y, stageScale];
  }

  /** A stage-sized quad drawn by one of the water fragment shaders. */
  private quad(layout: PondLayout, fragment: string, look: UniformDefs): Mesh<Geometry, Shader> {
    const { width, height } = layout;
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { sim: this.sim.uniforms, uState: this.sim.texture, look },
    });
    this.bindings.push(shader.resources as StateBinding);
    return new Mesh({ geometry, shader });
  }

  private createKoiFilter(): Filter {
    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: withWaves(koiRefraction) }),
      resources: {
        sim: this.sim.uniforms,
        uState: this.sim.texture,
        koiUniforms: {
          uAreaOrigin: { value: [0, 0], type: 'vec2<f32>' },
          uStageTransform: { value: [0, 0, 1], type: 'vec3<f32>' },
          uKoiRefraction: { value: WATER.koiRefraction, type: 'f32' },
          uWaterTint: { value: color(WATER.shallow), type: 'vec3<f32>' },
          uOutline: { value: WATER.koiOutline, type: 'f32' },
          uOutlineWidth: { value: WATER.koiOutlineWidth, type: 'f32' },
        },
      },
    });
    this.bindings.push(filter.resources as StateBinding);
    return filter;
  }
}

/** The pond rectangle on the stage: the board plus the margin on every side. */
function pondArea(layout: PondLayout): { x: number; y: number; width: number; height: number } {
  const margin = WATER.pondMargin;
  return {
    x: layout.boardX - margin,
    y: layout.boardY - margin,
    width: layout.boardWidth + margin * 2,
    height: layout.boardHeight + margin * 2,
  };
}

function pondShape(layout: PondLayout): UniformDefs {
  const pond = pondArea(layout);
  return {
    uPond: { value: [pond.x, pond.y, pond.width, pond.height], type: 'vec4<f32>' },
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
    uShallow: { value: color(WATER.shallow), type: 'vec3<f32>' },
    uDeep: { value: color(WATER.deep), type: 'vec3<f32>' },
    uDepth: { value: WATER.depth, type: 'f32' },
    uShoreBand: { value: WATER.shoreBand, type: 'f32' },
    uCaustic: { value: color(WATER.caustic), type: 'vec3<f32>' },
    uCausticStrength: { value: WATER.causticStrength, type: 'f32' },
    uRefraction: { value: WATER.refraction, type: 'f32' },
  };
}

function surfaceLook(): UniformDefs {
  return {
    uBoardGlare: { value: WATER.boardGlare, type: 'f32' },
    uCrest: { value: WATER.crest, type: 'f32' },
    uFoamLines: { value: WATER.foamLines, type: 'f32' },
    uGlints: { value: WATER.glints, type: 'f32' },
    uShoreFoam: { value: WATER.shoreFoam, type: 'f32' },
    uSparkles: { value: WATER.sparkles, type: 'f32' },
  };
}

/** '#rrggbb' to the 0..1 RGB a shader expects. */
function color(hex: string): number[] {
  return new Color(hex).toArray().slice(0, 3);
}
