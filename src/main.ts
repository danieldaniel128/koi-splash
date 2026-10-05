import { createApp, keepFitted, restoreAfterContextLoss } from './boot/app';
import { addFrameLoop } from './boot/frameLoop';
import { createGame } from './boot/game';
import { bakeKoi, bakeSpecialKoi, goalIcons, koiBake } from './boot/koi';
import { createGarden, createPond, createScenery } from './boot/pond';
import { measureScreen } from './boot/screen';
import { startSound } from './boot/sound';
import { buildStage, putUnderWater } from './boot/stage';
import { LEVEL } from './config/level';
import { createGameEvents } from './game/events';
import { closeOnEscape } from './ui/escapeKey';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { ResultCard } from './ui/ResultCard';
import { RotateNotice } from './ui/RotateNotice';

/** The page the game boots on (index.html): the game's element, and the loading screen over it. */
interface BootPage {
  readonly game: HTMLElement;
  readonly loading: HTMLElement;
}

/**
 * Composition root: the one place that creates the objects and hands each one what it needs, in the order the
 * game is put together, behind the loading screen. Each area is built in its own module under src/boot.
 */
async function boot({ game: host, loading }: BootPage): Promise<void> {
  const loader = new LoadingScreen(loading, host);
  await loadFonts(); // the Pixi labels are drawn once with whatever font is ready, so make sure it's Nunito
  await new RotateNotice(document.body).upright(); // lay out for the phone held upright
  const app = await createApp(host);
  const screen = measureScreen(app, host);
  const { layout } = screen;
  const hud = new Hud(screen.ui, layout.hud, {
    goalIcons: goalIcons(screen.resolution.art),
    stars: LEVEL.stars,
  });
  const events = createGameEvents(); // what happens in the game, for whoever listens (the sound)
  const sound = startSound(events, screen);

  const bake = koiBake(layout.board.piece, screen.resolution.art);
  const koi = bakeKoi(bake); // the koi, baked once at the screen's resolution
  const specials = bakeSpecialKoi(bake);
  const pond = createPond(app.renderer, screen);
  restoreAfterContextLoss(app, pond);
  const result = new ResultCard(host, events);
  const { parts: game, control } = createGame(
    screen,
    { koi, specials, pond, hud, result, events },
    app.canvas,
  );
  closeOnEscape(document, [() => sound.menu.close(), () => control.back()]); // the top one open closes first

  const koiLife = putUnderWater(game.boardView, pond, layout.board);
  const scenery = createScenery(screen);
  const stage = buildStage(game, { garden: createGarden(screen), scenery: scenery.layer });
  app.stage.addChild(stage);
  keepFitted(app, { stage, ui: screen.ui }, layout.stage, game);
  addFrameLoop(app.ticker, {
    soundtrack: sound.soundtrack,
    pond,
    pads: game.pads,
    marks: game.boosters.marks,
    koiLife,
    fireflies: scenery.fireflies,
    boardView: game.boardView,
  });
  loader.setProgress(1);
  await loader.hide();
}

/** Waits for the bundled font's weights the game draws with (a missing one just falls back, it never throws). */
async function loadFonts(): Promise<void> {
  await Promise.all(['700 16px Nunito', '900 16px Nunito'].map((font) => document.fonts.load(font)));
}

function showBootError({ game, loading }: BootPage, error: unknown): void {
  console.error(error);
  loading.remove();
  game.inert = false;
  game.textContent = 'Koi Splash could not start. Please reload the page.';
  game.classList.add('boot-error');
}

const game = document.getElementById('game');
const loading = document.getElementById('loading');
if (game && loading) {
  const page = { game, loading };
  boot(page).catch((error: unknown) => {
    showBootError(page, error);
  });
}
