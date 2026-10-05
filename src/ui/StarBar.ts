import { HUD_MOTION } from '../config/ui';
import type { StarRule } from '../model/stars';
import { THEME } from '../theme/theme';
import { STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/**
 * The star bar: the score filling up toward the third star, with each star sitting at the score that earns it. A
 * star lights up with a pop as the gold fill reaches it (see starsFor).
 */
export class StarBar {
  readonly element: HTMLElement;
  private readonly fill = el('span', 'stars__fill');
  private readonly stars: HTMLElement[];
  /** Where each star sits along the bar (0..1). */
  private readonly places: number[];
  private readonly top: number;
  private lit = 0;

  constructor(rule: StarRule) {
    this.top = rule.scores[2];
    this.places = rule.scores.map((needed) => needed / this.top);
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

  /** The score climbs: the fill grows, and each star it earns lights up as the fill reaches it. */
  update(score: number, stars: number): void {
    const before = this.lit;
    this.show(score, Math.min(before, stars));
    this.lit = stars;
    for (let i = before; i < stars; i++) this.lightWhenReached(i);
  }

  private show(score: number, stars: number): void {
    this.fill.style.width = `${Math.min(1, score / this.top) * 100}%`;
    this.lit = stars;
    this.stars.forEach((star, i) => star.classList.toggle('stars__star--lit', i < stars));
  }

  /**
   * Lights star `i` with a pop once the fill (a CSS transition over THEME.time.slow) has grown past it, checked frame
   * by frame, and at the end of the transition at the latest.
   */
  private lightWhenReached(i: number): void {
    const star = this.stars[i];
    const track = this.fill.parentElement;
    if (!star || !track) return;
    const latest = performance.now() + THEME.time.slow * 1000;
    const check = (): void => {
      if (this.lit <= i) return; // the level started over meanwhile
      const reached = this.fill.offsetWidth >= track.offsetWidth * (this.places[i] ?? 1) - 1;
      if (!reached && performance.now() < latest) {
        requestAnimationFrame(check);
        return;
      }
      star.classList.add('stars__star--lit');
      bump(star, HUD_MOTION.starEarned, HUD_MOTION.goalSettle);
    };
    requestAnimationFrame(check);
  }
}
