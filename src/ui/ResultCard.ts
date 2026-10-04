import { RESULT_CARD } from '../config/ui';
import type { GameStatus } from '../game/GameStatus';
import { el } from './UiLayer';

/**
 * The end-of-level card over the dimmed pond: won or out of moves, the goal and the score, and a button to play
 * again. It dims the whole screen and its card scales with the stage (--ui-scale). Display only: whoever owns the
 * level decides what playing again means (onRestart).
 */
export class ResultCard {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly title = el('h2', 'number result__title');
  private readonly detail = el('p', 'result__detail');
  private readonly again = el('button', 'btn', 'Play again');

  constructor(host: HTMLElement) {
    this.card = el('div', 'panel result__card', this.title, this.detail, this.again);
    this.root = el('div', 'result', this.card);
    this.root.hidden = true;
    host.appendChild(this.root);
  }

  onRestart(handler: () => void): void {
    this.again.addEventListener('click', handler);
  }

  show(outcome: 'won' | 'lost', status: GameStatus): void {
    this.title.textContent = outcome === 'won' ? 'Pond complete!' : 'Out of moves';
    const { goal } = status;
    this.detail.textContent =
      goal.kind === 'lotus'
        ? `Lotus ${goal.done} / ${goal.target} · Score ${status.score}`
        : `Score ${status.score} / ${goal.target}`;
    this.root.hidden = false;
    this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RESULT_CARD.fadeIn * 1000 });
    this.card.animate([{ scale: 0.8 }, { scale: 1 }], {
      duration: RESULT_CARD.popIn * 1000,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
  }

  hide(): void {
    this.root.hidden = true;
  }
}
