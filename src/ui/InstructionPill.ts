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
  private readonly text = el('span', 'pill__text');
  private closed: (() => void) | null = null;

  constructor(layer: UiLayer, rect: Rect) {
    const close = button('pill__close', 'Cancel booster');
    setIcon(close, CROSS);
    close.addEventListener('click', () => {
      this.closed?.();
    });
    this.root = el('div', 'pill', this.text, close);
    layer.place(this.root, rect);
  }

  /** What the X does. */
  onClose(handler: () => void): void {
    this.closed = handler;
  }

  show(tip: string): void {
    this.text.textContent = tip;
    this.root.classList.add('pill--shown');
  }

  hide(): void {
    this.root.classList.remove('pill--shown');
  }

  nope(): void {
    shake(this.root);
  }
}
