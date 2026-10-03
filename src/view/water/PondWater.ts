import {
  Color,
  Container,
  defaultFilterVert,
  Filter,
  Geometry,
  GlProgram,
  Mesh,
  Shader,
  UniformGroup,
} from 'pixi.js';
import type { PointData, Renderer, TextureSource } from 'pixi.js';
import { POND } from '../../config/pond';
import type { PondProp } from '../../config/pond';
import { WATER } from '../../config/water';
import bankFragment from './shaders/bank.frag?raw';
import koiRefraction from './shaders/koiRefraction.frag?raw';
import surface from './shaders/surface.frag?raw';
import pondBottom from './shaders/water.frag?raw';
import vertex from './shaders/water.vert?raw';
import { MAX_PROPS, waterShapes } from './PondProps';
import { WaterSim, withCommon, withWaves } from './WaterSim';
import type { SimArea } from './WaterSim';

/** Where the board sits on the stage, so the pond can be laid out around it. */
export interface PondLayout {
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly board: SimArea;
  /** Stones and pads in the water: the waves stop at them and the foam outlines them. */
  readonly props: readonly PondProp[];
}

/** How the stage sits on the screen (CSS px) and the renderer's pixel density. */
export interface ScreenMapping {
  readonly offset: PointData;
  readonly scale: number;
  readonly resolution: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
}

type UniformDefs = Record<string, { value: unknown; type: string; size?: number }>;

/** Shader resources that point at the simulation's latest state; rebound after every update. */
interface StateBinding {
  uState: TextureSource;
}

/**
 * The pond: a GPU water simulation (WaterSim) that the koi and the matches disturb, drawn as an ink print by
 * moonlight in four passes that read the same waves and share the pond's outline:
 * - `bank`: the ground around the pond, over the whole screen. It never changes, so it's drawn once per screen
 *   size into a texture instead of running its shader every frame
 * - `bottom`: the water under the koi (depth, light net, the moon's reflection, ripple lines)
 * - `koiFilter`: on the koi layer (the koi bend under the waves and take on a little of the water colour)
 * - `surface`: above the koi (faint ripple lines, shore foam, gold-leaf glints on the open water)
 */
export class PondWater {
  readonly bank = new Container();
  readonly bottom: Mesh<Geometry, Shader>;
  readonly surface: Mesh<Geometry, Shader>;
  readonly koiFilter: Filter;
  private readonly sim: WaterSim;
  private readonly bankPainter: Mesh<Geometry, Shader>;
  private readonly shape: UniformGroup;
  private readonly bindings: StateBinding[] = [];
  private readonly koiUniforms: { uAreaOrigin: number[]; uStageTransform: number[] };

  constructor(renderer: Renderer, layout: PondLayout) {
    const water = waterArea(layout.board);
    this.shape = pondShape(layout);
    this.sim = new WaterSim(renderer, water, this.shape);
    const stage = { x: 0, y: 0, width: layout.stageWidth, height: layout.stageHeight };
    this.bankPainter = this.quad(stage, withCommon(bankFragment), bankLook(layout));
    this.bank.addChild(this.bankPainter);
    this.bottom = this.quad(water, withWaves(pondBottom), waterLook());
    this.surface = this.quad(water, withWaves(surface), surfaceLook(layout.board));
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

  /** Pushes the surface at a stage point (wakes, tail flicks, dives; later jumps). */
  drop(stageX: number, stageY: number, radius: number, push: number): void {
    this.sim.drop(stageX, stageY, radius, push);
  }

  /** A push at a point in global (screen) space, scaled by `strength`: swaps and matches. */
  ripple(globalPoint: PointData, strength: number): void {
    const local = this.bottom.toLocal(globalPoint);
    this.sim.drop(local.x, local.y, WATER.diveRadius, -WATER.divePush * strength);
  }

  /**
   * Tells the passes how the stage maps onto the screen: the koi filter reads the waves at the right stage
   * position, lines keep a steady width in device pixels, and the bank is repainted to cover the whole screen.
   * Call whenever the stage is resized or moved.
   */
  mapToScreen(koiAreaOrigin: PointData, stage: ScreenMapping): void {
    const { offset, scale, resolution, screenWidth, screenHeight } = stage;
    this.koiUniforms.uAreaOrigin = [koiAreaOrigin.x, koiAreaOrigin.y];
    this.koiUniforms.uStageTransform = [offset.x, offset.y, scale];
    this.sim.uniforms.uniforms.uPixelRatio = scale * resolution;
    const visible = {
      x: -offset.x / scale,
      y: -offset.y / scale,
      width: screenWidth / scale,
      height: screenHeight / scale,
    };
    this.paintBank(visible, scale * resolution);
  }

  /** Paints the bank once over the visible stage area into a cached texture, at the screen's pixel density. */
  private paintBank(visible: SimArea, pixelRatio: number): void {
    const old = this.bankPainter.geometry;
    this.bankPainter.geometry = quadGeometry(visible);
    old.destroy();
    this.bank.cacheAsTexture({ resolution: pixelRatio });
    this.bank.updateCacheTexture();
  }

  /** A quad over a stage rectangle, drawn by one of the pond's fragment shaders. */
  private quad(area: SimArea, fragment: string, look: UniformDefs): Mesh<Geometry, Shader> {
    const geometry = quadGeometry(area);
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { sim: this.sim.uniforms, pond: this.shape, uState: this.sim.texture, look },
    });
    this.bindings.push(shader.resources as StateBinding);
    return new Mesh({ geometry, shader });
  }

  private createKoiFilter(): Filter {
    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: withWaves(koiRefraction) }),
      // the koi are baked sharp: render the filter at the screen's resolution, not Pixi's default of 1
      resolution: 'inherit',
      antialias: 'inherit',
      resources: {
        sim: this.sim.uniforms,
        pond: this.shape,
        uState: this.sim.texture,
        koiUniforms: {
          uAreaOrigin: { value: [0, 0], type: 'vec2<f32>' },
          uStageTransform: { value: [0, 0, 1], type: 'vec3<f32>' },
          uKoiRefraction: { value: WATER.koiRefraction, type: 'f32' },
          uWaterTint: { value: color(WATER.mid), type: 'vec3<f32>' },
          uTint: { value: WATER.koiTint, type: 'f32' },
        },
      },
    });
    this.bindings.push(filter.resources as StateBinding);
    return filter;
  }
}

/** The pond's base rectangle: the board plus the margins. */
function pondRect(board: SimArea): SimArea {
  const { left, right, top, bottom } = POND.margin;
  return {
    x: board.x - left,
    y: board.y - top,
    width: board.width + left + right,
    height: board.height + top + bottom,
  };
}

/** Everywhere the water can reach: the pond rectangle plus room for the shore's bends. */
function waterArea(board: SimArea): SimArea {
  const pond = pondRect(board);
  const pad = POND.shoreWobble + 2;
  return { x: pond.x - pad, y: pond.y - pad, width: pond.width + pad * 2, height: pond.height + pad * 2 };
}

function quadGeometry({ x, y, width, height }: SimArea): Geometry {
  return new Geometry({
    attributes: { aPosition: [x, y, x + width, y, x + width, y + height, x, y + height] },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });
}

/**
 * Where the water is, for the shaders (uPond, uPondShape, uProps, uPropAxes in common.glsl): the pond's outline
 * and the stones and pads in it. Shared by the simulation and every pass, so they all agree on the shore.
 */
function pondShape(layout: PondLayout): UniformGroup {
  const pond = pondRect(layout.board);
  const { shapes, axes } = waterShapes(layout.props);
  return new UniformGroup({
    uPond: { value: [pond.x, pond.y, pond.width, pond.height], type: 'vec4<f32>' },
    uPondShape: { value: [POND.cornerRadius, POND.shoreWobble, POND.shoreBend], type: 'vec3<f32>' },
    uProps: { value: shapes, type: 'vec4<f32>', size: MAX_PROPS },
    uPropAxes: { value: axes, type: 'vec2<f32>', size: MAX_PROPS },
  });
}

function bankLook(layout: PondLayout): UniformDefs {
  const halfWidth = layout.stageWidth / 2;
  const halfHeight = layout.stageHeight / 2;
  return {
    uBank: { value: color(POND.bank), type: 'vec3<f32>' },
    uBankPattern: { value: color(POND.bankPattern), type: 'vec3<f32>' },
    uPatternSize: { value: POND.patternSize, type: 'f32' },
    uWetBand: { value: POND.wetBand, type: 'f32' },
    uFrame: { value: [halfWidth, halfHeight, halfWidth * 1.2, halfHeight * 1.1], type: 'vec4<f32>' },
  };
}

function waterLook(): UniformDefs {
  return {
    uShallow: { value: color(WATER.shallow), type: 'vec3<f32>' },
    uMid: { value: color(WATER.mid), type: 'vec3<f32>' },
    uDeep: { value: color(WATER.deep), type: 'vec3<f32>' },
    uDepth: { value: [WATER.shallowWidth, WATER.deepFrom], type: 'vec2<f32>' },
    uLip: { value: [WATER.lipShade, WATER.lipWidth], type: 'vec2<f32>' },
    uRefraction: { value: WATER.refraction, type: 'f32' },
    uRelief: { value: WATER.relief, type: 'f32' },
    uLightDir: { value: [...WATER.lightDir], type: 'vec2<f32>' },
    uLightNet: { value: color(WATER.lightNet), type: 'vec3<f32>' },
    uNetLook: {
      value: [WATER.lightNetStrength, WATER.lightNetSize, WATER.lightNetWidth],
      type: 'vec3<f32>',
    },
    uInk: { value: color(WATER.ink), type: 'vec3<f32>' },
    uRipple: rippleLook(),
    uMoon: { value: color(POND.moon), type: 'vec3<f32>' },
    uMoonAt: { value: [...POND.moonAt, POND.moonRadius], type: 'vec3<f32>' },
  };
}

function surfaceLook(board: SimArea): UniformDefs {
  return {
    uBoard: { value: [board.x, board.y, board.width, board.height], type: 'vec4<f32>' },
    uInk: { value: color(WATER.ink), type: 'vec3<f32>' },
    uRipple: rippleLook(),
    uRippleOverKoi: { value: WATER.rippleOverKoi, type: 'f32' },
    uFoam: { value: [WATER.foamWidth, WATER.foamStrength, WATER.foamBreath], type: 'vec3<f32>' },
    uGold: { value: color(WATER.gold), type: 'vec3<f32>' },
    uGoldLook: { value: [WATER.goldStrength, WATER.goldGrid], type: 'vec2<f32>' },
  };
}

function rippleLook(): { value: number[]; type: string } {
  return {
    value: [...WATER.rippleGate, WATER.rippleWidth, WATER.rippleStrength],
    type: 'vec4<f32>',
  };
}

/** '#rrggbb' to the 0..1 RGB a shader expects. */
function color(hex: string): number[] {
  return new Color(hex).toArray().slice(0, 3);
}
