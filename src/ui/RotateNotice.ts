import { PORTRAIT_LOCK } from '../config/ui';
import { el } from './UiLayer';

/**
 * The game is portrait only on phones: turned sideways, a notice asks to turn it back. Desktop windows are wide
 * and fine (the layout centres the pond). Resolves `upright` once the phone is held upright, so the game can wait
 * for that before laying itself out.
 */
export class RotateNotice {
  private readonly sideways = window.matchMedia(PORTRAIT_LOCK.sidewaysPhone);
  private readonly root = el(
    'div',
    'rotate',
    el('div', 'rotate__phone'),
    el('p', 'label', 'Turn your phone upright'),
  );

  constructor(host: HTMLElement) {
    host.appendChild(this.root);
    this.show();
    this.sideways.addEventListener('change', () => {
      this.show();
    });
  }

  /** Resolves now if the phone is upright (or this is a desktop), otherwise once it is turned upright. */
  upright(): Promise<void> {
    if (!this.sideways.matches) return Promise.resolve();
    return new Promise((resolve) => {
      const turned = (): void => {
        if (this.sideways.matches) return;
        this.sideways.removeEventListener('change', turned);
        resolve();
      };
      this.sideways.addEventListener('change', turned);
    });
  }

  private show(): void {
    this.root.hidden = !this.sideways.matches;
  }
}
