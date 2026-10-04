import { gsap } from 'gsap';
import { Container, Text } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { POINTS } from '../config/fx';

/**
 * The points each match earns: they pop up over the match, then fly up to the score and shrink into it.
 * Positions are in the board's space: this layer sits exactly on the board.
 */
export class ScorePopups extends Container {
  /** Labels are reused: making a Text draws a canvas, too slow to do for every match. */
  private readonly spareLabels: Text[] = [];

  constructor(
    /** Where the score is shown, in this layer's space: the points fly there. */
    private readonly scoreAt: PointData,
  ) {
    super();
  }

  /** The points a match earned pop up at `at`, then fly to the score and shrink into it. */
  points(at: PointData, amount: number): void {
    const label = this.spareLabels.pop() ?? createLabel();
    label.text = `+${amount}`;
    label.position.copyFrom(at);
    label.alpha = 1;
    label.scale.set(0.4);
    this.addChild(label);
    const flyAt = POINTS.pop + POINTS.hold;
    gsap
      .timeline({
        onComplete: () => {
          this.removeChild(label);
          this.spareLabels.push(label);
        },
      })
      .to(label.scale, { x: 1, y: 1, duration: POINTS.pop, ease: 'back.out(3)' }, 0)
      .to(label, { y: at.y - POINTS.rise, duration: flyAt, ease: 'power1.out' }, 0)
      .to(label, { x: this.scoreAt.x, y: this.scoreAt.y, duration: POINTS.flight, ease: 'power2.in' }, flyAt)
      .to(
        label.scale,
        { x: POINTS.landScale, y: POINTS.landScale, duration: POINTS.flight, ease: 'power1.in' },
        flyAt,
      )
      .to(label, { alpha: 0, duration: 0.1 }, flyAt + POINTS.flight - 0.1);
  }
}

function createLabel(): Text {
  const label = new Text({
    text: '',
    style: {
      fill: POINTS.fill,
      fontSize: POINTS.fontSize,
      fontWeight: '800',
      fontFamily: POINTS.font,
      stroke: { color: POINTS.stroke, width: 4, join: 'round' },
    },
  });
  label.anchor.set(0.5);
  return label;
}
