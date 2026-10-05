import type { Application, Sprite } from 'pixi.js';
import { LEVEL } from '../config/level';
import { BootPipeline } from '../core/BootPipeline';
import type { GameEventBus } from '../game/events';
import type { GoalIcons } from '../ui/GoalTray';
import { closeOnEscape } from '../ui/escapeKey';
import { Hud } from '../ui/Hud';
import type { ResultCard } from '../ui/ResultCard';
import type { KoiTextures } from '../view/KoiTextures';
import type { SpecialTextures } from '../view/SpecialTextures';
import type { PondWater } from '../view/water/PondWater';
import { keepFitted, restoreAfterContextLoss } from './app';
import { addFrameLoop } from './frameLoop';
import { createGame } from './game';
import { bakeKoi, createSpecialKoi, goalIcons, koiBake } from './koi';
import { bakeShore, createGarden, createPond, createScenery } from './pond';
import type { Scenery } from './pond';
import type { GameScreen } from './screen';
import { addSoundMenu } from './sound';
import type { Sound } from './sound';
import { buildStage, putUnderWater } from './stage';

/** What the game is wired to before loading starts: the events bus, the sound, and the end-of-level card. */
export interface GameWiring {
  readonly events: GameEventBus;
  readonly sound: Sound;
  readonly result: ResultCard;
}

/**
 * Loads the game behind the loading screen, step by step, and reports the share done: the font, every special koi
 * and the petal menu's pictures of them, the koi, the shore's distance field, the water, the garden, the stones
 * round the pond, then the game built from them, and one frame played unseen so the GPU compiles every shader and
 * takes every texture before the player's first frame. Each step is weighted by about how long it takes (measured
 * in Chrome at phone size; only the ratios matter). Everything is made once, here: nothing is baked during play,
 * and playing again reuses it all.
 */
export async function loadGame(
  app: Application,
  screen: GameScreen,
  wiring: GameWiring,
  onProgress: (done: number) => void,
): Promise<void> {
  const bake = koiBake(screen.layout.board.piece, screen.resolution.art);
  const specials = createSpecialKoi(bake);
  await new BootPipeline()
    .step('fonts', 1, loadFonts)
    .step('goalIcons', 6, () => goalIcons(screen.resolution.art))
    // the special koi before the board's: reading a canvas back (a striped koi's fit, a whirlpool's curl, the
    // pictures) waits for the GPU to finish everything drawn so far, so the less there is, the sooner it's done
    .step('stripedKoi', 44, () => {
      specials.bakeSpecial('line');
    })
    .step('whirlpools', 19, () => {
      specials.bakeSpecial('whirl');
    })
    .step('rainbowKoi', 7, () => {
      specials.bakeSpecial('rainbow');
    })
    .step('petalPictures', 3, () => {
      specials.bakePreviews();
    })
    .step('koi', 15, () => bakeKoi(bake))
    .step('shoreField', 3, () => bakeShore(screen))
    .step('pond', 1, ({ shoreField }) => createPond(app.renderer, screen, shoreField))
    .step('garden', 1, () => createGarden(screen))
    .step('scenery', 1, () => createScenery(screen))
    .step('game', 2, (made) => {
      assembleGame(app, screen, { ...made, specialKoi: specials }, wiring);
    })
    // the GPU draws the koi's canvases as they're first uploaded, here
    .step('firstFrame', 85, () => {
      app.ticker.update();
    })
    .run(onProgress);
}

/** The art and the pond the game is put together from. */
interface Loaded {
  readonly goalIcons: GoalIcons;
  readonly koi: KoiTextures;
  readonly specialKoi: SpecialTextures;
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
  const materials = { koi: made.koi, specials: made.specialKoi, pond, hud, result: wiring.result, events };
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

/** Waits for the bundled font's weights the game draws with (a missing one just falls back, it never throws). */
async function loadFonts(): Promise<void> {
  await Promise.all(['700 16px Nunito', '900 16px Nunito'].map((font) => document.fonts.load(font)));
}
