import { HUD_MOTION } from '../config/ui';
import type { GoalProgress } from '../model/goals';
import { CHECK, STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/** The goals' icons, painted by the game's own painters: the lotus, and a koi of each colour. */
export interface GoalIcons {
  readonly lotus: string;
  readonly koi: readonly string[];
}

/**
 * The level's goals, one chip each: the goal's icon and how many are still to go (lotuses to bloom, koi of a colour
 * to clear, points to score), ticking down with a pop and turning into a check once that goal is met. The chips are
 * rebuilt only when the goals themselves change.
 */
export class GoalTray {
  readonly element = el('div', 'goal');
  private readonly row = el('div', 'goal__chips');
  private chips: GoalChip[] = [];
  private shape = '';

  constructor(private readonly icons: GoalIcons) {
    this.element.append(this.row, el('span', 'label', 'goals'));
  }

  update(goals: readonly GoalProgress[]): void {
    const shape = goals.map((goal) => `${goal.kind}${goal.koi ?? ''}:${goal.target}`).join(',');
    if (shape !== this.shape) this.build(goals, shape);
    goals.forEach((goal, i) => this.chips[i]?.update(goal));
  }

  /** The icon of the first goal of this kind (a bloomed lotus flies to the lotus chip), or the first chip's. */
  iconOf(kind: GoalProgress['kind']): HTMLElement {
    const chip = this.chips.find((c) => c.kind === kind) ?? this.chips[0];
    return chip?.icon ?? this.element;
  }

  private build(goals: readonly GoalProgress[], shape: string): void {
    this.shape = shape;
    this.chips = goals.map((goal) => new GoalChip(goal, this.iconFor(goal)));
    this.row.replaceChildren(...this.chips.map((chip) => chip.element));
  }

  private iconFor(goal: GoalProgress): string | null {
    if (goal.kind === 'lotus') return this.icons.lotus;
    if (goal.kind === 'koi') return this.icons.koi[goal.koi ?? 0] ?? null;
    return null; // a score goal shows a star
  }
}

/** One goal's chip. */
class GoalChip {
  readonly element: HTMLElement;
  readonly icon = el('span', 'chip__icon');
  readonly kind: GoalProgress['kind'];
  private readonly count = el('span', 'number chip__count');
  private left = -1;

  constructor(goal: GoalProgress, image: string | null) {
    this.kind = goal.kind;
    if (image) {
      const picture = el('img', `chip__image chip__image--${goal.kind}`);
      picture.src = image;
      picture.alt = '';
      this.icon.append(picture);
    } else setIcon(this.icon, STAR);
    this.element = el('div', 'chip', this.icon, this.count);
  }

  update(goal: GoalProgress): void {
    const left = Math.max(0, goal.target - goal.done);
    if (left === this.left) return;
    const first = this.left < 0 || left > this.left; // the first show, or a restart
    this.left = left;
    const done = left === 0;
    this.element.classList.toggle('chip--done', done);
    if (done) setIcon(this.count, CHECK);
    else this.count.textContent = `${left}`;
    if (!first) bump(this.element, HUD_MOTION.goalBump, HUD_MOTION.goalSettle);
  }
}
