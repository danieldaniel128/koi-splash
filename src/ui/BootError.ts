import { el } from './UiLayer';

/** What the error screen says when nothing more is known. */
const SOMETHING_WENT_WRONG = 'Something went wrong while the pond was filling. Reloading usually helps.';

/** A failure the player can be told about in plain words: its message is what the error screen says. */
export class BootFailure extends Error {}

/** The failures boot knows by name, in the words the error screen uses. */
export const BOOT_FAILURES = {
  noWebGl2:
    "This browser can't draw the pond: it needs WebGL 2. An up-to-date Chrome, Safari or Firefox has it.",
  gpuLost: "The graphics card stopped drawing the pond and didn't come back. Reloading usually helps.",
} as const;

/**
 * The screen shown when the game can't start: what happened, in a sentence, and a button that reloads the page. It
 * takes the place of the loading screen and of whatever the game had put on the page so far.
 */
export function showBootError(
  page: { readonly game: HTMLElement; readonly loading: HTMLElement },
  why: string = SOMETHING_WENT_WRONG,
): void {
  page.loading.remove();
  page.game.replaceChildren();
  const reload = el('button', 'btn', 'Reload');
  reload.type = 'button';
  reload.addEventListener('click', () => {
    window.location.reload();
  });
  const card = el(
    'div',
    'panel boot-error__card',
    el('h1', 'number boot-error__title', 'Koi Splash could not start'),
    el('p', 'label boot-error__text', why),
    reload,
  );
  const screen = el('div', 'boot-error', card);
  screen.setAttribute('role', 'alert');
  document.body.append(screen);
  reload.focus();
}
