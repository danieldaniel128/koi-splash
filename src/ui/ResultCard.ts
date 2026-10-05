import { RESULT_CARD } from '../config/ui';
import { Timers } from '../core/Timers';
import type { ResultDisplay } from '../game/GameScene';
import type { GameStatus } from '../game/GameStatus';
import type { GoalProgress } from '../model/goals';
import { THEME } from '../theme/theme';
import { GoalChip, goalName, goalPicture } from './GoalTray';
import type { GoalIcons } from './GoalTray';
import { STAR, setIcon } from './icons';
import { button, el, wantsLessMotion } from './UiLayer';

/** What the card shows of the game it ends: the goals' pictures, and how many free boosters are still unused. */
export interface CardGame {
  readonly goalIcons: GoalIcons;
  boostersLeft(): number;
}

/**
 * The end-of-level card over the dimmed pond: won (with the stars earned landing one by one) or out of moves, the
 * score, each goal as the HUD shows it (a missed one in coral) with how far it got, and a button to play again. Out
 * of moves, it says what to try next. It dims the whole screen and its card scales with the stage (--ui-scale).
 *
 * It is a modal dialog: named by its title and described by the score, the goals and the tip, and while it's up the
 * game under it takes no tap or Tab (the screen flow puts the focus on Play again). Display only: whoever owns the
 * level decides what playing again means (onRestart), and what a star landing sounds like (onStarLanded).
 */
export class ResultCard implements ResultDisplay {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly title = el('h2', 'number result__title');
  private readonly stars = [0, 1, 2].map(() => el('span', 'star result__star'));
  private readonly starRow = el('div', 'result__stars', ...this.stars);
  private readonly score = el('span', 'number result__score');
  private readonly total = el('p', 'result__total', this.score, el('span', 'label', 'score'));
  private readonly goals = el('div', 'result__goals');
  private readonly detail = el('p', 'label result__detail');
  private readonly tip = el('p', 'result__tip');
  private readonly again = button('btn', undefined, 'Play again');
  /** The card's own timeouts (its stars landing, its taps opening): cancelled when it closes, so none fires later. */
  private readonly timers = new Timers();
  /** Taps count once the card is fully up, so a last swipe on the board can't press Play again by accident. */
  private takesTaps = false;
  private starLanded: ((k: number) => void) | null = null;
  private game: CardGame | null = null;

  constructor(private readonly host: HTMLElement) {
    for (const star of this.stars) setIcon(star, STAR);
    this.card = el(
      'div',
      'panel result__card',
      this.title,
      this.starRow,
      this.total,
      this.goals,
      this.detail,
      this.tip,
      this.again,
    );
    this.root = el('div', 'result', this.card);
    this.root.hidden = true;
    this.makeDialog();
    host.appendChild(this.root);
  }

  /** The game the card ends, once it's loaded (the card is made before it, for the screen flow). */
  setGame(game: CardGame): void {
    this.game = game;
  }

  /** What Play again does, once the card takes taps. */
  onRestart(handler: () => void): void {
    this.again.addEventListener('click', () => {
      if (this.takesTaps) handler();
    });
  }

  /** Told as each earned star lands on the card (the kth, from 0). */
  onStarLanded(handler: (k: number) => void): void {
    this.starLanded = handler;
  }

  show(outcome: 'won' | 'lost', status: GameStatus): void {
    const won = outcome === 'won';
    this.title.textContent = won ? 'Pond complete!' : 'Out of moves';
    this.score.textContent = status.score.toLocaleString();
    this.showGoals(status.goals);
    this.tip.textContent = won ? '' : this.tipFor(status.goals);
    this.tip.hidden = this.tip.textContent === '';
    this.starRow.hidden = !won;
    this.starRow.setAttribute('aria-label', `${status.stars} of ${this.stars.length} stars`);
    this.root.hidden = false;
    this.holdGame(true);
    this.timers.after(Math.max(RESULT_CARD.fadeIn, RESULT_CARD.popIn), () => {
      this.takesTaps = true;
    });
    if (won) this.landStars(status.stars);
    if (wantsLessMotion()) return;
    this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RESULT_CARD.fadeIn * 1000 });
    this.card.animate([{ scale: 0.8 }, { scale: 1 }], {
      duration: RESULT_CARD.popIn * 1000,
      easing: THEME.ease.back,
    });
  }

  hide(): void {
    this.timers.cancelAll();
    this.takesTaps = false;
    this.root.hidden = true;
    this.goals.replaceChildren(); // the HUD's chips are the only goal chips on the page while the game is played
    this.holdGame(false);
  }

  /** Puts the keyboard focus on the card's button, so Enter plays again. */
  focus(): void {
    this.again.focus();
  }

  /** Each goal as the HUD shows it (a check, or how many were still to go; a missed one in coral), then in words. */
  private showGoals(goals: readonly GoalProgress[]): void {
    const icons = this.game?.goalIcons;
    const chips = icons
      ? goals.map((goal) => {
          const chip = new GoalChip(goal, goalPicture(goal, icons));
          chip.element.classList.toggle('chip--missed', goal.done < goal.target);
          return chip.element;
        })
      : [];
    this.goals.replaceChildren(...chips);
    this.detail.textContent = goals.map(goalLine).join(' · ');
  }

  /** What to try next: a tip for the first goal missed, and the free boosters left unused. */
  private tipFor(goals: readonly GoalProgress[]): string {
    const missed = goals.find((goal) => goal.done < goal.target);
    const tip = missed ? RESULT_CARD.tips[missed.type].replace('{goal}', goalName(missed)) : '';
    const unused = this.game?.boostersLeft() ?? 0;
    const nudge =
      unused === 0
        ? ''
        : unused === 1
          ? RESULT_CARD.unusedBooster
          : RESULT_CARD.unusedBoosters.replace('{n}', `${unused}`);
    return [tip, nudge].filter((line) => line !== '').join(' ');
  }

  /** The card is a modal dialog, named by its title and described by its score, goals and tip. */
  private makeDialog(): void {
    const parts = { title: this.title, total: this.total, detail: this.detail, tip: this.tip };
    for (const [name, part] of Object.entries(parts)) part.id = `result-${name}`;
    this.card.setAttribute('role', 'dialog');
    this.card.setAttribute('aria-modal', 'true');
    this.card.setAttribute('aria-labelledby', this.title.id);
    this.card.setAttribute('aria-describedby', `${this.total.id} ${this.detail.id} ${this.tip.id}`);
    this.starRow.setAttribute('role', 'img');
  }

  /** While the card is up, the rest of the game's element (the board, the HUD, the bar) is inert under it. */
  private holdGame(held: boolean): void {
    for (const part of this.host.children) {
      if (part !== this.root && part instanceof HTMLElement) part.inert = held;
    }
  }

  /** The stars earned light up one after another, each popping in (unless less motion); the rest stay dark. */
  private landStars(earned: number): void {
    this.stars.forEach((star, i) => {
      star.classList.remove('star--lit');
      if (i >= earned) return;
      this.timers.after(RESULT_CARD.firstStar + i * RESULT_CARD.starStep, () => {
        star.classList.add('star--lit');
        this.starLanded?.(i);
        if (wantsLessMotion()) return;
        star.animate([{ transform: 'scale(0.2)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
          duration: RESULT_CARD.starPop * 1000,
          easing: 'ease-out',
        });
      });
    });
  }
}

/** One goal in words, how far it got: "Lotuses 2/3", "Red koi 7/10", "Points 2,400/3,000". */
function goalLine(goal: GoalProgress): string {
  const name = goalName(goal);
  const done = Math.min(goal.done, goal.target).toLocaleString();
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${done}/${goal.target.toLocaleString()}`;
}
