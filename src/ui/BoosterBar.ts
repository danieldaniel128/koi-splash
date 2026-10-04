import type { Rect } from '../layout/gameLayout';
import { BOOSTER_ICONS } from './icons';
import type { BoosterIcon } from './icons';
import type { UiLayer } from './UiLayer';
import { bump, el } from './UiLayer';

/** One booster on the bar: its icon, its name and how many the player has. */
export interface BoosterSlot {
  readonly icon: BoosterIcon;
  readonly name: string;
  readonly count: number;
}

/**
 * The booster bar under the pond: a round glass button per booster, with its count on a gold badge and its name
 * under it. The boosters themselves come later; until then a tap says so instead of doing nothing.
 */
export class BoosterBar {
  private readonly toast = el('div', 'toast', 'Coming soon');
  private hideToast = 0;

  constructor(layer: UiLayer, rect: Rect, slots: readonly BoosterSlot[]) {
    const buttons = slots.map((slot) => this.button(slot));
    layer.place(el('div', 'boosters', ...buttons, this.toast), rect);
  }

  private button(slot: BoosterSlot): HTMLButtonElement {
    const orb = el('span', 'orb booster__orb');
    orb.innerHTML = BOOSTER_ICONS[slot.icon]; // a fixed string from icons.ts
    const button = el(
      'button',
      'booster',
      orb,
      el('b', 'badge', `${slot.count}`),
      el('span', 'label booster__name', slot.name),
    );
    button.type = 'button';
    button.setAttribute('aria-label', `${slot.name} booster (coming soon)`);
    button.addEventListener('click', () => {
      bump(orb, 0.88, 0.3);
      this.showToast();
    });
    return button;
  }

  private showToast(): void {
    this.toast.classList.add('toast--shown');
    window.clearTimeout(this.hideToast);
    this.hideToast = window.setTimeout(() => {
      this.toast.classList.remove('toast--shown');
    }, TOAST_TIME);
  }
}

/** How long the toast stays up (ms). */
const TOAST_TIME = 1200;
