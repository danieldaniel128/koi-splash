import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import type { PointData, TextStyleOptions } from 'pixi.js';
import { HUD } from '../config/hud';
import type { GameStatus } from '../game/GameStatus';

/**
 * Moves left in a water drop on the left; the score in a pill on the right, counting up to each new value, with a
 * gold bar filling toward the target. Same ink-and-moonlight style as the pond. Display only.
 */
export class Hud extends Container {
  private readonly moves: Text;
  private readonly score: Text;
  private readonly target: Text;
  private readonly bar = new Graphics();
  private readonly shown = { score: 0, progress: 0 };
  private lastMoves = -1;

  constructor(private readonly panelWidth: number) {
    super();
    const radius = HUD.dropRadius;
    this.moves = label(
      '',
      { fontFamily: HUD.numberFont, fontSize: 21, fontWeight: '700', fill: HUD.ink },
      0.5,
    );
    this.moves.position.set(radius, HUD.pillHeight / 2 + 1);
    const movesLabel = label('moves', { fontFamily: HUD.labelFont, fontSize: 8, fill: HUD.muted }, 0.5);
    movesLabel.position.set(radius, HUD.pillHeight / 2 + 16);
    this.score = label(
      '0',
      { fontFamily: HUD.numberFont, fontSize: 24, fontWeight: '700', fill: HUD.gold },
      0,
    );
    this.score.position.set(HUD.pillLeft + 16, 20);
    this.target = label('', { fontFamily: HUD.labelFont, fontSize: 12, fill: HUD.muted }, 0);
    this.addChild(drop(radius), pill(panelWidth), this.bar, this.moves, movesLabel, this.score, this.target);
  }

  /** Where the score number sits, in the HUD's space (the points from a match fly there). */
  scoreAnchor(): PointData {
    return { x: this.score.x + 10, y: this.score.y };
  }

  update(status: GameStatus): void {
    if (status.movesLeft !== this.lastMoves) this.showMoves(status.movesLeft);
    this.target.text = `/ ${status.targetScore}`;
    const progress = Math.min(1, status.score / status.targetScore);
    if (status.score === Math.round(this.shown.score)) {
      this.drawScore(progress);
      return;
    }
    gsap.to(this.shown, {
      score: status.score,
      progress,
      duration: HUD.countUp,
      ease: 'power1.out',
      onUpdate: () => {
        this.drawScore(this.shown.progress);
      },
    });
    gsap.fromTo(
      this.score.scale,
      { x: HUD.bump, y: HUD.bump },
      { x: 1, y: 1, duration: HUD.countUp, ease: 'power2.out' },
    );
  }

  private showMoves(movesLeft: number): void {
    const first = this.lastMoves < 0;
    this.lastMoves = movesLeft;
    this.moves.text = `${movesLeft}`;
    if (!first)
      gsap.fromTo(
        this.moves.scale,
        { x: HUD.movesBump, y: HUD.movesBump },
        { x: 1, y: 1, duration: HUD.movesSettle, ease: 'back.out(3)' },
      );
  }

  private drawScore(progress: number): void {
    this.score.text = `${Math.round(this.shown.score)}`;
    this.target.position.set(this.score.x + this.score.width + 6, 27);
    const left = HUD.pillLeft + 16;
    const length = this.panelWidth - left - 16;
    const top = HUD.pillHeight - 15;
    const filled = Math.max(HUD.barHeight, length * progress);
    this.bar
      .clear()
      .roundRect(left, top, length, HUD.barHeight, HUD.barHeight / 2)
      .fill(HUD.barBack)
      .roundRect(left - 2, top - 2, filled + 4, HUD.barHeight + 4, HUD.barHeight)
      .fill({ color: HUD.gold, alpha: 0.18 }) // soft glow around the fill
      .roundRect(left, top, filled, HUD.barHeight, HUD.barHeight / 2)
      .fill(HUD.gold);
  }
}

function label(text: string, style: TextStyleOptions, anchorX: number): Text {
  const result = new Text({ text, style });
  result.anchor.set(anchorX, 0.5);
  return result;
}

/** Where the drop's glint arc starts and ends (radians, 0 = right). */
const GLINT_FROM = -0.75;
const GLINT_TO = 0.2;

/** The moves counter's water drop: pointed on top, round below, with a moonlit rim and a glint on the moon side. */
function drop(radius: number): Graphics {
  const cx = radius;
  const cy = HUD.pillHeight / 2 + 3;
  const tip = cy - radius * 1.25;
  const belly = cy + radius * 0.15;
  return (
    new Graphics()
      .moveTo(cx, tip)
      .bezierCurveTo(
        cx + radius * 0.2,
        tip + radius * 0.45,
        cx + radius,
        belly - radius * 0.6,
        cx + radius,
        belly,
      )
      .arc(cx, belly, radius, 0, Math.PI)
      .bezierCurveTo(cx - radius, belly - radius * 0.6, cx - radius * 0.2, tip + radius * 0.45, cx, tip)
      .fill({ color: HUD.panel, alpha: HUD.panelAlpha })
      .stroke({ width: 1.5, color: HUD.rim, alpha: HUD.rimAlpha })
      // the glint is its own path: continuing the outline's path drew a stray line from the tip on some phone GPUs
      .moveTo(cx + Math.cos(GLINT_FROM) * radius * 0.78, belly + Math.sin(GLINT_FROM) * radius * 0.78)
      .arc(cx, belly, radius * 0.78, GLINT_FROM, GLINT_TO)
      .stroke({ width: 1.5, color: HUD.rim, alpha: 0.45, cap: 'round' })
  );
}

/** The score panel: a rounded pill from the drop to the right edge. */
function pill(width: number): Graphics {
  const height = HUD.pillHeight;
  return new Graphics()
    .roundRect(HUD.pillLeft, 0, width - HUD.pillLeft, height, height / 2)
    .fill({ color: HUD.panel, alpha: HUD.panelAlpha })
    .stroke({ width: 1.5, color: HUD.rim, alpha: HUD.rimAlpha });
}
