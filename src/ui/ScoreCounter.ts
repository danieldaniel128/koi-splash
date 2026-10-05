import { gsap } from 'gsap';
import { HUD_MOTION } from '../config/ui';
import { bump, el } from './UiLayer';

/**
 * The score, captioned under it like every HUD counter: it counts up to each new value and swells while it does.
 * Points still flying to it (big gains) are held back until they land, so the number climbs as they arrive.
 */
export class ScoreCounter {
  readonly element: HTMLElement;
  /** The number itself: the points from a match fly here. */
  readonly value = el('span', 'number score__value', '0');
  private readonly shown = { score: 0 };
  private target = 0;
  private flying = 0;

  constructor() {
    this.element = el('div', 'score', this.value, el('span', 'label score__label', 'score'));
  }

  update(score: number): void {
    if (score === this.target) return;
    this.target = score;
    this.countUp();
  }

  /** Points are on their way here: they're held back until they land. */
  hold(amount: number): void {
    this.flying += amount;
  }

  /** Held points landed: the score takes them, with a swell. */
  land(amount: number): void {
    this.flying = Math.max(0, this.flying - amount);
    this.countUp();
  }

  /** Shows this score at once, with no count up (a new level). */
  reset(score: number): void {
    gsap.killTweensOf(this.shown);
    this.shown.score = score;
    this.target = score;
    this.flying = 0;
    this.value.textContent = `${score}`;
  }

  private countUp(): void {
    const score = this.target - this.flying;
    if (score <= this.shown.score) return;
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
}
