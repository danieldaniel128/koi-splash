import { Application, Container } from 'pixi.js';
import { BOARD } from './config/board';
import { INPUT } from './config/input';
import { KOI_LOOK, KOI_SET } from './config/koi';
import { BOARD_LAYOUT, STAGE } from './config/layout';
import { Random } from './core/Random';
import { GameScene } from './game/GameScene';
import { createBoard } from './model/rules';
import { BoardAnimator } from './view/BoardAnimator';
import { BoardView } from './view/BoardView';
import { KoiTextures } from './view/KoiTextures';
import { SwipeInput } from './view/SwipeInput';

/** Composition root: the one place that creates the objects and hands each one what it needs. */
async function boot(host: HTMLElement): Promise<void> {
  const app = await createApp(host);

  const koiSize = BOARD.cellSize * KOI_LOOK.scale;
  const textures = new KoiTextures(KOI_SET, koiSize, app.renderer.resolution * KOI_LOOK.bakeResolution);
  const rng = new Random();
  const board = createBoard(BOARD, rng);

  const boardView = new BoardView(textures, { ...BOARD, koiSize });
  boardView.position.set((STAGE.width - BOARD.cols * BOARD.cellSize) / 2, BOARD_LAYOUT.top);
  boardView.render(board);

  const animator = new BoardAnimator(boardView, BOARD.cellSize);
  const scene = new GameScene({ board, spec: BOARD, rng, view: boardView, animator });
  new SwipeInput(boardView, BOARD.cellSize * INPUT.swipeThreshold, scene.handleSwipe);

  const stage = new Container();
  stage.addChild(boardView);
  app.stage.addChild(stage);

  const fit = (): void => {
    fitStage(stage, app.screen.width, app.screen.height);
  };
  fit();
  app.renderer.on('resize', fit);
}

async function createApp(host: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: STAGE.background,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
  host.appendChild(app.canvas);
  return app;
}

/** Scales the logical stage to fit the window and centres it (letterboxed, never stretched). */
function fitStage(stage: Container, screenWidth: number, screenHeight: number): void {
  const scale = Math.min(screenWidth / STAGE.width, screenHeight / STAGE.height);
  stage.scale.set(scale);
  stage.position.set((screenWidth - STAGE.width * scale) / 2, (screenHeight - STAGE.height * scale) / 2);
}

function showBootError(host: HTMLElement, error: unknown): void {
  console.error(error);
  host.textContent = 'Koi Splash could not start. Please reload the page.';
  host.classList.add('boot-error');
}

const host = document.getElementById('game');
if (host) {
  boot(host).catch((error: unknown) => {
    showBootError(host, error);
  });
}
