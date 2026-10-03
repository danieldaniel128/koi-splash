import { gsap } from 'gsap';
import { Color, Point } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { SCORE } from '../config/level';
import { TIMING } from '../config/timing';
import { WATER } from '../config/water';
import { scoreRound } from '../model/score';
import type { CascadeStep, Cell, Match, Piece, Spawn } from '../model/types';
import type { BoardView } from './BoardView';
import type { Koi } from './Koi';

/** A piece and the cell it sits in when an animation starts. */
export interface PlacedPiece {
  readonly piece: Piece;
  readonly at: Cell;
}

/** Something the koi can push at a point in global space (the pond's water), harder for a bigger `strength`. */
export interface RippleSurface {
  ripple(globalPoint: PointData, strength: number): void;
}

/** The match effects over the water, in the board's space (rings, droplets, points). */
export interface MatchEffects {
  splash(at: PointData): void;
  points(at: PointData, amount: number): void;
}

/** A surfacing koi pushes the water this much less than a diving one. */
const SURFACE_STRENGTH = WATER.surfacePush / WATER.divePush;
const WHITE = 0xffffff;
const DEEP = new Color(WATER.deep).toNumber();

/**
 * Plays the model's results on the board view, koi-pond style: the dragged koi rises and passes over the other,
 * matched koi kick and dive into the deep under a splash of rings, the koi above glide down, and new koi rise from
 * the deep into the gaps. Every method returns a promise that resolves when the motion ends, so the scene can await
 * the turn step by step instead of chaining callbacks.
 */
export class BoardAnimator {
  /** Cascade round within the current turn, for the points shown (later rounds are worth more). */
  private round = 0;

  constructor(
    private readonly view: BoardView,
    private readonly cellSize: number,
    private readonly water: RippleSurface,
    private readonly fx: MatchEffects,
  ) {}

  /** Two koi trade places: the one the player dragged lifts toward the surface and passes over the other. */
  async swap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    this.round = 0;
    const lifted = this.view.spriteOf(first.piece.id);
    this.view.bringToFront(lifted);
    await Promise.all([
      this.slide(lifted, second.at, TIMING.swapLift),
      this.slide(this.view.spriteOf(second.piece.id), first.at, TIMING.swapSink),
    ]);
  }

  /** A swap that makes no match: both koi lean toward each other and spring back. */
  async invalidSwap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    this.view.bringToFront(this.view.spriteOf(first.piece.id));
    await Promise.all([this.lean(first, second.at, TIMING.swapLift), this.lean(second, first.at, 1)]);
  }

  /** One cascade round: matched koi dive while the koi above glide down and new ones rise into the gaps. */
  async playStep(step: CascadeStep): Promise<void> {
    this.celebrate(step);
    const fallDelay = step.cleared.length > 0 ? (TIMING.diveKick + TIMING.diveSink) * TIMING.fallStartAt : 0;
    await Promise.all([
      ...step.cleared.map(({ piece, at }) => this.dive(piece.id, at)),
      ...step.falls.map((fall) =>
        this.glide(this.view.spriteOf(fall.piece.id), fall.to, fall.to.row - fall.from.row, fallDelay),
      ),
      ...step.spawns.map((spawn) => this.rise(spawn, fallDelay)),
    ]);
    this.round++;
  }

  /** Points pop up over each match; a cell shared by two matches counts once. */
  private celebrate(step: CascadeStep): void {
    const perPiece = scoreRound(step, this.round, SCORE.pointsPerPiece) / Math.max(step.cleared.length, 1);
    const counted = new Set<string>();
    for (const match of step.matches) {
      const fresh = match.cells.filter((cell) => !counted.has(`${cell.col},${cell.row}`));
      for (const cell of fresh) counted.add(`${cell.col},${cell.row}`);
      if (fresh.length > 0) this.fx.points(this.centreOf(match), Math.round(fresh.length * perPiece));
    }
  }

  private centreOf(match: Match): Point {
    const centre = new Point();
    for (const cell of match.cells) {
      const point = this.view.cellToPoint(cell);
      centre.x += point.x / match.cells.length;
      centre.y += point.y / match.cells.length;
    }
    return centre;
  }

  /** Slides to a cell, growing to `peak` times its size halfway (lifted toward the surface) and back. */
  private async slide(koi: Koi, to: Cell, peak: number): Promise<void> {
    const target = this.view.cellToPoint(to);
    const size = koi.restScale * peak;
    await gsap
      .timeline()
      .to(koi, { x: target.x, y: target.y, duration: TIMING.swap, ease: 'power2.inOut' }, 0)
      .to(
        koi.scale,
        { x: size, y: size, duration: TIMING.swap / 2, ease: 'sine.out', yoyo: true, repeat: 1 },
        0,
      );
  }

  private async lean(placed: PlacedPiece, toward: Cell, peak: number): Promise<void> {
    const koi = this.view.spriteOf(placed.piece.id);
    const reach = TIMING.invalidReach * this.cellSize;
    const size = koi.restScale * peak;
    const half = TIMING.invalidSwap / 2;
    await gsap
      .timeline()
      .to(
        koi,
        {
          x: koi.x + Math.sign(toward.col - placed.at.col) * reach,
          y: koi.y + Math.sign(toward.row - placed.at.row) * reach,
          duration: half,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        0,
      )
      .to(koi.scale, { x: size, y: size, duration: half, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
  }

  /** A matched koi kicks (a quick squash), splashes and sinks away into the deep, turning as it goes. */
  private async dive(id: number, at: Cell): Promise<void> {
    const koi = this.view.spriteOf(id);
    const point = this.view.cellToPoint(at);
    this.fx.splash(point);
    this.water.ripple(this.view.toGlobal(point), 1);
    koi.turnToward(koi.heading + TIMING.diveTurn, 1);
    const rest = koi.restScale;
    const sink = { depth: 0 };
    await gsap
      .timeline()
      .to(koi.scale, { x: rest * 1.18, y: rest * 0.84, duration: TIMING.diveKick, ease: 'power2.out' })
      .to(koi.scale, {
        x: rest * TIMING.diveScale,
        y: rest * TIMING.diveScale,
        duration: TIMING.diveSink,
        ease: 'power2.in',
      })
      .to(
        sink,
        {
          depth: 1,
          duration: TIMING.diveSink,
          ease: 'power1.in',
          onUpdate: () => {
            koi.alpha = 1 - sink.depth;
            koi.tint = mixColor(WHITE, DEEP, sink.depth * 0.8);
          },
        },
        '<',
      );
    this.view.removePiece(id);
  }

  /** Glides down into a gap (longer drops take longer), turning its head partly downstream. */
  private async glide(koi: Koi, to: Cell, rows: number, delay: number): Promise<void> {
    const target = this.view.cellToPoint(to);
    gsap.delayedCall(delay, () => {
      koi.turnToward(Math.PI, TIMING.fallTurn);
    });
    await gsap.to(koi, {
      x: target.x,
      y: target.y,
      duration: TIMING.fallBase + TIMING.fallPerRow * rows,
      delay,
      ease: 'power2.inOut',
    });
  }

  /** A new koi rises from the deep into its cell, the lowest of a column first, and breaks the surface. */
  private async rise(spawn: Spawn, delay: number): Promise<void> {
    const koi = this.view.addPiece(spawn.piece, spawn.to);
    const point = this.view.cellToPoint(spawn.to);
    const rest = koi.restScale;
    const depth = { amount: 1 };
    const show = (): void => {
      const size = rest * (1 - (1 - TIMING.diveScale) * depth.amount);
      koi.scale.set(size);
      koi.alpha = 1 - depth.amount;
      koi.tint = mixColor(WHITE, DEEP, depth.amount * 0.8);
    };
    show();
    const rowsAboveBoard = -spawn.from.row - 1;
    await gsap
      .timeline({ delay: delay + TIMING.fallBase + rowsAboveBoard * TIMING.riseStagger })
      .to(depth, { amount: 0, duration: TIMING.rise, ease: 'power2.out', onUpdate: show })
      .call(
        () => {
          this.water.ripple(this.view.toGlobal(point), SURFACE_STRENGTH);
        },
        [],
        TIMING.rise * TIMING.riseSurfaceAt,
      );
  }
}

/** Blends two 0xRRGGBB colours: `t` = 0 gives `from`, 1 gives `to`. */
function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
