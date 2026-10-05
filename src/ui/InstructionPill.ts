import type { BoosterPill } from '../game/BoosterControl';
import type { Rect } from '../layout/gameLayout';
import { CROSS, setIcon } from './icons';
import type { UiLayer } from './UiLayer';
import { button, el, shake } from './UiLayer';

/**
 * The pill over the pond that says what to do while a booster is armed (after the prototype's), with an X that
 * cancels it. Its text lets taps through to the pond; only the X takes them.
 */
export class InstructionPill implements BoosterPill {
  private readonly root: HTMLElement;
  private readonly text = el('span', 'glass pill__text');
  private closed: (() => void) | null = null;

  constructor(layer: UiLayer, rect: Rect) {
    const close = button('control glass pill__close', 'Cancel booster');
    setIcon(close, CROSS);
    close.addEventListener('click', () => {
      this.closed?.();
    });
    this.root = el('div', 'reveal pill', this.text, close);
    this.setShown(false);
    layer.place(this.root, rect);
  }

  /** What the X does. */
  onClose(handler: () => void): void {
    this.closed = handler;
  }

  show(tip: string): void {
    this.text.textContent = tip;
    this.setShown(true);
  }

  hide(): void {
    this.setShown(false);
  }

  nope(): void {
    shake(this.root);
  }

  /** Hidden, the pill is inert: its X can't be tapped or reached with Tab while it fades away. */
  private setShown(shown: boolean): void {
    this.root.classList.toggle('reveal--shown', shown);
    this.root.inert = !shown;
  }
}
