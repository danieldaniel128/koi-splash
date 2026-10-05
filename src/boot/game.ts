import type { PointData } from 'pixi.js';
import { INPUT } from '../config/input';
import { LEVEL, SCORE } from '../config/level';
import { BOOSTER_MOTION } from '../config/specials';
import { BANNER, BOOSTERS, SPECIAL_MENU } from '../config/ui';
import { Random, seedFromQuery } from '../core/Random';
import { BoosterControl } from '../game/BoosterControl';
import type { BoosterSounds } from '../game/BoosterControl';
import { SwapControl } from '../game/SwapControl';
import type { GameEventBus } from '../game/events';
import { GameScene } from '../game/GameScene';
import type { ScreenFlow } from '../game/ScreenFlow';
import type { GameLayout, Rect } from '../layout/gameLayout';
import type { Cell, Special } from '../model/types';
import { BannerLane } from '../ui/BannerLane';
import { comboBanner, plainBanner } from '../ui/banners';
import { FlyingPoints } from '../ui/FlyingPoints';
import { BoosterBar } from '../ui/BoosterBar';
import type { Hud } from '../ui/Hud';
import { InstructionPill } from '../ui/InstructionPill';
import { SpecialMenu } from '../ui/SpecialMenu';
import { BoardAnimator } from '../view/BoardAnimator';
import { BoardMarks } from '../view/BoardMarks';
import type { BoardView } from '../view/BoardView';
import { BoosterMotions } from '../view/BoosterMotions';
import { HitStop } from '../view/HitStop';
import type { KoiTextures } from '../view/KoiTextures';
import { PadView } from '../view/PadView';
import { ScorePopups } from '../view/ScorePopups';
import { SpecialFx } from '../view/SpecialFx';
import { SpecialMotions } from '../view/SpecialMotions';
import type { SpecialTextures } from '../view/SpecialTextures';
import { SwipeInput } from '../view/SwipeInput';
import type { BoardGestures } from '../view/SwipeTracker';
import type { PondWater } from '../view/water/PondWater';
import { createBoardView } from './koi';
import type { GameScreen } from './screen';

/**
 * What the game is played with: the koi baked for it, the pond, the HUD, the screen flow (which opens the end card
 * and plays again) and the events bus.
 */
export interface GameMaterials {
  readonly koi: KoiTextures;
  readonly specials: SpecialTextures;
  readonly pond: PondWater;
  readonly hud: Hud;
  readonly screenFlow: ScreenFlow;
  readonly events: GameEventBus;
}

/** Everything the game is played on: the board and its water, the HUD, the popups, the screens, the effects. */
export interface GameParts {
  readonly boardView: BoardView;
  readonly pond: PondWater;
  readonly popups: ScorePopups;
  readonly hud: Hud;
  readonly pads: PadView;
  readonly screenFlow: ScreenFlow;
  readonly specials: { fx: SpecialFx; motions: SpecialMotions };
  readonly boosters: { motions: BoosterMotions; marks: BoardMarks };
  readonly events: GameEventBus;
  /** The one hit-stop: whatever holds the animations' clock still for a moment shares it. */
  readonly hitStop: HitStop;
}

/** The game, started: what it's played on, and the boosters' presenter (the Escape key backs out of it). */
export interface StartedGame {
  readonly parts: GameParts;
  readonly control: BoosterControl;
}

/**
 * The game on the pond: the koi on the board and everything played on it, run by the scene from the first swipe.
 * The player's taps and drags are read from the canvas.
 */
export function createGame(screen: GameScreen, made: GameMaterials, canvas: HTMLCanvasElement): StartedGame {
  const { board } = screen.layout;
  const { pond, hud, events } = made;
  const boardView = createBoardView(made.koi, made.specials, screen.spec, board);
  const hitStop = new HitStop();
  const parts: GameParts = {
    boardView,
    pond,
    popups: createScorePopups(new FlyingPoints(screen.ui, hud), board),
    hud,
    pads: createPads(pond, hud, board, screen.resolution.art),
    screenFlow: made.screenFlow,
    specials: createSpecialEffects({ boardView, textures: made.specials, pond, board, events }),
    boosters: createBoosterViews({
      boardView,
      specials: made.specials,
      pond,
      board,
      events,
      hitStop,
    }),
    events,
    hitStop,
  };
  announceOnBanner(events, new BannerLane(screen.ui, bannerRect(board)));
  return { parts, control: startGame(parts, screen, canvas) };
}

/** The banner lane: as wide as the board, over its top rows. */
function bannerRect(board: GameLayout['board']): Rect {
  const { x, width, cell } = board;
  return { x, y: board.y + cell * BANNER.top, width, height: cell * BANNER.height };
}

/** What the banner lane announces: combos and specials made, a reshuffle, every goal met, the pond won. */
function announceOnBanner(events: GameEventBus, lane: BannerLane): void {
  const { text } = BANNER;
  events.on('match', ({ round, made }) => {
    const banner = comboBanner(round, made);
    if (banner) lane.show(banner);
  });
  events.on('reshuffle', () => {
    lane.show(plainBanner(text.reshuffle));
  });
  events.on('allGoalsMet', () => {
    lane.show(plainBanner(text.goalsMet, text.goalsMetSub));
  });
  events.on('won', () => {
    lane.show(plainBanner(text.won));
  });
}

/**
 * The game: the scene (presenter) wired to every display it drives, and the player's input that feeds it. Playing
 * again, from the end card, starts the level and the boosters over. Returns the boosters' presenter, for the Escape
 * key.
 */
function startGame(parts: GameParts, screen: GameScreen, canvas: HTMLCanvasElement): BoosterControl {
  const { boardView, hud, pads, screenFlow } = parts;
  const bar = new BoosterBar(screen.ui, screen.layout.bar, BOOSTERS);
  const level = { ...LEVEL, ...SCORE };
  const animator = createAnimator(parts, screen, bar);
  const view = boardView;
  const scene = new GameScene({
    spec: screen.spec,
    level,
    rng: new Random(seedFromQuery(window.location.search, Date.now())), // ?seed=42 deals the same board every time
    view,
    animator,
    status: hud,
    pads,
    result: screenFlow,
    events: parts.events,
  });
  const control = createBoosterControl(scene, {
    bar,
    marks: parts.boosters.marks,
    screen,
    boardView,
    events: parts.events,
  });
  const swaps = new SwapControl(scene, parts.boosters.marks);
  listenToPlayer(
    { scene, control, swaps },
    { bar, screenFlow, boardView, animator, canvas, cell: screen.layout.board.cell },
  );
  return control;
}

/** The presenters the player's input goes to: the scene, the boosters, and the swap by hand. */
interface Presenters {
  readonly scene: GameScene;
  readonly control: BoosterControl;
  readonly swaps: SwapControl;
}

/**
 * The player's input: the board's taps and drags go to the armed booster, or else to the swap. Arming a booster or
 * playing again drops a picked koi.
 */
function listenToPlayer(
  { scene, control, swaps }: Presenters,
  on: {
    bar: BoosterBar;
    screenFlow: ScreenFlow;
    boardView: BoardView;
    animator: BoardAnimator;
    canvas: HTMLCanvasElement;
    cell: number;
  },
): void {
  const gestures = (): BoardGestures => (control.armed ? control : swaps);
  // a koi under a finger answers at once, before the gesture is known
  on.boardView.on('pointerdown', (event) => {
    const cell = on.boardView.pointToCell(on.boardView.toLocal(event.global));
    if (cell && scene.canSwap && scene.hasKoi(cell)) on.animator.touch(cell);
  });
  new SwipeInput(on.boardView, on.canvas, on.cell * INPUT.swipeThreshold, {
    swipe: (from, to) => {
      gestures().swipe(from, to);
    },
    tap: (cell) => {
      gestures().tap(cell);
    },
  });
  on.bar.onPress((type) => {
    control.press(type);
    if (control.armed) swaps.drop();
  });
  on.screenFlow.onReplay(() => {
    scene.restart();
    control.reset();
    swaps.drop();
  });
}

/**
 * The animator: plays the model's results on the board, with the specials' effects and the boosters' motions (the
 * feed's pellets are thrown from its button, found in the UI and brought into the board's space).
 */
function createAnimator(parts: GameParts, screen: GameScreen, bar: BoosterBar): BoardAnimator {
  const { board } = screen.layout;
  const feedFrom = (): PointData => {
    const at = screen.ui.centreOf(bar.buttonOf('feed') ?? screen.ui.root);
    return { x: at.x - board.x, y: at.y - board.y };
  };
  const { boardView, pond, popups, specials, boosters, events } = parts;
  return new BoardAnimator({
    view: boardView,
    cell: board.cell,
    water: pond,
    popups,
    specials,
    boosters: { motions: boosters.motions, feedFrom },
    events,
  });
}

/**
 * The boosters' views on the board: their motions (over the koi) and the marks while one is armed (under them), which
 * also lift a koi picked to swap by hand.
 */
function createBoosterViews(on: {
  boardView: BoardView;
  specials: SpecialTextures;
  pond: PondWater;
  board: GameLayout['board'];
  events: GameEventBus;
  hitStop: HitStop;
}): { motions: BoosterMotions; marks: BoardMarks } {
  const { boardView, events, board } = on;
  const { cell } = board;
  const motions = new BoosterMotions({
    view: boardView,
    water: on.pond,
    cell,
    sparkle: on.specials.sparkle,
    events,
    hitStop: on.hitStop,
    centre: { x: board.width / 2, y: board.height / 2 },
  });
  const marks = new BoardMarks(boardView, cell);
  for (const layer of [motions, marks]) layer.position.copyFrom(boardView.position);
  return { motions, marks };
}

/** What the boosters' presenter drives: the bar, the board's marks, the board, and the screen for the pill and menu. */
interface BoosterViews {
  readonly bar: BoosterBar;
  readonly marks: BoardMarks;
  readonly screen: GameScreen;
  readonly boardView: BoardView;
  readonly events: GameEventBus;
}

/** The boosters' presenter, wired to the bar's counts, the pill over the pond, the board's marks and the petals. */
function createBoosterControl(scene: GameScene, views: BoosterViews): BoosterControl {
  const { events } = views;
  const { ui, layout } = views.screen;
  const { board } = layout;
  const pill = new InstructionPill(ui, layout.pill);
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
    sounds: boosterSounds(events),
    slots: BOOSTERS,
    feedLines: BOOSTER_MOTION.feed.lines,
    random: Math.random,
  });
  pill.onClose(() => {
    control.cancel();
  });
  return control;
}

/** What the boosters sound like: they say what happened, and the sound board plays it. */
function boosterSounds(events: GameEventBus): BoosterSounds {
  return {
    arm: (type) => {
      events.emit('boosterArmed', { type, slot: BOOSTERS.findIndex((slot) => slot.type === type) });
    },
    cancel: () => {
      events.emit('boosterCancelled');
    },
    wrong: () => {
      events.emit('boosterRefused');
    },
    lift: () => {
      events.emit('koiLifted');
    },
    petals: () => {
      events.emit('petalsOpened');
    },
  };
}

/** The specials' light over the board, and the ways the koi leave around them. */
function createSpecialEffects(on: {
  boardView: BoardView;
  textures: SpecialTextures;
  pond: PondWater;
  board: GameLayout['board'];
  events: GameEventBus;
}): { fx: SpecialFx; motions: SpecialMotions } {
  const { board } = on;
  const fx = new SpecialFx({
    board: on.boardView,
    textures: on.textures,
    water: on.pond,
    cell: board.cell,
    length: Math.max(board.width, board.height),
    events: on.events,
  });
  fx.position.set(board.x, board.y);
  return { fx, motions: new SpecialMotions() };
}

/** The points each match earns, over the board; the big ones fly into the score in the HUD. */
function createScorePopups(flights: FlyingPoints, boardOrigin: PointData): ScorePopups {
  const popups = new ScorePopups(flights);
  popups.position.set(boardOrigin.x, boardOrigin.y);
  return popups;
}

/** The lily pads on the board, floating over the koi layer; a bloomed lotus flies to the goal in the HUD. */
function createPads(pond: PondWater, hud: Hud, board: GameLayout['board'], resolution: number): PadView {
  const pads = new PadView(
    {
      cellSize: board.cell,
      goalTarget: () => {
        const goal = hud.goalAnchor();
        return { x: goal.x - board.x, y: goal.y - board.y };
      },
      toStage: (point) => ({ x: board.x + point.x, y: board.y + point.y }),
    },
    pond,
    resolution,
  );
  pads.position.set(board.x, board.y);
  return pads;
}
