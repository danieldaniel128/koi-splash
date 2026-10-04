import { HUD_MOTION } from '../config/ui';
import { bump, el } from './UiLayer';

/** Moves left, in a water drop. It pops each time a move is spent. */
export class MovesCounter {
  readonly element: HTMLElement;
  private readonly value = el('span', 'number moves__value');
  private shown = -1;

  constructor() {
    this.element = el('div', 'drop moves', this.value, el('span', 'label', 'moves'));
  }

  update(movesLeft: number): void {
    if (movesLeft === this.shown) return;
    const first = this.shown < 0;
    this.shown = movesLeft;
    this.value.textContent = `${movesLeft}`;
    if (!first) bump(this.value, HUD_MOTION.movesBump, HUD_MOTION.movesSettle);
  }
}
