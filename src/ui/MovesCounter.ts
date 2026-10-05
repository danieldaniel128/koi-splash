import { LEVEL } from '../config/level';
import { HUD_MOTION } from '../config/ui';
import { bump, el } from './UiLayer';

/** Moves left, big, in a glass orb. It pops each time a move is spent, and warns when only a few are left. */
export class MovesCounter {
  readonly element: HTMLElement;
  private readonly value = el('span', 'number moves__value');
  private shown = 0;

  constructor() {
    this.element = el('div', 'orb moves', this.value, el('span', 'label', 'moves'));
  }

  /** Shows the moves a new level starts with, without the pop. */
  reset(movesLeft: number): void {
    this.show(movesLeft);
  }

  update(movesLeft: number): void {
    if (movesLeft === this.shown) return;
    this.show(movesLeft);
    bump(this.value, HUD_MOTION.movesBump, HUD_MOTION.movesSettle);
  }

  private show(movesLeft: number): void {
    this.shown = movesLeft;
    this.value.textContent = `${movesLeft}`;
    this.element.classList.toggle('moves--low', movesLeft <= LEVEL.movesWarning.low);
    this.element.classList.toggle('moves--last', movesLeft <= LEVEL.movesWarning.last);
  }
}
