import { Container, Graphics, Text } from 'pixi.js';
import { HUD } from '../config/hud';
import type { GameStatus } from '../game/GameStatus';

/** Moves left on the left, score and a progress bar toward the target on the right. Display only. */
export class Hud extends Container {
  private readonly moves: Text;
  private readonly score: Text;
  private readonly bar = new Graphics();

  constructor(private readonly barWidth: number) {
    super();
    this.moves = this.createLabel('left');
    this.score = this.createLabel('right');
    this.score.x = barWidth;
    this.bar.y = HUD.barTop;
    this.addChild(this.moves, this.score, this.bar);
  }

  update(status: GameStatus): void {
    this.moves.text = `Moves ${status.movesLeft}`;
    this.score.text = `${status.score} / ${status.targetScore}`;
    this.drawBar(Math.min(1, status.score / status.targetScore));
  }

  private createLabel(align: 'left' | 'right'): Text {
    const text = new Text({
      text: '',
      style: { fill: HUD.textColor, fontSize: HUD.fontSize, fontWeight: '700' },
    });
    text.anchor.set(align === 'left' ? 0 : 1, 0);
    return text;
  }

  private drawBar(progress: number): void {
    this.bar
      .clear()
      .roundRect(0, 0, this.barWidth, HUD.barHeight, HUD.barHeight / 2)
      .fill(HUD.barBack)
      .roundRect(0, 0, Math.max(HUD.barHeight, this.barWidth * progress), HUD.barHeight, HUD.barHeight / 2)
      .fill(HUD.barFill);
  }
}
