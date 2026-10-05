import { RESULT_CARD } from '../config/ui';
import { Timers } from '../core/Timers';
import type { GameStatus } from '../game/GameStatus';
import type { GoalProgress } from '../model/goals';
import { STAR, setIcon } from './icons';
import type { GameEventBus } from '../game/events';
import { el } from './UiLayer';

/**
 * The end-of-level card over the dimmed pond: won (with the stars earned landing one by one) or out of moves, the
 * score and the goal, and a button to play again. It dims the whole screen and its card scales with the stage (--ui-scale). Display only: whoever owns the
 * level decides what playing again means (onRestart).
 */
export class ResultCard {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly title = el('h2', 'number result__title');
  private readonly stars = [0, 1, 2].map(() => el('span', 'result__star'));
  private readonly starRow = el('div', 'result__stars', ...this.stars);
  private readonly score = el('p', 'number result__score');
  private readonly detail = el('p', 'label result__detail');
  private readonly again = el('button', 'btn', 'Play again');
  /** The card's own timeouts (its stars landing, its taps opening): cancelled when it closes, so none fires later. */
  private readonly timers = new Timers();
  /** Taps count once the card is fully up, so a last swipe on the board can't press Play again by accident. */
  private takesTaps = false;

  constructor(
    host: HTMLElement,
    private readonly events: GameEventBus,
  ) {
    for (const star of this.stars) setIcon(star, STAR);
    this.card = el(
      'div',
      'panel result__card',
      this.title,
      this.starRow,
      this.score,
      this.detail,
      this.again,
    );
    this.root = el('div', 'result', this.card);
    this.root.hidden = true;
    host.appendChild(this.root);
  }

  onRestart(handler: () => void): void {
    this.again.addEventListener('click', () => {
      if (!this.takesTaps) return;
      this.events.emit('buttonClicked');
      handler();
    });
  }

  show(outcome: 'won' | 'lost', status: GameStatus): void {
    const won = outcome === 'won';
    this.title.textContent = won ? 'Pond complete!' : 'Out of moves';
    this.score.textContent = `${status.score}`;
    this.detail.textContent = status.goals.map(goalLine).join(' · ');
    this.starRow.hidden = !won;
    this.root.hidden = false;
    this.timers.after(Math.max(RESULT_CARD.fadeIn, RESULT_CARD.popIn), () => {
      this.takesTaps = true;
    });
    if (won) this.landStars(status.stars);
    this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RESULT_CARD.fadeIn * 1000 });
    this.card.animate([{ scale: 0.8 }, { scale: 1 }], {
      duration: RESULT_CARD.popIn * 1000,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
  }

  hide(): void {
    this.timers.cancelAll();
    this.takesTaps = false;
    this.root.hidden = true;
  }

  /** The stars earned light up one after another, each popping in; the rest stay dark. */
  private landStars(earned: number): void {
    this.stars.forEach((star, i) => {
      star.classList.remove('result__star--lit');
      if (i >= earned) return;
      this.timers.after(RESULT_CARD.firstStar + i * RESULT_CARD.starStep, () => {
        star.classList.add('result__star--lit');
        this.events.emit('starLanded', { k: i });
        star.animate([{ transform: 'scale(0.2)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
          duration: RESULT_CARD.starPop * 1000,
          easing: 'ease-out',
        });
      });
    });
  }
}

/** One goal on the card: how far it got. */
function goalLine(goal: GoalProgress): string {
  if (goal.kind === 'score') return `goal ${goal.target}`;
  return `${goal.kind === 'lotus' ? 'lotus' : 'koi'} ${goal.done} / ${goal.target}`;
}
