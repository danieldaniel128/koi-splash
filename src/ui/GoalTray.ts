import { KOI_NAMES } from '../config/koi';
import { GOAL_TRAY, HUD_MOTION } from '../config/ui';
import type { GoalProgress, GoalType } from '../model/goals';
import { THEME } from '../theme/theme';
import { CHECK, STAR, setIcon } from './icons';
import { bump, el, image, wantsLessMotion } from './UiLayer';

/** The goals' icons, painted by the game's own painters: the lotus, and a koi of each colour. */
export interface GoalIcons {
  readonly lotus: string;
  readonly koi: readonly string[];
  /** The points a met goal pays: they pop out of its chip and fly into the score. */
  readonly bonus: number;
}

/** How far the score is from an element (stage px), for a met goal's bonus to fly there. */
export type TowardScore = (from: HTMLElement) => { readonly x: number; readonly y: number };

/** The bonus a chip shows as its goal is met: its points, flying into the score. */
interface ChipBonus {
  readonly points: number;
  readonly towardScore: TowardScore;
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

  constructor(
    private readonly icons: GoalIcons,
    private readonly towardScore: TowardScore,
  ) {
    this.element.append(this.row, el('span', 'label goal__label', 'goals'));
  }

  /** A new level: a fresh chip per goal, showing what's to go with no pop. */
  reset(goals: readonly GoalProgress[]): void {
    this.element.classList.toggle('goal--many', goals.length > GOAL_TRAY.roomy);
    const bonus = { points: this.icons.bonus, towardScore: this.towardScore };
    this.chips = goals.map((goal) => new GoalChip(goal, goalPicture(goal, this.icons), bonus));
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
}

/**
 * A goal's picture: the lotus, or the koi of its colour; null for a score goal, which shows a star. One per goal type:
 * a new goal asks for its icon here.
 */
export function goalPicture(goal: GoalProgress, icons: GoalIcons): string | null {
  const pictures: Readonly<Record<GoalType, () => string | null>> = {
    lotus: () => icons.lotus,
    koi: () => icons.koi[goal.koi ?? 0] ?? null,
    score: () => null,
  };
  return pictures[goal.kind]();
}

/**
 * One goal's chip: its picture and how many are still to go, or a check once it's met. To a screen reader it is one
 * picture, named by its goal and how far it has to go. Given a bonus, it shows it flying off as the goal is met.
 */
export class GoalChip {
  readonly element: HTMLElement;
  readonly icon = el('span', 'chip__icon');
  readonly kind: GoalProgress['kind'];
  private readonly count = el('span', 'number chip__count');
  private readonly name: string;
  private left: number;

  constructor(
    goal: GoalProgress,
    picture: string | null,
    private readonly bonus: ChipBonus | null = null,
  ) {
    this.kind = goal.kind;
    this.name = goalName(goal);
    if (picture) this.icon.append(chipImage(goal.kind, picture));
    else setIcon(this.icon, STAR);
    this.element = el('div', 'chip', this.icon, this.count);
    this.element.setAttribute('role', 'img');
    this.left = leftOf(goal);
    this.show();
  }

  update(goal: GoalProgress): void {
    const left = leftOf(goal);
    if (left === this.left) return;
    this.left = left;
    this.show();
    bump(this.element, HUD_MOTION.goalBump, HUD_MOTION.goalSettle);
    if (left === 0 && this.bonus && this.bonus.points > 0) this.showBonus(this.bonus);
  }

  private show(): void {
    const done = this.left === 0;
    this.element.classList.toggle('chip--done', done);
    this.element.setAttribute('aria-label', `${this.name}: ${done ? 'done' : `${this.left} to go`}`);
    if (done) setIcon(this.count, CHECK);
    else this.count.textContent = `${this.left}`;
  }

  /**
   * The goal's bonus pops out of the chip in gold, then flies into the score, which it was just added to. With less
   * motion it only fades in and out where it is.
   */
  private showBonus(bonus: ChipBonus): void {
    const label = el('span', 'number chip__bonus', `+${bonus.points}`);
    this.element.append(label);
    const to = bonus.towardScore(this.element);
    const pose = (transform: string): string => (wantsLessMotion() ? 'none' : transform);
    const flight = label.animate(
      [
        { transform: pose('scale(0.6)'), opacity: 0, easing: 'ease-out' },
        { transform: pose('scale(1.15)'), opacity: 1, offset: 0.2 },
        { transform: 'none', opacity: 1, offset: 0.5, easing: 'ease-in' },
        { transform: pose(`translate(${to.x}px, ${to.y}px) scale(0.6)`), opacity: 0 },
      ],
      HUD_MOTION.bonusFlight * 1000,
    );
    flight.onfinish = () => {
      label.remove();
    };
  }
}

/** How many a goal still needs. */
function leftOf(goal: GoalProgress): number {
  return Math.max(0, goal.target - goal.done);
}

/** What a goal is called out loud: lotuses, red koi, points. */
export function goalName(goal: GoalProgress): string {
  if (goal.kind === 'lotus') return 'lotuses';
  if (goal.kind === 'koi') return `${KOI_NAMES[goal.koi ?? 0] ?? ''} koi`;
  return 'points';
}

/** A goal's picture, in proportion to the chip's icon box as its painting was made for (it spills out of the box). */
function chipImage(kind: GoalProgress['kind'], src: string): HTMLImageElement {
  const picture = image(`chip__image chip__image--${kind}`, src);
  const size = kind === 'koi' ? GOAL_TRAY.koiSize : GOAL_TRAY.lotusSize;
  picture.style.setProperty('--image-scale', `${size / THEME.size.goalIcon}`);
  return picture;
}
