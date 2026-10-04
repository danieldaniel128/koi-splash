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
import type { Container as Layer, PointData, Renderer, TextureSource } from 'pixi.js';
import { POND } from '../../config/pond';
import type { PondProp } from '../../config/pond';
import { WATER } from '../../config/water';
import bankFragment from './shaders/bank.frag?raw';
import koiRefraction from './shaders/koiRefraction.frag?raw';
import surface from './shaders/surface.frag?raw';
import pondBottom from './shaders/water.frag?raw';
import vertex from './shaders/water.vert?raw';
import { KoiContact } from './KoiContact';
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

/** Something the koi and the matches push: the pond's water. */
export interface WaterSurface {
  /** Presses the surface down by `strength` (water-height units; negative lifts it) over `radius` px at a stage point. */
  push(at: PointData, strength: number, radius: number): void;
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
 * - `bottom`: the water under the koi (depth, soft light bands in the shallows, the waves as soft relief, the
 *   moon's broken reflection)
 * - `koiFilter`: on the koi layer (the koi bend under the waves and take on a little of the water colour)
 * - `surface`: above the koi (foam at the waterline around every koi, a faint rim on strong wave fronts, shore
 *   foam, gold-leaf glints on the open water)
 */
export class PondWater implements WaterSurface {
  readonly bank = new Container();
  readonly bottom: Mesh<Geometry, Shader>;
  readonly surface: Mesh<Geometry, Shader>;
  readonly koiFilter: Filter;
  private readonly sim: WaterSim;
  private readonly contact: KoiContact;
  private readonly bankPainter: Mesh<Geometry, Shader>;
  private readonly shape: UniformGroup;
  private readonly bindings: StateBinding[] = [];
  private readonly koiUniforms: { uAreaOrigin: number[]; uStageTransform: number[] };

  constructor(renderer: Renderer, layout: PondLayout) {
    const water = waterArea(layout.board);
    this.shape = pondShape(layout);
    this.sim = new WaterSim(renderer, water, this.shape);
    this.contact = new KoiContact(renderer, koiArea(layout.board), layout.board, WATER.contactResolution);
    const stage = { x: 0, y: 0, width: layout.stageWidth, height: layout.stageHeight };
    this.bankPainter = this.quad(stage, withCommon(bankFragment), bankLook(layout));
    this.bank.addChild(this.bankPainter);
    this.bottom = this.quad(water, withWaves(pondBottom), waterLook(layout.board));
    const koiMask = this.contact.texture;
    this.surface = this.quad(water, withWaves(surface), surfaceLook(layout.board, this.contact.area), koiMask);
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

  /**
   * Marks where the koi touch the water this frame, for the foam at the waterline: `shapes` holds every koi's
   * contact shape in the board's space. Call once per frame after the koi have moved, before the frame is drawn.
   */
  touch(shapes: Layer): void {
    this.contact.draw(shapes);
  }

  /** Wakes, tail flicks, swaps, dives and landing droplets all push the water here. */
  push(at: PointData, strength: number, radius: number): void {
    this.sim.drop(at.x, at.y, radius, -strength);
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

  /**
   * Repaints what lives only on the GPU after a lost WebGL context is restored: the water's state (Pixi brings it
   * back empty) and the bank's cached painting.
   */
  restore(): void {
    this.sim.reset();
    this.bank.updateCacheTexture();
  }

  /** Paints the bank once over the visible stage area into a cached texture, at the screen's pixel density. */
  private paintBank(visible: SimArea, pixelRatio: number): void {
    const old = this.bankPainter.geometry;
    this.bankPainter.geometry = quadGeometry(visible);
    old.destroy();
    // no antialias: it's one full-screen quad, and Pixi would otherwise give it a multisampled buffer per screen size
    this.bank.cacheAsTexture({ resolution: pixelRatio, antialias: false });
    this.bank.updateCacheTexture();
  }

  /**
   * A quad over a stage rectangle, drawn by one of the pond's fragment shaders with its own uniforms (`look`) and,
   * for the passes that draw around the koi, the koi contact mask (uKoiMask).
   */
  private quad(area: SimArea, fragment: string, look: UniformDefs, uKoiMask?: TextureSource): Mesh<Geometry, Shader> {
    const geometry = quadGeometry(area);
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: {
        sim: this.sim.uniforms,
        pond: this.shape,
        uState: this.sim.texture,
        look,
        ...(uKoiMask ? { uKoiMask } : {}),
      },
    });
    this.bindings.push(shader.resources as StateBinding);
    return new Mesh({ geometry, shader });
  }

  private createKoiFilter(): Filter {
    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: withWaves(koiRefraction) }),
      // the koi are baked sharp: render the filter at the screen's resolution, not Pixi's default of 1
      resolution: 'inherit',
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

/** Where the koi can be: the board plus room for koi that sway or lift past their cell. */
function koiArea(board: SimArea): SimArea {
  const reach = WATER.koiReach;
  return { x: board.x - reach, y: board.y - reach, width: board.width + reach * 2, height: board.height + reach * 2 };
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

function waterLook(board: SimArea): UniformDefs {
  return {
    uShallow: { value: color(WATER.shallow), type: 'vec3<f32>' },
    uMid: { value: color(WATER.mid), type: 'vec3<f32>' },
    uDeep: { value: color(WATER.deep), type: 'vec3<f32>' },
    uDepth: { value: [WATER.shallowWidth, WATER.deepFrom], type: 'vec2<f32>' },
    uLip: { value: [WATER.lipShade, WATER.lipWidth], type: 'vec2<f32>' },
    uRefraction: { value: WATER.refraction, type: 'f32' },
    uLightDir: { value: [...WATER.lightDir], type: 'vec2<f32>' },
    uBoard: { value: [board.x, board.y, board.width, board.height], type: 'vec4<f32>' },
    uGlow: { value: color(WATER.glow), type: 'vec3<f32>' },
    uGlowLook: {
      value: [WATER.glowStrength, WATER.glowSize, WATER.glowSoftness, WATER.glowReach],
      type: 'vec4<f32>',
    },
    uGlowUnderBoard: { value: WATER.glowUnderBoard, type: 'f32' },
    uSheen: { value: WATER.sheen, type: 'f32' },
    uInk: { value: color(WATER.ink), type: 'vec3<f32>' },
    uRelief: {
      value: [WATER.slopeLight, WATER.slopeShade, WATER.crestHeight, WATER.crestLight],
      type: 'vec4<f32>',
    },
    uTroughShade: { value: WATER.troughShade, type: 'f32' },
    uRim: { value: [...WATER.rimGate, WATER.rimStrength], type: 'vec3<f32>' },
    uMoon: { value: color(POND.moon), type: 'vec3<f32>' },
    uMoonAt: { value: [...POND.moonAt, POND.moonRadius], type: 'vec3<f32>' },
  };
}

function surfaceLook(board: SimArea, koiMask: SimArea): UniformDefs {
  return {
    uBoard: { value: [board.x, board.y, board.width, board.height], type: 'vec4<f32>' },
    uMaskArea: { value: [koiMask.x, koiMask.y, koiMask.width, koiMask.height], type: 'vec4<f32>' },
    uContact: {
      value: [WATER.contactWidth, WATER.contactStrength, WATER.contactBreath, WATER.contactBreaks],
      type: 'vec4<f32>',
    },
    uKoiShift: { value: WATER.koiRefraction, type: 'f32' },
    uInk: { value: color(WATER.ink), type: 'vec3<f32>' },
    uLightDir: { value: [...WATER.lightDir], type: 'vec2<f32>' },
    uRim: { value: [...WATER.rimGate, WATER.rimOverKoi], type: 'vec3<f32>' },
    uFoam: { value: [WATER.foamWidth, WATER.foamStrength, WATER.foamBreath], type: 'vec3<f32>' },
    uGold: { value: color(WATER.gold), type: 'vec3<f32>' },
    uGoldLook: { value: [WATER.goldStrength, WATER.goldGrid], type: 'vec2<f32>' },
  };
}

/** '#rrggbb' to the 0..1 RGB a shader expects. */
function color(hex: string): number[] {
  return new Color(hex).toArray().slice(0, 3);
}
