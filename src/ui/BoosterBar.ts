import type { BoosterButtons } from '../game/BoosterControl';
import type { Rect } from '../layout/gameLayout';
import type { BoosterType } from '../model/boosters';
import { BOOSTER_ICONS, CHECK, setIcon } from './icons';
import type { UiLayer } from './UiLayer';
import { bump, el } from './UiLayer';

/** One booster on the bar: which, its name, how many the level gives, and what the pill says while it's armed. */
export interface BoosterSlot {
  readonly type: BoosterType;
  readonly name: string;
  readonly count: number;
  readonly tip: string;
}

/** One button's parts. */
interface Button {
  readonly element: HTMLButtonElement;
  readonly orb: HTMLElement;
  readonly badge: HTMLElement;
}

/**
 * The booster bar under the pond (after the prototype's): a round glass button per booster with its count on a gold
 * badge and its name under it. The armed one lifts and glows; a spent one dims, its badge gone and a check in its orb;
 * a press it can't take shakes it. Presses go to the handler given to onPress.
 */
export class BoosterBar implements BoosterButtons {
  private readonly buttons = new Map<BoosterType, Button>();
  private pressed: ((type: BoosterType) => void) | null = null;

  constructor(layer: UiLayer, rect: Rect, slots: readonly BoosterSlot[]) {
    const elements = slots.map((slot) => this.button(slot).element);
    layer.place(el('div', 'boosters', ...elements), rect);
  }

  /** Where the presses go. */
  onPress(handler: (type: BoosterType) => void): void {
    this.pressed = handler;
  }

  /** A booster's button, for things that start there (the feed's pellets). */
  buttonOf(type: BoosterType): HTMLElement | null {
    return this.buttons.get(type)?.orb ?? null;
  }

  setArmed(type: BoosterType | null): void {
    for (const [key, button] of this.buttons) button.element.classList.toggle('booster--armed', key === type);
  }

  setLeft(type: BoosterType, left: number): void {
    const button = this.buttons.get(type);
    if (!button) return;
    const spent = left <= 0;
    const wasSpent = button.element.classList.contains('booster--used');
    button.element.classList.toggle('booster--used', spent);
    button.badge.textContent = `${left}`;
    if (spent && !wasSpent) bump(button.orb, 0.85, 0.35);
  }

  nope(type: BoosterType): void {
    this.buttons
      .get(type)
      ?.element.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-2px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 340, easing: 'ease-out' },
      );
  }

  private button(slot: BoosterSlot): Button {
    const orb = el('span', 'orb booster__orb');
    orb.innerHTML = BOOSTER_ICONS[slot.type]; // a fixed string from icons.ts
    const check = el('span', 'booster__check');
    setIcon(check, CHECK);
    orb.append(check);
    const badge = el('b', 'badge', `${slot.count}`);
    const element = el('button', 'booster', orb, badge, el('span', 'label booster__name', slot.name));
    element.type = 'button';
    element.setAttribute('aria-label', `${slot.name} booster: ${slot.tip}`);
    element.addEventListener('click', () => {
      bump(orb, 0.9, 0.3);
      this.pressed?.(slot.type);
    });
    const button = { element, orb, badge };
    this.buttons.set(slot.type, button);
    return button;
  }
}
