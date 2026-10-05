import { HUD_MOTION } from '../config/ui';
import type { GoalProgress, GoalType } from '../model/goals';
import { CHECK, STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/** The goals' icons, painted by the game's own painters: the lotus, and a koi of each colour. */
export interface GoalIcons {
  readonly lotus: string;
  readonly koi: readonly string[];
  /** The points a met goal pays: the chip shows them rising out of it. */
  readonly bonus: number;
}

/**
 * The level's goals, one chip each: the goal's icon and how many are still to go (lotuses to bloom, koi of a colour
 * to clear, points to score), ticking down with a pop and turning into a check once that goal is met. The chips are
 * built when a level starts.
 */
export class GoalTray {
  readonly element = el('div', 'goal');
  private readonly row = el('div', 'goal__chips');
  private chips: GoalChip[] = [];

  constructor(private readonly icons: GoalIcons) {
    this.element.append(this.row, el('span', 'label', 'goals'));
  }

  /** A new level: a fresh chip per goal, showing what's to go with no pop. */
  reset(goals: readonly GoalProgress[]): void {
    this.chips = goals.map((goal) => new GoalChip(goal, this.iconFor(goal), this.icons.bonus));
    this.row.replaceChildren(...this.chips.map((chip) => chip.element));
  }

  update(goals: readonly GoalProgress[]): void {
    goals.forEach((goal, i) => this.chips[i]?.update(goal));
  }

  /** The icon of the first goal of this kind (a bloomed lotus flies to the lotus chip), or the first chip's. */
  iconOf(kind: GoalProgress['kind']): HTMLElement {
    const chip = this.chips.find((c) => c.kind === kind) ?? this.chips[0];
    return chip?.icon ?? this.element;
  }

  /** Each goal type's picture (null: a star, for a score goal). One per type: a new goal asks for its icon here. */
  private iconFor(goal: GoalProgress): string | null {
    const icons: Readonly<Record<GoalType, () => string | null>> = {
      lotus: () => this.icons.lotus,
      koi: () => this.icons.koi[goal.koi ?? 0] ?? null,
      score: () => null,
    };
    return icons[goal.kind]();
  }
}

/** One goal's chip. */
class GoalChip {
  readonly element: HTMLElement;
  readonly icon = el('span', 'chip__icon');
  readonly kind: GoalProgress['kind'];
  private readonly count = el('span', 'number chip__count');
  private left: number;

  constructor(
    goal: GoalProgress,
    image: string | null,
    private readonly bonus: number,
  ) {
    this.kind = goal.kind;
    if (image) {
      const picture = el('img', `chip__image chip__image--${goal.kind}`);
      picture.src = image;
      picture.alt = '';
      this.icon.append(picture);
    } else setIcon(this.icon, STAR);
    this.element = el('div', 'chip', this.icon, this.count);
    this.left = leftOf(goal);
    this.show();
  }

  update(goal: GoalProgress): void {
    const left = leftOf(goal);
    if (left === this.left) return;
    this.left = left;
    this.show();
    bump(this.element, HUD_MOTION.goalBump, HUD_MOTION.goalSettle);
    if (left === 0 && this.bonus > 0) this.showBonus();
  }

  private show(): void {
    const done = this.left === 0;
    this.element.classList.toggle('chip--done', done);
    if (done) setIcon(this.count, CHECK);
    else this.count.textContent = `${this.left}`;
  }

  /** The goal's bonus rises out of the chip in gold and fades. */
  private showBonus(): void {
    const label = el('span', 'number chip__bonus', `+${this.bonus}`);
    this.element.append(label);
    const rise = label.animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -18px) scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -34px) scale(1)', opacity: 0 },
      ],
      { duration: HUD_MOTION.bonusRise * 1000, easing: 'ease-out' },
    );
    rise.onfinish = () => {
      label.remove();
    };
  }
}

/** How many a goal still needs. */
function leftOf(goal: GoalProgress): number {
  return Math.max(0, goal.target - goal.done);
}
