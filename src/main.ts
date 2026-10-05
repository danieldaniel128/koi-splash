import { createApp } from './boot/app';
import { loadGame } from './boot/loading';
import { measureScreen } from './boot/screen';
import { startSound } from './boot/sound';
import { createGameEvents } from './game/events';
import { ScreenFlow } from './game/ScreenFlow';
import { showBootError } from './ui/BootError';
import { LoadingScreen } from './ui/LoadingScreen';
import { ResultCard } from './ui/ResultCard';
import { RotateNotice } from './ui/RotateNotice';

/** The page the game boots on (index.html): the game's element, and the loading screen over it. */
interface BootPage {
  readonly game: HTMLElement;
  readonly loading: HTMLElement;
}

/** Stops something boot started that would keep running: the app's clock, the sound. */
type Stop = () => void;

/**
 * Composition root: the one place that creates the objects and hands each one what it needs. The game is laid out
 * for the screen, loaded behind the loading screen (src/boot/loading.ts has every step), then its clock starts and
 * the screen flow takes over: the loading screen fades away to the game, and the end card and playing again follow.
 */
async function boot({ game: host, loading }: BootPage, running: Stop[]): Promise<void> {
  const loader = new LoadingScreen(loading, host);
  await new RotateNotice(document.body).upright(); // lay out for the phone held upright
  const app = await createApp(host);
  running.push(() => {
    app.stop();
  });
  const screen = measureScreen(app, host);
  const events = createGameEvents(); // what happens in the game, for whoever listens (the sound)
  const sound = startSound(events);
  running.push(() => {
    sound.stop();
  });
  const card = new ResultCard(host, events);
  const screenFlow = new ScreenFlow({ loader, game: host, card });
  card.onRestart(() => {
    screenFlow.replay();
  });
  await loadGame(app, screen, { events, sound, screenFlow }, (done) => {
    loader.setProgress(done);
  });
  app.start();
  await screenFlow.start();
}

// The error boundary: if anything fails on the way, whatever had started is stopped, so nothing keeps running
// behind the error screen.
const game = document.getElementById('game');
const loading = document.getElementById('loading');
if (game && loading) {
  const page = { game, loading };
  const running: Stop[] = [];
  boot(page, running).catch((error: unknown) => {
    console.error(error);
    for (const stop of running) stop();
    showBootError(page);
  });
}
