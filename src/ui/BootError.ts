import { el } from './UiLayer';

/**
 * The screen shown when the game can't start: what happened, in a sentence, and a button that reloads the page. It
 * takes the place of the loading screen and of whatever the game had put on the page so far.
 */
export function showBootError(page: { readonly game: HTMLElement; readonly loading: HTMLElement }): void {
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
    el(
      'p',
      'label boot-error__text',
      'Something went wrong while the pond was filling. Reloading usually helps.',
    ),
    reload,
  );
  const screen = el('div', 'boot-error', card);
  screen.setAttribute('role', 'alert');
  document.body.append(screen);
  reload.focus();
}
