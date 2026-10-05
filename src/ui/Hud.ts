import type { PointData } from 'pixi.js';
import type { StatusDisplay } from '../game/GameScene';
import type { GameStatus } from '../game/GameStatus';
import type { Rect } from '../layout/gameLayout';
import type { StarRule } from '../model/stars';
import { GoalTray } from './GoalTray';
import type { GoalIcons } from './GoalTray';
import { MovesCounter } from './MovesCounter';
import { ScoreCounter } from './ScoreCounter';
import { StarBar } from './StarBar';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/**
 * The HUD above the pond: moves left in a glass orb, then a panel with the score and a chip per goal, and the star bar
 * under them. It shows the status the scene sends (StatusDisplay) and tells the Pixi side where the score and the
 * goal are, so points and lotuses fly to them. Display only.
 */
export class Hud implements StatusDisplay {
  private readonly moves = new MovesCounter();
  private readonly score = new ScoreCounter();
  private readonly goal: GoalTray;
  private readonly stars: StarBar;

  constructor(
    private readonly layer: UiLayer,
    rect: Rect,
    look: { goalIcons: GoalIcons; stars: StarRule },
  ) {
    this.goal = new GoalTray(look.goalIcons);
    this.stars = new StarBar(look.stars);
    const top = el('div', 'hud__row', this.score.element, this.goal.element);
    const panel = el('div', 'panel hud__panel', top, this.stars.element);
    layer.place(el('div', 'hud', this.moves.element, panel), rect);
  }

  /** Where the score is, in stage px. */
  scoreAnchor(): PointData {
    return this.layer.centreOf(this.score.value);
  }

  /** Big points are flying to the score: it waits for them. */
  scoreFlying(amount: number): void {
    this.score.hold(amount);
  }

  /** Flying points landed in the score. */
  scoreLanded(amount: number): void {
    this.score.land(amount);
  }

  /** Where the lotus goal's icon is, in stage px (a bloomed lotus flies there). */
  goalAnchor(): PointData {
    return this.layer.centreOf(this.goal.iconOf('lotus'));
  }

  reset(status: GameStatus): void {
    this.moves.reset(status.movesLeft);
    this.score.reset(status.score);
    this.goal.reset(status.goals);
    this.stars.reset(status.score, status.stars);
  }

  update(status: GameStatus): void {
    this.moves.update(
      status.movesLeft,
      status.goals.every((goal) => goal.done >= goal.target),
    );
    this.score.update(status.score);
    this.goal.update(status.goals);
    this.stars.update(status.score, status.stars);
  }
}
