import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { HUD, RESULT } from '../config/hud';
import type { GameStatus } from '../game/GameStatus';

export type Outcome = 'won' | 'lost';

/**
 * The end-of-level card over the dimmed pond, in the HUD's ink-and-moonlight style. Tapping anywhere emits
 * 'restart'; whoever owns the level listens for it. Display only: it doesn't know how a level restarts.
 */
export class ResultOverlay extends Container {
  private readonly dim = new Graphics();
  private readonly card = new Container();
  private readonly title: Text;
  private readonly detail: Text;

  constructor(stageWidth: number, stageHeight: number) {
    super();
    const reachX = stageWidth * RESULT.dimReach;
    const reachY = stageHeight * RESULT.dimReach;
    this.dim
      .rect(-reachX, -reachY, stageWidth + reachX * 2, stageHeight + reachY * 2)
      .fill({ color: RESULT.dimColor, alpha: RESULT.dimAlpha });
    this.title = this.createText(RESULT.titleSize, -RESULT.lineGap, HUD.gold, HUD.numberFont);
    this.detail = this.createText(RESULT.detailSize, 4, HUD.ink, HUD.labelFont);
    const hint = this.createText(RESULT.hintSize, RESULT.lineGap, HUD.muted, HUD.labelFont);
    hint.text = 'Tap to play again';
    this.card.addChild(panel(), this.title, this.detail, hint);
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

  private createText(fontSize: number, y: number, fill: string, fontFamily: string): Text {
    const text = new Text({ text: '', style: { fill, fontSize, fontFamily, fontWeight: '700' } });
    text.anchor.set(0.5);
    text.y = y;
    return text;
  }
}

/** The card itself: a rounded indigo panel with a thin moonlit rim, centred on the origin. */
function panel(): Graphics {
  const width = RESULT.cardWidth;
  const height = RESULT.cardHeight;
  return new Graphics()
    .roundRect(-width / 2, -height / 2, width, height, 22)
    .fill({ color: HUD.panel, alpha: 0.95 })
    .stroke({ width: 1.5, color: HUD.rim, alpha: HUD.rimAlpha })
    .roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 17)
    .stroke({ width: 1, color: HUD.rim, alpha: 0.15 });
}
