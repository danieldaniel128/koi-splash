import { HUD_MOTION } from '../config/ui';
import type { GoalProgress } from '../model/goals';
import { CHECK, STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/**
 * The level's goal as a chip: its icon and how many are still to go (lotuses to bloom, or points to score), which
 * ticks down with a pop and turns into a check once the goal is met.
 */
export class GoalTray {
  readonly element = el('div', 'goal');
  /** The goal's icon: a bloomed lotus flies here. */
  readonly icon = el('span', 'chip__icon');
  private readonly count = el('span', 'number chip__count');
  private readonly chip = el('div', 'chip', this.icon, this.count);
  private kind = '';
  private left = -1;

  constructor(private readonly lotusIcon: string) {
    this.element.append(this.chip, el('span', 'label', 'goal'));
  }

  update(goal: GoalProgress): void {
    if (goal.kind !== this.kind) this.showKind(goal.kind);
    const left = Math.max(0, goal.target - goal.done);
    if (left === this.left) return;
    const first = this.left < 0 || left > this.left; // the first show, or a restart
    this.left = left;
    const done = left === 0;
    this.chip.classList.toggle('chip--done', done);
    if (done) setIcon(this.count, CHECK);
    else this.count.textContent = `${left}`;
    if (!first) bump(this.chip, HUD_MOTION.goalBump, HUD_MOTION.goalSettle);
  }

  private showKind(kind: GoalProgress['kind']): void {
    this.kind = kind;
    this.left = -1;
    if (kind === 'lotus') {
      const image = el('img', 'chip__image');
      image.src = this.lotusIcon;
      image.alt = '';
      this.icon.replaceChildren(image);
    } else setIcon(this.icon, STAR);
  }
}
