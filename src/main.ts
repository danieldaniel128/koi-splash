import { Application, Container, Rectangle } from 'pixi.js';
import { BOARD } from './config/board';
import { INPUT } from './config/input';
import { KOI_LOOK, KOI_SET } from './config/koi';
import { HUD } from './config/hud';
import { BOARD_LAYOUT, STAGE } from './config/layout';
import { LEVEL, SCORE } from './config/level';
import { WATER } from './config/water';
import { Random } from './core/Random';
import { GameScene } from './game/GameScene';
import { BoardAnimator } from './view/BoardAnimator';
import { BoardView } from './view/BoardView';
import { Hud } from './view/Hud';
import { ResultOverlay } from './view/ResultOverlay';
import { KoiTextures } from './view/KoiTextures';
import { PondWater } from './view/water/PondWater';
import { SwipeInput } from './view/SwipeInput';

/** Composition root: the one place that creates the objects and hands each one what it needs. */
async function boot(host: HTMLElement): Promise<void> {
  const app = await createApp(host);

  const koiSize = BOARD.cellSize * KOI_LOOK.scale;
  const textures = createTextures(app, koiSize);
  const boardWidth = BOARD.cols * BOARD.cellSize;
  const boardLeft = (STAGE.width - boardWidth) / 2;

  const pond = createPond(app, boardLeft);

  const boardView = new BoardView(textures, { ...BOARD, koiSize });
  boardView.position.set(boardLeft, BOARD_LAYOUT.top);
  const hud = new Hud(boardWidth);
  hud.position.set(boardLeft, HUD.top);
  const result = new ResultOverlay(STAGE.width, STAGE.height);

  const scene = new GameScene({
    spec: BOARD,
    level: { ...LEVEL, ...SCORE },
    rng: new Random(),
    view: boardView,
    animator: new BoardAnimator(boardView, BOARD.cellSize, pond),
    status: hud,
    result,
  });
  result.on('restart', () => {
    scene.restart();
  });
  new SwipeInput(boardView, BOARD.cellSize * INPUT.swipeThreshold, scene.handleSwipe);

  const stage = new Container();
  putUnderWater(boardView, pond);
  stage.addChild(pond.bottom, boardView, pond.surface, hud, result);
  app.stage.addChild(stage);

  const fit = (): void => {
    fitStage(stage, app.screen.width, app.screen.height);
    const areaOrigin = boardView.toGlobal({ x: -WATER.pondMargin, y: -WATER.pondMargin });
    pond.mapKoiFilter(areaOrigin, stage.position, stage.scale.x);
  };
  fit();
  app.renderer.on('resize', fit);
}

/** The water behind everything, framing the board, animated by the app's clock. */
/** The koi and their shadows, baked once at the screen's resolution. */
function createTextures(app: Application, koiSize: number): KoiTextures {
  const resolution = app.renderer.resolution * KOI_LOOK.bakeResolution;
  return new KoiTextures(KOI_SET, koiSize, resolution, WATER.shadowBlur);
}

/** The water below and above the board, animated by the app's clock. */
function createPond(app: Application, boardLeft: number): PondWater {
  const pond = new PondWater({
    width: STAGE.width,
    height: STAGE.height,
    boardX: boardLeft,
    boardY: BOARD_LAYOUT.top,
    boardWidth: BOARD.cols * BOARD.cellSize,
    boardHeight: BOARD.rows * BOARD.cellSize,
  });
  app.ticker.add((ticker) => {
    pond.tick(ticker.deltaMS / 1000);
  });
  return pond;
}

/** The koi are seen through the water: the pond's refraction filter bends the whole board layer. */
function putUnderWater(boardView: BoardView, pond: PondWater): void {
  const margin = WATER.pondMargin;
  boardView.filters = [pond.koiFilter];
  boardView.filterArea = new Rectangle(
    -margin,
    -margin,
    BOARD.cols * BOARD.cellSize + margin * 2,
    BOARD.rows * BOARD.cellSize + margin * 2,
  );
}

async function createApp(host: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: STAGE.background,
    preference: 'webgl', // the water shaders are written in GLSL
    resolution: Math.min(window.devicePixelRatio, 2), // the water is per-pixel work: cap it on 3x phones
    antialias: true,
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
