import { gsap } from 'gsap';
import { HUD_MOTION } from '../config/ui';
import { bump, el } from './UiLayer';

/** The score: it counts up to each new value and swells while it does. */
export class ScoreCounter {
  readonly element: HTMLElement;
  /** The number itself: the points from a match fly here. */
  readonly value = el('span', 'number score__value', '0');
  private readonly shown = { score: 0 };
  private target = 0;

  constructor() {
    this.element = el('div', 'score', this.value, el('span', 'label', 'score'));
  }

  update(score: number): void {
    if (score === this.target) return;
    this.target = score;
    gsap.to(this.shown, {
      score,
      duration: HUD_MOTION.countUp,
      ease: 'power1.out',
      onUpdate: () => {
        this.value.textContent = `${Math.round(this.shown.score)}`;
      },
    });
    bump(this.value, HUD_MOTION.scoreBump, HUD_MOTION.countUp);
  }

  reset(): void {
    gsap.killTweensOf(this.shown);
    this.shown.score = 0;
    this.target = 0;
    this.value.textContent = '0';
  }
}
