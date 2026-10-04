import type { PointData } from 'pixi.js';
import type { GameStatus } from '../game/GameStatus';
import type { Rect } from '../layout/gameLayout';
import type { StarRule } from '../model/stars';
import { GoalTray } from './GoalTray';
import { MovesCounter } from './MovesCounter';
import { ScoreCounter } from './ScoreCounter';
import { StarBar } from './StarBar';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/**
 * The HUD above the pond: moves left in a glass orb, then a panel with the score and the goal chip, and the star bar
 * under them. It shows the status the scene sends (StatusDisplay) and tells the Pixi side where the score and the
 * goal are, so points and lotuses fly to them. Display only.
 */
export class Hud {
  private readonly moves = new MovesCounter();
  private readonly score = new ScoreCounter();
  private readonly goal: GoalTray;
  private readonly stars: StarBar;

  constructor(
    private readonly layer: UiLayer,
    rect: Rect,
    look: { lotusIcon: string; stars: StarRule },
  ) {
    this.goal = new GoalTray(look.lotusIcon);
    this.stars = new StarBar(look.stars);
    const top = el('div', 'hud__row', this.score.element, this.goal.element);
    const panel = el('div', 'panel hud__panel', top, this.stars.element);
    layer.place(el('div', 'hud', this.moves.element, panel), rect);
  }

  /** Where the score is, in stage px. */
  scoreAnchor(): PointData {
    return this.layer.centreOf(this.score.value);
  }

  /** Where the goal's icon is, in stage px. */
  goalAnchor(): PointData {
    return this.layer.centreOf(this.goal.icon);
  }

  update(status: GameStatus): void {
    this.moves.update(status.movesLeft);
    if (status.score === 0) this.score.reset();
    else this.score.update(status.score);
    this.goal.update(status.goal);
    this.stars.update(status.movesLeft, status.moves, status.stars);
  }
}
