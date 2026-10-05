import { THEME } from '../theme/theme';
import { fade } from './UiLayer';

/**
 * The loading screen: the game's name under the moon, and a bar that fills as the game loads. Its markup is in
 * index.html, so it shows from the very first paint, over the game's element, which stays inert and invisible
 * until the game is ready. This class fills the bar, and at the end fades itself away and the game in.
 */
export class LoadingScreen {
  private readonly bar: HTMLElement;
  private readonly fill: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly game: HTMLElement,
  ) {
    this.bar = partOf(root, '.loading__bar');
    this.fill = partOf(root, '.loading__fill');
  }

  /** Fills the bar to this share (0..1) of the loading. */
  setProgress(done: number): void {
    this.fill.style.transform = `scaleX(${done})`;
    this.bar.setAttribute('aria-valuenow', `${Math.round(done * 100)}`);
  }

  /** Fades away to the game, which takes over the page; resolves once the loading screen is gone. */
  async hide(): Promise<void> {
    this.game.inert = false;
    this.root.classList.add('loading--leaving');
    await Promise.all([fade(this.root, 'out', THEME.time.slow), fade(this.game, 'in', THEME.time.slow)]);
    this.root.remove();
  }
}

/** One part of the loading screen's markup in index.html. */
function partOf(root: HTMLElement, selector: string): HTMLElement {
  const part = root.querySelector<HTMLElement>(selector);
  if (!part) throw new Error(`loading screen: ${selector} is missing from index.html`);
  return part;
}
