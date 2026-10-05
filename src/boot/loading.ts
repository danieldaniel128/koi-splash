import type { Application, Sprite } from 'pixi.js';
import { LEVEL } from '../config/level';
import { BootPipeline } from '../core/BootPipeline';
import type { GameEventBus } from '../game/events';
import type { ScreenFlow } from '../game/ScreenFlow';
import type { GoalIcons } from '../ui/GoalTray';
import { closeOnEscape } from '../ui/escapeKey';
import { Hud } from '../ui/Hud';
import type { KoiTextures } from '../view/KoiTextures';
import type { SpecialTextures } from '../view/SpecialTextures';
import { bakeShoreField } from '../view/water/PondWater';
import type { PondWater } from '../view/water/PondWater';
import { keepFitted, restoreAfterContextLoss } from './app';
import { addFrameLoop } from './frameLoop';
import { createGame } from './game';
import { bakeKoi, createSpecialKoi, goalIcons, koiBake } from './koi';
import { createGarden, createPond, createScenery } from './pond';
import type { Scenery } from './pond';
import type { GameScreen } from './screen';
import { addSoundMenu } from './sound';
import type { Sound } from './sound';
import { buildStage, putUnderWater } from './stage';

/** What the game is wired to before loading starts: the events bus, the sound, and the flow between screens. */
export interface GameWiring {
  readonly events: GameEventBus;
  readonly sound: Sound;
  readonly screenFlow: ScreenFlow;
}

/** What loading leaves for later: the art the game may want once it's played, to bake in the background. */
export interface LoadedGame {
  readonly warmUp: readonly (() => void)[];
}

/**
 * Loads the game behind the loading screen, step by step, and reports the share done: the font, the goals' icons,
 * the koi, the shore's distance field, the water, the garden, the stones round the pond, then the game built from
 * them, and one frame played unseen so the GPU compiles every shader and takes every texture before the player's
 * first frame. Each step is weighted by about how long it takes (measured in Chrome at phone size; only the ratios
 * matter). The special koi aren't needed to start, so they're left for later (warmUp): loading never waits for
 * them. Everything is made once: nothing is rebuilt for another game.
 */
export async function loadGame(
  app: Application,
  screen: GameScreen,
  wiring: GameWiring,
  onProgress: (done: number) => void,
): Promise<LoadedGame> {
  const bake = koiBake(screen.layout.board.piece, screen.resolution.art);
  const specials = createSpecialKoi(bake);
  await new BootPipeline()
    .step('fonts', 1, loadFonts)
    .step('goalIcons', 6, () => goalIcons(screen.resolution.art))
    .step('koi', 19, () => bakeKoi(bake))
    .step('shoreField', 3, () => bakeShoreField(screen.layout.pond, screen.shore))
    .step('pond', 1, ({ shoreField }) => createPond(app.renderer, screen, shoreField))
    .step('garden', 1, () => createGarden(screen))
    .step('scenery', 1, () => createScenery(screen))
    .step('game', 2, (made) => {
      assembleGame(app, screen, { ...made, specials }, wiring);
    })
    // the GPU draws the koi's canvases as they're first uploaded, here
    .step('firstFrame', 15, () => {
      app.ticker.update();
    })
    .run(onProgress);
  return { warmUp: specials.warmUpJobs() };
}

/** The art and the pond the game is put together from. */
interface Loaded {
  readonly goalIcons: GoalIcons;
  readonly koi: KoiTextures;
  readonly specials: SpecialTextures;
  readonly pond: PondWater;
  readonly garden: Sprite;
  readonly scenery: Scenery;
}

/**
 * The game, put together: the HUD and the sound menu, the board and everything played on it (Escape closes the top
 * one open of the sound menu and the boosters), the stage fitted to the screen, and the work every frame does.
 */
function assembleGame(app: Application, screen: GameScreen, made: Loaded, wiring: GameWiring): void {
  const { layout, ui } = screen;
  const { pond, scenery } = made;
  const { events, sound } = wiring;
  const hud = new Hud(ui, layout.hud, { goalIcons: made.goalIcons, stars: LEVEL.stars });
  const menu = addSoundMenu(screen, sound, events);
  const materials = {
    koi: made.koi,
    specials: made.specials,
    pond,
    hud,
    screenFlow: wiring.screenFlow,
    events,
  };
  const { parts: game, control } = createGame(screen, materials, app.canvas);
  closeOnEscape(document, [() => menu.close(), () => control.back()]); // the top one open closes first
  const koiLife = putUnderWater(game.boardView, pond, layout.board);
  const stage = buildStage(game, { garden: made.garden, scenery: scenery.layer });
  app.stage.addChild(stage);
  keepFitted(app, { stage, ui }, layout.stage, game);
  restoreAfterContextLoss(app, pond);
  const { boardView, pads, boosters } = game;
  addFrameLoop(app.ticker, {
    soundtrack: sound.soundtrack,
    pond,
    pads,
    marks: boosters.marks,
    koiLife,
    fireflies: scenery.fireflies,
    boardView,
  });
}

/**
 * Waits for the bundled font's weights the game draws with: the Pixi labels are drawn once with whatever font is
 * ready, so it must be Nunito (a missing one just falls back, it never throws).
 */
async function loadFonts(): Promise<void> {
  await Promise.all(['700 16px Nunito', '900 16px Nunito'].map((font) => document.fonts.load(font)));
}
