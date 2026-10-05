import type { PointData } from 'pixi.js';
import { POINTS } from '../config/fx';
import { easeInOutCubic, easeOutBack, easeOutCubic } from '../core/easing';
import { Pool } from '../core/Pool';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/** The score the points fly into: where it is (stage px), and the points it waits for until they land. */
export interface ScoreTarget {
  scoreAnchor(): PointData;
  scoreFlying(amount: number): void;
  scoreLanded(amount: number): void;
}

/** Keyframes along the flight (more is smoother). */
const SAMPLES = 12;

/**
 * Big gains flying into the score (after the prototype's): a +N with a soft glow pops up where it was made, then
 * curves up into the score, over the HUD, and the score takes it as it lands. HTML in the UI layer, so it flies over
 * the HUD's glass instead of under it. The board's score popups hand it their big gains (their ScoreFlights).
 */
export class FlyingPoints {
  private readonly labels = new Pool<HTMLElement>({ create: () => el('span', 'score-fly'), cap: 12 });

  constructor(
    private readonly layer: UiLayer,
    private readonly score: ScoreTarget,
  ) {}

  fly(from: PointData, amount: number, color: string): void {
    const label = this.labels.acquire();
    label.textContent = `+${String(amount)}`;
    label.style.setProperty('--fly-color', color);
    this.layer.root.appendChild(label);
    this.score.scoreFlying(amount);
    const flight = label.animate(flightFrames(from, this.score.scoreAnchor()), {
      duration: (POINTS.flyPop + POINTS.flyTime) * 1000,
      fill: 'forwards',
    });
    flight.onfinish = () => {
      label.remove();
      this.labels.release(label);
      this.score.scoreLanded(amount);
    };
  }
}

/** The flight's keyframes: a pop up where it was made, then a bowed curve into the score, shrinking. */
function flightFrames(from: PointData, to: PointData): Keyframe[] {
  const popShare = POINTS.flyPop / (POINTS.flyPop + POINTS.flyTime);
  const top = { x: from.x, y: from.y - POINTS.flyRise };
  const control = { x: top.x + (top.x < to.x ? -POINTS.flyBow : POINTS.flyBow), y: (top.y + to.y) / 2 };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= SAMPLES / 2; i++) {
    const k = i / (SAMPLES / 2);
    const y = from.y - POINTS.flyRise * easeOutCubic(k);
    frames.push(
      frame(popShare * k, { x: from.x, y }, POINTS.flyScale * easeOutBack(Math.min(1, k * 2.3)), k),
    );
  }
  for (let i = 1; i <= SAMPLES; i++) {
    const t = easeInOutCubic(i / SAMPLES);
    const u = 1 - t;
    const at = {
      x: u * u * top.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * top.y + 2 * u * t * control.y + t * t * to.y,
    };
    frames.push(
      frame(popShare + (1 - popShare) * (i / SAMPLES), at, POINTS.flyScale * (1 - POINTS.flyShrink * t), 1),
    );
  }
  return frames;
}

function frame(offset: number, at: PointData, scale: number, opacity: number): Keyframe {
  return {
    offset,
    opacity: Math.min(1, opacity * 3),
    transform: `translate(${String(at.x)}px, ${String(at.y)}px) translate(-50%, -50%) scale(${String(Math.max(0.01, scale))})`,
  };
}
