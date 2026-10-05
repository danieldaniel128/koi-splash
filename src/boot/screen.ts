import type { Application } from 'pixi.js';
import { SHAPE } from '../config/board';
import { KOI_LOOK } from '../config/koi';
import { LAYOUT } from '../config/layout';
import { POND } from '../config/pond';
import { layoutGame } from '../layout/gameLayout';
import type { GameLayout } from '../layout/gameLayout';
import { traceShore } from '../layout/outline';
import type { Outline } from '../layout/outline';
import { readSafeInsets } from '../layout/safeInsets';
import { UiLayer } from '../ui/UiLayer';

/**
 * What the game is built for: this screen's layout, the shore traced round the board, the HTML UI layer over the
 * canvas, and how finely to paint.
 */
export interface GameScreen {
  readonly layout: GameLayout;
  readonly shore: readonly Outline[];
  readonly ui: UiLayer;
  readonly resolution: PaintResolution;
}

/** Pixels per stage px to paint at. */
export interface PaintResolution {
  /** Exactly the screen's: the bank, the garden and the stone ring (the layout is made for this screen). */
  readonly screen: number;
  /** The koi, the lily pads and the stones in the water. */
  readonly art: number;
}

/**
 * Lays the game out for the screen it starts on, and puts the UI layer over the canvas. The layout is made once; a
 * later resize scales the stage to fit (see keepFitted).
 */
export function measureScreen(app: Application, host: HTMLElement): GameScreen {
  const layout = layoutGame(app.screen, readSafeInsets(), LAYOUT);
  const shore = traceShore(SHAPE, layout.board, { margin: POND.margin, cornerRadius: POND.cornerRadius });
  return {
    layout,
    shore,
    ui: new UiLayer(host, layout.stage),
    resolution: {
      screen: app.renderer.resolution * layout.stage.scale,
      art: app.renderer.resolution * KOI_LOOK.bakeResolution,
    },
  };
}
