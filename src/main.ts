import { Application, Container, Rectangle, UPDATE_PRIORITY } from 'pixi.js';
import './ui/kit.css';
import './ui/hud.css';
import './ui/bar.css';
import './ui/overlay.css';
import type { PointData } from 'pixi.js';
import { bakeLotusPad } from './art/pondProps';
import { BOARD } from './config/board';
import { INPUT } from './config/input';
import { KOI_LOOK, KOI_SET } from './config/koi';
import { LAYOUT } from './config/layout';
import { LEVEL, SCORE } from './config/level';
import { POND } from './config/pond';
import type { PondProp } from './config/pond';
import { GOAL_TRAY, POWER_BAR } from './config/ui';
import { WATER } from './config/water';
import { Random } from './core/Random';
import { GameScene } from './game/GameScene';
import { placeOn } from './layout/anchor';
import { shoreStones } from './layout/shore';
import { layoutGame } from './layout/gameLayout';
import type { GameLayout, Rect } from './layout/gameLayout';
import { readSafeInsets } from './layout/safeInsets';
import { BoardAnimator } from './view/BoardAnimator';
import { BoardView } from './view/BoardView';
import { Fireflies } from './view/Fireflies';
import { PadView } from './view/PadView';
import { ScorePopups } from './view/ScorePopups';
import { KoiLife } from './view/KoiLife';
import { KoiTextures } from './view/KoiTextures';
import { PondProps } from './view/water/PondProps';
import { PondWater } from './view/water/PondWater';
import { SwipeInput } from './view/SwipeInput';
import { Hud } from './ui/Hud';
import { placePowerBar } from './ui/PowerBar';
import { ResultCard } from './ui/ResultCard';
import { RotateNotice } from './ui/RotateNotice';
import { applyTheme } from './ui/theme';
import { UiLayer } from './ui/UiLayer';

/** Composition root: the one place that creates the objects and hands each one what it needs. */
async function boot(host: HTMLElement): Promise<void> {
  applyTheme(document.documentElement);
  await new RotateNotice(document.body).upright(); // lay out for the phone held upright
  const app = await createApp(host);
  const layout = layoutGame(app.screen, readSafeInsets(), LAYOUT);
  const { board } = layout;
  const ui = new UiLayer(host, layout.stage);
  const hud = new Hud(ui, layout.hud, lotusIcon(app));
  placePowerBar(ui, layout.bar, POWER_BAR.slots);

  const textures = createTextures(app, board.piece);
  const pond = createPond(app, layout);

  const boardView = new BoardView(textures, { ...BOARD, cellSize: board.cell, koiSize: board.piece });
  boardView.position.set(board.x, board.y);
  const popups = createScorePopups(hud, board);
  const result = new ResultCard(host);
  const pads = createPads(app, pond, hud, board);

  startGame({ boardView, pond, popups, hud, pads, result }, board.cell);

  const stage = new Container();
  putUnderWater(app, boardView, pond, board);
  stage.addChild(
    pond.bank,
    pond.bottom,
    boardView,
    pads, // over the koi: a koi swimming past a pad goes under the leaf
    pond.surface,
    popups,
    createScenery(app, layout),
  );
  app.stage.addChild(stage);
  keepFitted(app, { stage, ui }, layout.stage, boardView, pond);
}

/**
 * Fits the stage to the window now and on every resize, and tells the pond how the stage maps onto the screen
 * (the koi filter's position, line widths, the bank's cached painting). The layout is made once, for the screen the
 * game starts on; a later resize (a desktop window, the phone's toolbar) scales it to fit.
 */
function keepFitted(
  app: Application,
  { stage, ui }: { stage: Container; ui: UiLayer },
  size: GameLayout['stage'],
  boardView: BoardView,
  pond: PondWater,
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

/** The game: the scene (presenter) wired to every display it drives, and the swipe input that feeds it. */
function startGame(
  parts: {
    boardView: BoardView;
    pond: PondWater;
    popups: ScorePopups;
    hud: Hud;
    pads: PadView;
    result: ResultCard;
  },
  cell: number,
): void {
  const { boardView, pond, popups, hud, pads, result } = parts;
  const level = { ...LEVEL, ...SCORE };
  const scene = new GameScene({
    spec: BOARD,
    level,
    rng: new Random(),
    view: boardView,
    animator: new BoardAnimator(boardView, cell, pond, popups, level.pointsPerPiece),
    status: hud,
    pads,
    result,
  });
  result.onRestart(() => {
    scene.restart();
  });
  new SwipeInput(boardView, cell * INPUT.swipeThreshold, scene.handleSwipe);
}

/** The points each match earns, over the board; they fly to the score in the HUD. */
function createScorePopups(hud: Hud, boardOrigin: PointData): ScorePopups {
  const score = hud.scoreAnchor();
  const popups = new ScorePopups({ x: score.x - boardOrigin.x, y: score.y - boardOrigin.y });
  popups.position.set(boardOrigin.x, boardOrigin.y);
  return popups;
}

/**
 * The lily pads on the board, floating over the koi layer: they rock on the app's clock, and a bloomed lotus flies
 * to the goal in the HUD.
 */
function createPads(app: Application, pond: PondWater, hud: Hud, board: GameLayout['board']): PadView {
  const goal = hud.goalAnchor();
  const pads = new PadView(
    {
      cellSize: board.cell,
      goalTarget: { x: goal.x - board.x, y: goal.y - board.y },
      toStage: (point) => ({ x: board.x + point.x, y: board.y + point.y }),
    },
    pond,
    app.renderer.resolution * KOI_LOOK.bakeResolution,
  );
  pads.position.set(board.x, board.y);
  app.ticker.add((ticker) => {
    pads.tick(ticker.deltaMS / 1000);
  });
  return pads;
}

/** The stones around the pond (painted once) and fireflies over the bank, on the app's clock. */
function createScenery(app: Application, layout: GameLayout): Container {
  const stones = [...placeProps(layout.pond), ...placeShore(layout.pond)];
  const props = new PondProps(stones, app.renderer.resolution * KOI_LOOK.bakeResolution);
  const screen = { x: 0, y: 0, width: layout.stage.width, height: layout.stage.height };
  const fireflies = new Fireflies({
    spots: [
      ...POND.fireflies.top.map((spot) => placeOn(screen, spot)),
      ...POND.fireflies.belowPond.map((spot) => placeOn(layout.pond, spot)),
    ],
    roam: POND.fireflyRoam,
    size: POND.fireflySize,
    color: POND.firefly,
  });
  app.ticker.add((ticker) => {
    fireflies.tick(ticker.deltaMS / 1000);
  });
  const scenery = new Container();
  scenery.addChild(props, fireflies);
  return scenery;
}

/** The pond's stones in the water, each at its corner of this pond. O(props). */
function placeProps(pond: Rect): PondProp[] {
  return POND.props.map((spot) => ({ ...spot, at: placeOn(pond, spot) }));
}

/** The ring of stones along this pond's shore, upright, each with its own seed so no two look alike. O(stones). */
function placeShore(pond: Rect): PondProp[] {
  const rng = new Random(POND.shore.seed);
  const stones = shoreStones(pond, { ...POND.shore, cornerRadius: POND.cornerRadius }, () => rng.next());
  return stones.map((stone, i) => ({ kind: 'stone', ...stone, turn: 0, seed: POND.shore.seed * 100 + i }));
}

/** The lotus in the HUD's goal: painted by the same painter as the lotuses on the board. */
function lotusIcon(app: Application): string {
  const resolution = app.renderer.resolution * KOI_LOOK.bakeResolution;
  return bakeLotusPad(GOAL_TRAY.iconRadius, 1, 7, resolution).toDataURL();
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
    ink: {
      outline: KOI_LOOK.outline,
      outlineWidth: KOI_LOOK.outlineWidth,
      finOutlineAlpha: KOI_LOOK.finOutlineAlpha,
      water: KOI_LOOK.underwater,
      finsUnder: KOI_LOOK.finsUnder,
      tailUnder: KOI_LOOK.tailUnder,
    },
    contact: { gap: WATER.contactGap, blur: WATER.contactBlur, finClear: WATER.contactFinClear },
    contactResolution: WATER.contactResolution,
  });
}

/**
 * The bank, the water below and above the board, animated by the app's clock and repainted after a lost WebGL
 * context comes back.
 */
function createPond(app: Application, layout: GameLayout): PondWater {
  const pond = new PondWater(app.renderer, {
    stageWidth: layout.stage.width,
    stageHeight: layout.stage.height,
    board: layout.board,
    pond: layout.pond,
    props: placeProps(layout.pond),
    moonAt: placeOn(layout.pond, POND.moonSpot),
  });
  app.ticker.add((ticker) => {
    pond.tick(ticker.deltaMS / 1000);
  });
  // Pixi rebuilds the GL state in its own listener (added first, so it runs first); then the pond repaints its own
  app.canvas.addEventListener('webglcontextrestored', () => {
    pond.restore();
  });
  return pond;
}

/**
 * Puts the koi in the water: the pond's filter bends the whole board layer through the waves, and every frame the
 * koi swim and push the water back (wakes when they move, tail flicks when they rest). Once everything has moved
 * this frame, the shadows follow the koi and the pond marks where they touch the water, for the foam around them.
 */
function putUnderWater(app: Application, boardView: BoardView, pond: PondWater, board: Rect): void {
  const life = new KoiLife(pond, boardView.position);
  app.ticker.add((ticker) => {
    life.update([...boardView.koi()], ticker.deltaMS / 1000);
  });
  const afterMotion = UPDATE_PRIORITY.NORMAL - 1; // after every normal update, before the frame is drawn (LOW)
  app.ticker.add(
    (ticker) => {
      boardView.follow(ticker.deltaMS / 1000);
      pond.touch(boardView.contacts);
    },
    undefined,
    afterMotion,
  );
  const margin = WATER.koiReach;
  boardView.filters = [pond.koiFilter];
  boardView.filterArea = new Rectangle(-margin, -margin, board.width + margin * 2, board.height + margin * 2);
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
