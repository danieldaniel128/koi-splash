import { LEVEL } from '../config/level';
import { HUD_MOTION } from '../config/ui';
import { bump, el } from './UiLayer';

/**
 * Moves left, big, in a glass orb. It pops each time a move is spent, and warns when only a few are left, unless
 * every goal is met already (the moves left are a victory lap).
 */
export class MovesCounter {
  readonly element: HTMLElement;
  private readonly value = el('span', 'number moves__value');
  private shown = 0;

  constructor() {
    this.element = el('div', 'orb moves', this.value, el('span', 'label', 'moves'));
  }

  /** Shows the moves a new level starts with, without the pop. */
  reset(movesLeft: number): void {
    this.show(movesLeft, false);
  }

  /** Shows the moves left; once every goal is met (`goalsMet`) the moves left are a victory lap: no warning. */
  update(movesLeft: number, goalsMet: boolean): void {
    if (movesLeft === this.shown) {
      this.warn(movesLeft, goalsMet);
      return;
    }
    this.show(movesLeft, goalsMet);
    bump(this.value, HUD_MOTION.movesBump, HUD_MOTION.movesSettle);
  }

  private show(movesLeft: number, goalsMet: boolean): void {
    this.shown = movesLeft;
    this.value.textContent = `${movesLeft}`;
    this.warn(movesLeft, goalsMet);
  }

  /** Warns when only a few moves are left, unless every goal is met. */
  private warn(movesLeft: number, goalsMet: boolean): void {
    this.element.classList.toggle('moves--low', !goalsMet && movesLeft <= LEVEL.movesWarning.low);
    this.element.classList.toggle('moves--last', !goalsMet && movesLeft <= LEVEL.movesWarning.last);
  }
}
