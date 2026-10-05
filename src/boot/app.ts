import { Application } from 'pixi.js';
import type { Container } from 'pixi.js';
import { WATER } from '../config/water';
import type { GameLayout } from '../layout/gameLayout';
import { THEME } from '../theme/theme';
import type { UiLayer } from '../ui/UiLayer';
import type { BoardView } from '../view/BoardView';
import type { PondWater } from '../view/water/PondWater';

/** The Pixi app, filling the game's element. */
export async function createApp(host: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: THEME.scene.bank, // the bank shader covers the screen; this only shows before the first frame
    preference: 'webgl', // the water shaders are written in GLSL
    resolution: Math.min(window.devicePixelRatio, 2), // the water is per-pixel work: cap it on 3x phones
    antialias: true,
    autoDensity: true,
  });
  host.appendChild(app.canvas);
  return app;
}

/**
 * Fits the stage to the window now and on every resize, and tells the pond how the stage maps onto the screen
 * (the koi filter's position, line widths, the bank's cached painting). The layout is made once, for the screen the
 * game starts on; a later resize (a desktop window, the phone's toolbar) scales it to fit.
 */
export function keepFitted(
  app: Application,
  { stage, ui }: { stage: Container; ui: UiLayer },
  size: GameLayout['stage'],
  { boardView, pond }: { boardView: BoardView; pond: PondWater },
): void {
  const fit = (): void => {
    fitStage(stage, size, app.screen);
    ui.fit(stage.scale.x, stage.position);
    const areaOrigin = boardView.toGlobal({ x: -WATER.koiReach, y: -WATER.koiReach });
    pond.mapToScreen(areaOrigin, {
      offset: stage.position,
      scale: stage.scale.x,
      resolution: app.renderer.resolution,
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
    });
  };
  fit();
  app.renderer.on('resize', fit);
}

/**
 * Repaints the pond after a lost WebGL context comes back. Pixi rebuilds the GL state in its own listener (added
 * when the app was made, so it runs first); then the pond repaints what only lived on the GPU.
 */
export function restoreAfterContextLoss(app: Application, pond: PondWater): void {
  app.canvas.addEventListener('webglcontextrestored', () => {
    pond.restore();
  });
}

/**
 * Scales the stage to fit the screen and centres it, never stretched. On the screen the layout was made for it
 * covers it exactly; after a resize the bank's colour fills the rest.
 */
function fitStage(
  stage: Container,
  size: { width: number; height: number },
  screen: { width: number; height: number },
): void {
  const scale = Math.min(screen.width / size.width, screen.height / size.height);
  stage.scale.set(scale);
  stage.position.set((screen.width - size.width * scale) / 2, (screen.height - size.height * scale) / 2);
}
