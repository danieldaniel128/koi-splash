import { BAR_MOTION } from '../config/ui';
import type { BoosterButtons } from '../game/BoosterControl';
import type { Rect } from '../layout/gameLayout';
import type { BoosterSlot, BoosterType } from '../model/boosters';
import { BOOSTER_ICONS, setIcon } from './icons';
import type { UiLayer } from './UiLayer';
import { bump, button, el, shake } from './UiLayer';

/** One button's parts, and what a screen reader calls it. */
interface Button {
  readonly element: HTMLButtonElement;
  readonly orb: HTMLElement;
  readonly badge: HTMLElement;
  readonly label: string;
}

/**
 * The booster bar under the pond (after the prototype's): a round glass button per booster with its count on a gold
 * badge and its name under it. The armed one lifts and glows; a spent one dims to grey with its badge at 0 (a check is
 * kept for a goal met); a press it can't take shakes it. Presses go to the handler given to onPress.
 */
export class BoosterBar implements BoosterButtons {
  private readonly buttons = new Map<BoosterType, Button>();
  /** How many of each booster the bar shows left. */
  private readonly left = new Map<BoosterType, number>();
  private pressed: ((type: BoosterType) => void) | null = null;

  constructor(layer: UiLayer, rect: Rect, slots: readonly BoosterSlot[]) {
    const elements = slots.map((slot) => this.makeButton(slot).element);
    layer.place(el('div', 'boosters', ...elements), rect);
  }

  /** Where the presses go. */
  onPress(handler: (type: BoosterType) => void): void {
    this.pressed = handler;
  }

  /** How many boosters in all are still there to use (the end card mentions them). */
  unused(): number {
    return [...this.left.values()].reduce((sum, left) => sum + Math.max(0, left), 0);
  }

  /** A booster's button, for things that start there (the feed's pellets). */
  buttonOf(type: BoosterType): HTMLElement | null {
    return this.buttons.get(type)?.orb ?? null;
  }

  setArmed(type: BoosterType | null): void {
    for (const [key, button] of this.buttons) {
      button.element.classList.toggle('booster--armed', key === type);
      button.element.setAttribute('aria-pressed', `${key === type}`);
    }
  }

  setLeft(type: BoosterType, left: number): void {
    const button = this.buttons.get(type);
    if (!button) return;
    this.left.set(type, left);
    const spent = left <= 0;
    const wasSpent = button.element.classList.contains('booster--used');
    button.element.classList.toggle('booster--used', spent);
    button.element.setAttribute('aria-label', `${button.label}, ${spent ? 'used' : `${left} left`}`);
    button.badge.textContent = `${left}`;
    if (spent && !wasSpent) bump(button.orb, BAR_MOTION.spentBump, BAR_MOTION.spentSettle);
  }

  nope(type: BoosterType): void {
    const refused = this.buttons.get(type);
    if (refused) shake(refused.element);
  }

  private makeButton(slot: BoosterSlot): Button {
    const orb = el('span', 'orb booster__orb');
    setIcon(orb, BOOSTER_ICONS[slot.type]);
    const badge = el('b', 'badge booster__badge', `${slot.count}`);
    const name = el('span', 'label booster__name', slot.name);
    const label = `${slot.name} booster: ${slot.tip}`;
    const element = button('control pressable booster', `${label}, ${slot.count} left`, orb, badge, name);
    element.setAttribute('aria-pressed', 'false');
    element.addEventListener('click', () => {
      bump(orb, BAR_MOTION.pressBump, BAR_MOTION.pressSettle);
      this.pressed?.(slot.type);
    });
    const parts = { element, orb, badge, label };
    this.buttons.set(slot.type, parts);
    this.left.set(slot.type, slot.count);
    return parts;
  }
}
