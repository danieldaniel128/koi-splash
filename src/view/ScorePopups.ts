import { gsap } from 'gsap';
import { Container, Text } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { POINTS } from '../config/fx';
import { Pool } from '../core/Pool';
import { THEME } from '../theme/theme';
import type { MatchEffects, PointsLook } from './BoardAnimator';

/** Where big gains go: they fly into the score (from a point in stage px, in a CSS colour). */
export interface ScoreFlights {
  fly(from: PointData, amount: number, color: string): void;
}

/** A cascade's colours, round by round. */
const ROUND_COLORS = [THEME.color.combo1, THEME.color.combo2, THEME.color.combo3, THEME.color.combo4];

/**
 * The points each match and blast earns, where it was made (after the prototype): small gains pop up, rise and fade
 * there; big ones fly into the score (see ScoreFlights), drawn over the HUD so they visibly land in it. Each shows when
 * its points are made (a blast's when it lands), in its round's colour, bigger for bigger matches. Positions are in
 * the board's space: this layer sits exactly on the board.
 */
export class ScorePopups extends Container implements MatchEffects {
  /** Making a Text draws a canvas, too slow to do for every match: labels are drawn once and reused. */
  private readonly labels: Pool<Text>;

  constructor(
    private readonly flights: ScoreFlights,
    /** Screen pixels per stage px: the labels are drawn that sharp, like the koi and the HUD. */
    resolution: number,
  ) {
    super();
    this.labels = new Pool<Text>({
      create: () => createLabel(resolution),
      reset: (label) => {
        label.alpha = 1;
      },
      cap: POINTS.pool,
      discard: (label) => {
        label.destroy();
      },
    });
  }

  /** The points `amount` made at `at` show as `look` says. */
  points(at: PointData, amount: number, look: PointsLook): void {
    const color = roundColor(look.round);
    if (amount >= POINTS.flyMin) {
      gsap.delayedCall(look.delay, () => {
        this.flights.fly({ x: this.x + at.x, y: this.y + at.y }, amount, color);
      });
      return;
    }
    const label = this.labels.acquire();
    label.text = `+${amount}`;
    label.tint = color;
    label.position.copyFrom(at);
    label.scale.set(0);
    this.addChild(label);
    this.popUp(
      label,
      at,
      Math.min(POINTS.sizeMax, POINTS.sizeBase + look.size * POINTS.sizePerKoi) / POINTS.sizeMax,
    )
      .delay(look.delay)
      .eventCallback('onComplete', () => {
        this.removeChild(label);
        this.labels.release(label);
      });
  }

  /** Pops in to `size`, rises and holds, then fades where it is. */
  private popUp(label: Text, at: PointData, size: number): gsap.core.Timeline {
    const stay = POINTS.pop + POINTS.hold;
    return gsap
      .timeline()
      .to(label.scale, { x: size, y: size, duration: POINTS.pop, ease: 'back.out(3)' }, 0)
      .to(label, { y: at.y - POINTS.rise, duration: stay + POINTS.fade, ease: 'power1.out' }, 0)
      .to(label, { alpha: 0, duration: POINTS.fade, ease: 'power1.in' }, stay);
  }
}

/** A cascade round's colour (the last one for every round past it). */
export function roundColor(round: number): string {
  return ROUND_COLORS[Math.min(ROUND_COLORS.length - 1, Math.max(0, round))] ?? THEME.color.gold;
}

function createLabel(resolution: number): Text {
  const label = new Text({
    text: '',
    resolution,
    style: {
      fill: POINTS.fill,
      fontSize: POINTS.sizeMax,
      fontWeight: POINTS.fontWeight,
      fontFamily: POINTS.font,
      stroke: { color: POINTS.stroke, width: 5, join: 'round' },
    },
  });
  label.anchor.set(0.5);
  return label;
}
