import { Application, Container, Rectangle, UPDATE_PRIORITY } from 'pixi.js';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';
import './ui/kit.css';
import './ui/hud.css';
import './ui/bar.css';
import './ui/overlay.css';
import type { PointData, Sprite } from 'pixi.js';
import { getVariety } from './art/koiBank';
import { bakeInkedKoi } from './art/koiInk';
import type { KoiInk } from './art/koiInk';
import { bakeLotusPad } from './art/pondProps';
import { SHORE_STYLES } from './art/shoreStyles';
import { BOARD, SHAPE } from './config/board';
import { INPUT } from './config/input';
import { KOI_COLORS, KOI_LOOK, KOI_SET } from './config/koi';
import { LAYOUT } from './config/layout';
import { LEVEL, SCORE } from './config/level';
import { POND } from './config/pond';
import type { PondProp } from './config/pond';
import { BOOSTERS, GOAL_TRAY, SPECIAL_MENU } from './config/ui';
import { BOOSTER_MOTION } from './config/specials';
import { WATER } from './config/water';
import { Random } from './core/Random';
import { GameScene } from './game/GameScene';
import { placeOn } from './layout/anchor';
import { traceShore } from './layout/outline';
import type { Outline } from './layout/outline';
import { ringAlongShore } from './layout/shore';
import { layoutGame } from './layout/gameLayout';
import type { GameLayout, Rect } from './layout/gameLayout';
import { readSafeInsets } from './layout/safeInsets';
import { BoardAnimator } from './view/BoardAnimator';
import { createBackdrop } from './view/Backdrop';
import { BoardView } from './view/BoardView';
import { Fireflies } from './view/Fireflies';
import { PadView } from './view/PadView';
import { ScorePopups } from './view/ScorePopups';
import { ShoreRing } from './view/ShoreRing';
import { KoiLife } from './view/KoiLife';
import { KoiTextures } from './view/KoiTextures';
import type { KoiBake } from './view/KoiTextures';
import { SpecialFx } from './view/SpecialFx';
import { SpecialMotions } from './view/SpecialMotions';
import { SpecialTextures } from './view/SpecialTextures';
import { PondProps } from './view/water/PondProps';
import { PondWater } from './view/water/PondWater';
import { SwipeInput } from './view/SwipeInput';
import { BoardMarks } from './view/BoardMarks';
import { BoosterMotions } from './view/BoosterMotions';
import { BoosterControl } from './game/BoosterControl';
import { InstructionPill } from './ui/InstructionPill';
import { SpecialMenu } from './ui/SpecialMenu';
import type { Cell, Special } from './model/types';
import type { GoalIcons } from './ui/GoalTray';
import { Hud } from './ui/Hud';
import { BoosterBar } from './ui/BoosterBar';
import { ResultCard } from './ui/ResultCard';
import { RotateNotice } from './ui/RotateNotice';
import { THEME, applyTheme } from './theme/theme';
import { UiLayer } from './ui/UiLayer';

/** Composition root: the one place that creates the objects and hands each one what it needs. */
async function boot(host: HTMLElement): Promise<void> {
  applyTheme(document.documentElement);
  await loadFonts(); // the Pixi labels are drawn once with whatever font is ready, so make sure it's Nunito
  await new RotateNotice(document.body).upright(); // lay out for the phone held upright
  const app = await createApp(host);
  const layout = layoutGame(app.screen, readSafeInsets(), LAYOUT);
  const { board } = layout;
  const shore = traceShore(SHAPE, board, { margin: POND.margin, cornerRadius: POND.cornerRadius });
  const ui = new UiLayer(host, layout.stage);
  const hud = new Hud(ui, layout.hud, { goalIcons: goalIcons(app), stars: LEVEL.stars });

  const bake = koiBake(app, board.piece);
  const textures = new KoiTextures(KOI_SET, bake); // the koi, baked once at the screen's resolution
  const specials = new SpecialTextures(KOI_SET, bake, KOI_COLORS); // the special koi, baked when first made
  const pond = createPond(app, layout, shore);

  const boardView = createBoardView(textures, specials, board);
  const popups = createScorePopups(hud, board);
  const result = new ResultCard(host);
  const pads = createPads(app, pond, hud, board);

  const effects = createSpecialEffects(boardView, specials, pond, board);
  const boosterViews = createBoosterViews(app, boardView, specials, pond, board.cell);
  const parts = { boardView, pond, popups, hud, pads, result, specials: effects, boosters: boosterViews };
  startGame(parts, { ui, layout });

  const stage = new Container();
  putUnderWater(app, boardView, pond, board);
  stage.addChild(
    pond.bank,
    createGarden(app, layout),
    pond.bottom,
    boosterViews.marks, // under the koi: the gold ring round a picked koi
    boardView,
    pads, // over the koi: a koi swimming past a pad goes under the leaf
    pond.surface,
    effects.fx, // the specials' light, over the water
    boosterViews.motions, // the feed's pellets and the special booster's sparkles
    popups,
    createScenery(app, layout, shore),
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
function startGame(parts: GameParts, screen: Screen): void {
  const { boardView, hud, pads, result } = parts;
  const bar = new BoosterBar(screen.ui, screen.layout.bar, BOOSTERS);
  const level = { ...LEVEL, ...SCORE };
  const animator = createAnimator(parts, screen, bar);
  const view = boardView;
  const scene = new GameScene({
    spec: BOARD,
    level,
    rng: new Random(),
    view,
    animator,
    status: hud,
    pads,
    result,
  });
  const control = createBoosterControl(scene, { bar, marks: parts.boosters.marks, screen, boardView });
  result.onRestart(() => {
    scene.restart();
    control.reset();
  });
  new SwipeInput(boardView, screen.layout.board.cell * INPUT.swipeThreshold, {
    swipe: (from, to) => {
      if (!control.armed) scene.handleSwipe(from, to); // while a booster is armed, the board takes its taps
    },
    tap: (cell) => {
      control.tap(cell);
    },
  });
}

/**
 * The animator: plays the model's results on the board, with the specials' effects and the boosters' motions (the
 * feed's pellets are thrown from its button, found in the UI and brought into the board's space).
 */
function createAnimator(parts: GameParts, screen: Screen, bar: BoosterBar): BoardAnimator {
  const { board } = screen.layout;
  const feedFrom = (): PointData => {
    const at = screen.ui.centreOf(bar.buttonOf('feed') ?? screen.ui.root);
    return { x: at.x - board.x, y: at.y - board.y };
  };
  const { boardView, pond, popups, specials, boosters } = parts;
  return new BoardAnimator(boardView, board.cell, pond, popups, SCORE.pointsPerPiece, specials, {
    motions: boosters.motions,
    feedFrom,
  });
}

/** Everything the game is played on: the board and its water, the HUD, the popups, the end card, the effects. */
interface GameParts {
  readonly boardView: BoardView;
  readonly pond: PondWater;
  readonly popups: ScorePopups;
  readonly hud: Hud;
  readonly pads: PadView;
  readonly result: ResultCard;
  readonly specials: { fx: SpecialFx; motions: SpecialMotions };
  readonly boosters: { motions: BoosterMotions; marks: BoardMarks };
}

/** Where the UI goes: its layer, and the layout. */
interface Screen {
  readonly ui: UiLayer;
  readonly layout: GameLayout;
}

/** The boosters' views on the board: their motions (over the koi) and the marks while one is armed (under them). */
function createBoosterViews(
  app: Application,
  boardView: BoardView,
  specials: SpecialTextures,
  pond: PondWater,
  cell: number,
): { motions: BoosterMotions; marks: BoardMarks } {
  const motions = new BoosterMotions(boardView, pond, cell, specials.sparkle);
  const marks = new BoardMarks(boardView, cell);
  for (const layer of [motions, marks]) layer.position.copyFrom(boardView.position);
  app.ticker.add((ticker) => {
    marks.follow(ticker.deltaMS / 1000);
  });
  return { motions, marks };
}

/** The boosters' presenter, wired to the bar, the pill over the pond, the board's marks and the petal menu. */
function createBoosterControl(
  scene: GameScene,
  views: { bar: BoosterBar; marks: BoardMarks; screen: Screen; boardView: BoardView },
): BoosterControl {
  const { ui, layout } = views.screen;
  const { board } = layout;
  const pillRect = { x: layout.hud.x, y: board.y - 52, width: layout.hud.width, height: 40 };
  const pill = new InstructionPill(ui, pillRect);
  const menuBoard = {
    cellCentre: (cell: Cell) => ({
      x: board.x + (cell.col + 0.5) * board.cell,
      y: board.y + (cell.row + 0.5) * board.cell,
    }),
    stageWidth: layout.stage.width,
    preview: (cell: Cell, type: Special['type']) => views.boardView.previewAt(cell, type),
  };
  const control = new BoosterControl({
    game: scene,
    buttons: views.bar,
    pill,
    marks: views.marks,
    picker: new SpecialMenu(ui, menuBoard, SPECIAL_MENU.choices, board.cell),
    sounds: { arm: () => undefined, cancel: () => undefined, wrong: () => undefined, lift: () => undefined },
    slots: BOOSTERS,
    feedLines: BOOSTER_MOTION.feed.lines,
    random: Math.random,
  });
  views.bar.onPress((type) => {
    control.press(type);
  });
  pill.onClose(() => {
    control.cancel();
  });
  return control;
}

/** The koi on the board, placed on the layout's board. */
function createBoardView(
  textures: KoiTextures,
  specials: SpecialTextures,
  board: GameLayout['board'],
): BoardView {
  const view = new BoardView(textures, specials, { ...BOARD, cellSize: board.cell, koiSize: board.piece });
  view.position.set(board.x, board.y);
  return view;
}

/** The specials' light over the board, and the ways the koi leave around them. */
function createSpecialEffects(
  boardView: BoardView,
  textures: SpecialTextures,
  pond: PondWater,
  board: GameLayout['board'],
): { fx: SpecialFx; motions: SpecialMotions } {
  const fx = new SpecialFx(boardView, textures, pond, board.cell, Math.max(board.width, board.height));
  fx.position.set(board.x, board.y);
  return { fx, motions: new SpecialMotions() };
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

/** The pond's border and stones (painted once) and fireflies over the bank, on the app's clock. */
function createScenery(app: Application, layout: GameLayout, shore: readonly Outline[]): Container {
  const props = new PondProps(placeProps(layout.pond), app.renderer.resolution * KOI_LOOK.bakeResolution);
  // the ring is baked at exactly the screen's pixels per stage px (the layout is made for this screen)
  const border = createBorder(shore, app.renderer.resolution * layout.stage.scale);
  const screen = { x: 0, y: 0, width: layout.stage.width, height: layout.stage.height };
  const fireflies = new Fireflies({
    spots: [
      ...POND.fireflies.top.map((spot) => placeOn(screen, spot)),
      ...POND.fireflies.belowPond.map((spot) => placeOn(layout.pond, spot)),
    ],
    roam: POND.fireflyRoam,
    size: POND.fireflySize,
    color: THEME.scene.firefly,
  });
  app.ticker.add((ticker) => {
    fireflies.tick(ticker.deltaMS / 1000);
  });
  const scenery = new Container();
  scenery.addChild(props, border, fireflies);
  return scenery;
}

/** The pond's stones in the water, each at its corner of this pond. O(props). */
function placeProps(pond: Rect): PondProp[] {
  return POND.props.map((spot) => ({ ...spot, at: placeOn(pond, spot) }));
}

/** The border along the pond's shore, in the style the config picks. */
function createBorder(shore: readonly Outline[], resolution: number): ShoreRing {
  const { style, seed } = POND.shore;
  const rng = new Random(seed);
  const pieces = ringAlongShore(shore, POND.shore, () => rng.next());
  return new ShoreRing(pieces, SHORE_STYLES[style], seed, resolution);
}

/**
 * The garden around the pond (see art/backdrop), baked once at exactly the screen's pixels per stage px: above the
 * pond on a tall phone, beside it on a wide screen.
 */
function createGarden(app: Application, layout: GameLayout): Sprite {
  const { stage, hud, pond, scene } = layout;
  const shore = LAYOUT.shoreWidth;
  return createBackdrop(
    {
      width: stage.width,
      height: stage.height,
      open: hud.y + hud.height,
      sceneBottom: scene.height,
      pond: { left: pond.x - shore, right: pond.x + pond.width + shore },
    },
    THEME.scene.backdrop,
    app.renderer.resolution * stage.scale,
    POND.shore.seed,
  );
}

/** The goals' icons, painted by the same painters as the board: the lotus, and an inked koi of each colour. */
function goalIcons(app: Application): GoalIcons {
  const resolution = app.renderer.resolution * KOI_LOOK.bakeResolution;
  const pose = { size: GOAL_TRAY.koiSize, resolution, build: KOI_LOOK.build, shadow: false };
  return {
    bonus: SCORE.goalBonus,
    lotus: bakeLotusPad(GOAL_TRAY.iconRadius, 1, 7, resolution).toDataURL(),
    koi: KOI_SET.map((id) => bakeInkedKoi(getVariety(id), pose, koiInk()).toDataURL()),
  };
}

/** How the koi are inked: outline, fins and tail under the water. Shared by the board's koi and the HUD's. */
function koiInk(): KoiInk {
  return {
    outline: KOI_LOOK.outline,
    outlineWidth: KOI_LOOK.outlineWidth,
    finOutlineAlpha: KOI_LOOK.finOutlineAlpha,
    water: KOI_LOOK.underwater,
    finsUnder: KOI_LOOK.finsUnder,
    tailUnder: KOI_LOOK.tailUnder,
  };
}

/** How the koi are baked: their size, the screen's resolution, their build, tail beat, shadow, ink and waterline. */
function koiBake(app: Application, koiSize: number): KoiBake {
  return {
    size: koiSize,
    resolution: app.renderer.resolution * KOI_LOOK.bakeResolution,
    build: KOI_LOOK.build,
    frames: KOI_LOOK.swimFrames,
    tailSwing: KOI_LOOK.tailSwing,
    shadowBlur: WATER.shadowBlur,
    ink: koiInk(),
    contact: { gap: WATER.contactGap, blur: WATER.contactBlur, finClear: WATER.contactFinClear },
    contactResolution: WATER.contactResolution,
  };
}

/**
 * The bank, the water below and above the board, animated by the app's clock and repainted after a lost WebGL
 * context comes back.
 */
function createPond(app: Application, layout: GameLayout, shore: readonly Outline[]): PondWater {
  const pond = new PondWater(app.renderer, {
    stageWidth: layout.stage.width,
    stageHeight: layout.stage.height,
    board: layout.board,
    pond: layout.pond,
    shore,
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

/** Waits for the bundled font's weights the game draws with (a missing one just falls back, it never throws). */
async function loadFonts(): Promise<void> {
  await Promise.all(['700 16px Nunito', '900 16px Nunito'].map((font) => document.fonts.load(font)));
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
