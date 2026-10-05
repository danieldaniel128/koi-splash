import { HUD_MOTION } from '../config/ui';
import type { StarRule } from '../model/stars';
import { STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/**
 * The star bar: the score filling up toward the third star, with each star sitting at the score that earns it. A
 * star lights up with a pop as the score passes it (see starsFor).
 */
export class StarBar {
  readonly element: HTMLElement;
  private readonly fill = el('span', 'stars__fill');
  private readonly stars: HTMLElement[];
  private readonly top: number;
  private lit = 0;

  constructor(rule: StarRule) {
    this.top = rule.scores[2];
    this.stars = rule.scores.map((needed) => {
      const star = el('span', 'stars__star');
      setIcon(star, STAR);
      star.style.left = `${(needed / this.top) * 100}%`;
      return star;
    });
    this.element = el('div', 'stars', el('span', 'track stars__track', this.fill), ...this.stars);
  }

  /** Shows a new level's score and stars at once, with no pop. */
  reset(score: number, stars: number): void {
    this.show(score, stars);
  }

  update(score: number, stars: number): void {
    const earned = stars > this.lit ? this.stars.slice(this.lit, stars) : [];
    this.show(score, stars);
    for (const star of earned) bump(star, HUD_MOTION.starEarned, HUD_MOTION.goalSettle);
  }

  private show(score: number, stars: number): void {
    this.fill.style.width = `${Math.min(1, score / this.top) * 100}%`;
    this.lit = stars;
    this.stars.forEach((star, i) => star.classList.toggle('stars__star--lit', i < stars));
  }
}
