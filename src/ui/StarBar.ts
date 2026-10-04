import { HUD_MOTION } from '../config/ui';
import type { StarRule } from '../model/stars';
import { STAR, setIcon } from './icons';
import { bump, el } from './UiLayer';

/**
 * The star bar: how many of the level's moves are left, with the three stars of the win rating sitting where they
 * are lost (see starsFor). A star stays lit while a win would still earn it; it dims as the moves run past it. The
 * bar is a meter, not a ruler: each star gets a third of it (see starMeter), so they sit evenly however the rule is
 * tuned, and the exact count is in the moves orb.
 */
export class StarBar {
  readonly element: HTMLElement;
  private readonly fill = el('span', 'stars__fill');
  private readonly stars: HTMLElement[];
  private lit = -1;

  constructor(private readonly rule: StarRule) {
    // star 1 is always in reach (it's for winning at all), stars 2 and 3 sit where they are lost
    this.stars = [STAR_ONE_AT, starMeter(rule.two, rule), starMeter(rule.three, rule)].map((at) => {
      const star = el('span', 'stars__star');
      setIcon(star, STAR);
      star.style.left = `${at * 100}%`;
      return star;
    });
    this.element = el('div', 'stars', el('span', 'track stars__track', this.fill), ...this.stars);
  }

  update(movesLeft: number, moves: number, stars: number): void {
    this.fill.style.width = `${starMeter(moves > 0 ? movesLeft / moves : 0, this.rule) * 100}%`;
    if (stars === this.lit) return;
    const lost = this.lit > stars ? this.stars[stars] : undefined;
    this.lit = stars;
    this.stars.forEach((star, i) => star.classList.toggle('stars__star--lit', i < stars));
    if (lost) bump(lost, HUD_MOTION.starLost, HUD_MOTION.goalSettle);
  }
}

/** Where star 1 sits: at the start, since it's never lost. */
const STAR_ONE_AT = 0.05;

/**
 * Maps the share of moves left onto the bar so each star owns an even stretch of it: all moves left to the third
 * star's threshold fill the last third, down to the second star's the middle third, the rest the first. O(1).
 */
export function starMeter(left: number, rule: StarRule): number {
  const segment = (from: number, to: number, start: number): number =>
    start + (Math.min(Math.max(left, from), to) - from) / (to - from) / 3;
  if (left >= rule.three) return segment(rule.three, 1, 2 / 3);
  if (left >= rule.two) return segment(rule.two, rule.three, 1 / 3);
  return segment(0, rule.two, 0);
}
