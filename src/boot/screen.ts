import { WebGLRenderer } from 'pixi.js';
import type { Application } from 'pixi.js';
import { MAX_TEXTURE_SIZE } from '../art/atlas';
import { BOARD } from '../config/board';
import { KOI_LOOK } from '../config/koi';
import { LAYOUT } from '../config/layout';
import { LEVEL } from '../config/level';
import { POND } from '../config/pond';
import { layoutGame } from '../layout/gameLayout';
import type { GameLayout } from '../layout/gameLayout';
import { traceShore } from '../layout/outline';
import type { Outline } from '../layout/outline';
import { readSafeInsets } from '../layout/safeInsets';
import { parseShape } from '../model/shape';
import type { BoardSpec } from '../model/types';
import { UiLayer } from '../ui/UiLayer';

/**
 * What the game is built for: this screen's layout, the shore traced round the board, the HTML UI layer over the
 * canvas, and how finely to paint.
 */
export interface GameScreen {
  /** The level's board: its shape and the koi colours in play. */
  readonly spec: BoardSpec;
  readonly layout: GameLayout;
  readonly shore: readonly Outline[];
  readonly ui: UiLayer;
  readonly resolution: PaintResolution;
  /** The largest texture this GPU takes (px): only a painting bigger than that is painted any softer. */
  readonly maxTextureSize: number;
}

/** Pixels per stage px to paint at. */
export interface PaintResolution {
  /** Exactly the screen's: the bank, the garden and the stone ring (the layout is made for this screen). */
  readonly screen: number;
  /** The koi, the lily pads and the stones in the water. */
  readonly art: number;
}

/**
 * Reads the level's board and lays the game out for the screen it starts on, and puts the UI layer over the canvas.
 * The layout is made once; a later resize scales the stage to fit (see keepFitted).
 */
export function measureScreen(app: Application, host: HTMLElement): GameScreen {
  const shape = parseShape(LEVEL.shape);
  const layout = layoutGame(app.screen, readSafeInsets(), { ...LAYOUT, cols: shape.cols, rows: shape.rows });
  const shore = traceShore(shape, layout.board, { margin: POND.margin, cornerRadius: POND.cornerRadius });
  return {
    spec: { ...shape, kinds: BOARD.kinds },
    layout,
    shore,
    ui: new UiLayer(host, layout.stage),
    resolution: paintResolution(app.renderer.resolution, layout.stage.scale),
    maxTextureSize: maxTextureSize(app),
  };
}

/** The largest texture this GPU takes (px); one every WebGL device takes when it can't be asked. */
function maxTextureSize(app: Application): number {
  const { renderer } = app;
  if (!(renderer instanceof WebGLRenderer)) return MAX_TEXTURE_SIZE;
  return renderer.gl.getParameter(renderer.gl.MAX_TEXTURE_SIZE) as number;
}

/**
 * How finely to paint, worked out once for the screen the game starts on: the screen's own pixels per stage px (its
 * device pixel ratio, as the renderer caps it, times the stage's scale), and a little more for the koi, the pads and
 * the stones (see KOI_LOOK.bakeHeadroom).
 */
export function paintResolution(pixelRatio: number, stageScale: number): PaintResolution {
  const screen = pixelRatio * stageScale;
  return { screen, art: Math.min(screen * KOI_LOOK.bakeHeadroom, KOI_LOOK.maxBakeResolution) };
}
