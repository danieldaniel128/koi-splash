import { Application, Container, Rectangle } from 'pixi.js';
import { BOARD } from './config/board';
import { INPUT } from './config/input';
import { KOI_LOOK, KOI_SET } from './config/koi';
import { HUD } from './config/hud';
import { BOARD_LAYOUT, STAGE } from './config/layout';
import { LEVEL, SCORE } from './config/level';
import { POND } from './config/pond';
import { WATER } from './config/water';
import { Random } from './core/Random';
import { GameScene } from './game/GameScene';
import { BoardAnimator } from './view/BoardAnimator';
import { BoardView } from './view/BoardView';
import { Hud } from './view/Hud';
import { ResultOverlay } from './view/ResultOverlay';
import { SplashFx } from './view/SplashFx';
import { KoiLife } from './view/KoiLife';
import { KoiTextures } from './view/KoiTextures';
import { PondProps } from './view/water/PondProps';
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
  const splashes = new SplashFx();
  splashes.position.copyFrom(boardView.position);
  const hud = new Hud(boardWidth);
  hud.position.set(boardLeft, HUD.top);
  const result = new ResultOverlay(STAGE.width, STAGE.height);

  const scene = new GameScene({
    spec: BOARD,
    level: { ...LEVEL, ...SCORE },
    rng: new Random(),
    view: boardView,
    animator: new BoardAnimator(boardView, BOARD.cellSize, pond, splashes),
    status: hud,
    result,
  });
  result.on('restart', () => {
    scene.restart();
  });
  new SwipeInput(boardView, BOARD.cellSize * INPUT.swipeThreshold, scene.handleSwipe);

  const stage = new Container();
  putUnderWater(app, boardView, pond);
  stage.addChild(pond.bank, pond.bottom, boardView, pond.surface, splashes, createProps(app), hud, result);
  app.stage.addChild(stage);

  const fit = (): void => {
    fitStage(stage, app.screen.width, app.screen.height);
    const areaOrigin = boardView.toGlobal({ x: -WATER.koiReach, y: -WATER.koiReach });
    pond.mapToScreen(areaOrigin, stage.position, stage.scale.x, app.renderer.resolution);
  };
  fit();
  app.renderer.on('resize', fit);
}

/** Stones, lily pads and reeds around the pond, painted once; the pads rock with the app's clock. */
function createProps(app: Application): PondProps {
  const props = new PondProps(POND.props, app.renderer.resolution * KOI_LOOK.bakeResolution);
  app.ticker.add((ticker) => {
    props.tick(ticker.deltaMS / 1000);
  });
  return props;
}

/** The koi (one tail beat of poses each) and their shadows, baked once at the screen's resolution. */
function createTextures(app: Application, koiSize: number): KoiTextures {
  return new KoiTextures(KOI_SET, {
    size: koiSize,
    resolution: app.renderer.resolution * KOI_LOOK.bakeResolution,
    build: KOI_LOOK.build,
    frames: KOI_LOOK.swimFrames,
    tailSwing: KOI_LOOK.tailSwing,
    shadowBlur: WATER.shadowBlur,
  });
}

/** The bank, the water below and above the board, animated by the app's clock. */
function createPond(app: Application, boardLeft: number): PondWater {
  const pond = new PondWater(app.renderer, {
    stageWidth: STAGE.width,
    stageHeight: STAGE.height,
    board: {
      x: boardLeft,
      y: BOARD_LAYOUT.top,
      width: BOARD.cols * BOARD.cellSize,
      height: BOARD.rows * BOARD.cellSize,
    },
    props: POND.props,
  });
  app.ticker.add((ticker) => {
    pond.tick(ticker.deltaMS / 1000);
  });
  return pond;
}

/**
 * Puts the koi in the water: the pond's filter bends the whole board layer through the waves, and every frame the
 * koi swim and push the water back (wakes when they move, tail flicks when they rest).
 */
function putUnderWater(app: Application, boardView: BoardView, pond: PondWater): void {
  const life = new KoiLife(pond, boardView.position);
  app.ticker.add((ticker) => {
    life.update([...boardView.koi()], ticker.deltaMS / 1000);
  });
  const margin = WATER.koiReach;
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
    background: POND.bank, // the bank shader covers the screen; this only shows before the first frame
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
