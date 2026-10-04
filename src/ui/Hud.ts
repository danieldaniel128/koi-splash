import type { PointData } from 'pixi.js';
import type { GameStatus } from '../game/GameStatus';
import type { Rect } from '../layout/gameLayout';
import { GoalTray } from './GoalTray';
import { MovesCounter } from './MovesCounter';
import { ScoreCounter } from './ScoreCounter';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/**
 * The HUD above the pond: moves left in a drop, then a panel with the score and the goal. It shows the status the
 * scene sends (StatusDisplay) and tells the Pixi side where the score and the goal are, so points and lotuses fly
 * to them. Display only.
 */
export class Hud {
  private readonly moves = new MovesCounter();
  private readonly score = new ScoreCounter();
  private readonly goal: GoalTray;

  constructor(
    private readonly layer: UiLayer,
    rect: Rect,
    lotusIcon: string,
  ) {
    this.goal = new GoalTray(lotusIcon);
    const panel = el('div', 'panel hud__panel', this.score.element, this.goal.element);
    layer.place(el('div', 'hud', this.moves.element, panel), rect);
  }

  /** Where the score is, in stage px. */
  scoreAnchor(): PointData {
    return this.layer.centreOf(this.score.value);
  }

  /** Where the goal is, in stage px. */
  goalAnchor(): PointData {
    return this.layer.centreOf(this.goal.element);
  }

  update(status: GameStatus): void {
    this.moves.update(status.movesLeft);
    if (status.score === 0) this.score.reset();
    else this.score.update(status.score);
    this.goal.update(status.goal);
  }
}
