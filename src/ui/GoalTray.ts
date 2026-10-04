import { GOAL_TRAY, HUD_MOTION } from '../config/ui';
import type { GoalProgress } from '../model/goals';
import { bump, el } from './UiLayer';

/**
 * The level's goal. A lotus goal shows one slot per lotus that fills as each one blooms (or a count, for a big
 * goal); a score goal shows a bar filling toward the target. Rebuilt only when the goal itself changes.
 */
export class GoalTray {
  readonly element = el('div', 'goal');
  private slots: HTMLImageElement[] = [];
  private count: HTMLElement | null = null;
  private bar: HTMLElement | null = null;
  private shape = '';
  private done = 0;

  constructor(private readonly lotusIcon: string) {}

  update(goal: GoalProgress): void {
    const shape = `${goal.kind}:${goal.target}`;
    if (shape !== this.shape) this.build(goal, shape);
    else if (goal.done < this.done) this.build(goal, shape); // a restart
    this.show(goal);
  }

  private show(goal: GoalProgress): void {
    if (this.bar) this.bar.style.width = `${Math.min(1, goal.done / goal.target) * 100}%`;
    if (this.count) this.count.textContent = `${goal.done} / ${goal.target}`;
    this.slots.forEach((slot, i) => {
      const filled = i < goal.done;
      if (filled && slot.classList.contains('goal__slot--empty')) {
        slot.classList.remove('goal__slot--empty');
        bump(slot, HUD_MOTION.slotBump, HUD_MOTION.slotSettle);
      }
    });
    this.done = goal.done;
  }

  private build(goal: GoalProgress, shape: string): void {
    this.shape = shape;
    this.done = 0;
    this.slots = [];
    this.count = null;
    this.bar = null;
    if (goal.kind === 'score') {
      this.bar = el('span', 'goal__fill');
      this.element.replaceChildren(el('span', 'track', this.bar), el('span', 'label', `goal ${goal.target}`));
    } else if (goal.target <= GOAL_TRAY.maxSlots) {
      this.slots = Array.from({ length: goal.target }, () => this.lotus('goal__slot goal__slot--empty'));
      this.element.replaceChildren(el('span', 'goal__slots', ...this.slots), el('span', 'label', 'lotus'));
    } else {
      this.count = el('span', 'number goal__count');
      this.element.replaceChildren(
        el('span', 'goal__slots', this.lotus('goal__slot'), this.count),
        el('span', 'label', 'lotus'),
      );
    }
  }

  private lotus(className: string): HTMLImageElement {
    const image = el('img', className);
    image.src = this.lotusIcon;
    image.alt = '';
    return image;
  }
}
