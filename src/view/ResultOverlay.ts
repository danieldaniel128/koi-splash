import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { RESULT } from '../config/hud';
import type { GameStatus } from '../game/GameStatus';

export type Outcome = 'won' | 'lost';

/**
 * The end-of-level card over a dimmed stage. Tapping anywhere emits 'restart'; whoever owns the level listens for it.
 * Display only: it doesn't know how a level restarts.
 */
export class ResultOverlay extends Container {
  private readonly dim = new Graphics();
  private readonly card = new Container();
  private readonly title: Text;
  private readonly detail: Text;

  constructor(stageWidth: number, stageHeight: number) {
    super();
    this.dim.rect(0, 0, stageWidth, stageHeight).fill({ color: RESULT.dimColor, alpha: RESULT.dimAlpha });
    this.title = this.createText(RESULT.titleSize, 0);
    this.detail = this.createText(RESULT.detailSize, RESULT.lineGap);
    const hint = this.createText(RESULT.detailSize, RESULT.lineGap * 2);
    hint.text = 'Tap to play again';
    hint.alpha = RESULT.hintAlpha;
    this.card.addChild(this.title, this.detail, hint);
    this.card.position.set(stageWidth / 2, stageHeight / 2 - RESULT.lineGap);
    this.addChild(this.dim, this.card);

    this.visible = false;
    this.eventMode = 'static';
    this.on('pointertap', () => this.emit('restart'));
  }

  show(outcome: Outcome, status: GameStatus): void {
    this.title.text = outcome === 'won' ? 'Pond complete!' : 'Out of moves';
    this.detail.text = `Score ${status.score} / ${status.targetScore}`;
    this.visible = true;
    gsap.fromTo(this, { alpha: 0 }, { alpha: 1, duration: RESULT.fadeIn });
    gsap.fromTo(
      this.card.scale,
      { x: 0.8, y: 0.8 },
      { x: 1, y: 1, duration: RESULT.popIn, ease: 'back.out(2)' },
    );
  }

  hide(): void {
    this.visible = false;
  }

  private createText(fontSize: number, y: number): Text {
    const text = new Text({ text: '', style: { fill: RESULT.textColor, fontSize, fontWeight: '700' } });
    text.anchor.set(0.5);
    text.y = y;
    return text;
  }
}
