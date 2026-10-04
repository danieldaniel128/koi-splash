import { gsap } from 'gsap';
import { Color, Point } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { SCORE } from '../config/level';
import { TIMING } from '../config/timing';
import { WATER } from '../config/water';
import { scoreRound } from '../model/score';
import type { CascadeStep, Cell, Piece, Spawn } from '../model/types';
import type { BoardView } from './BoardView';
import type { Koi } from './Koi';
import type { WaterSurface } from './water/PondWater';

/** A piece and the cell it sits in when an animation starts. */
export interface PlacedPiece {
  readonly piece: Piece;
  readonly at: Cell;
}

/** The match effects over the water, in the board's space (one splash per match, points). */
export interface MatchEffects {
  splash(points: readonly PointData[]): void;
  points(at: PointData, amount: number): void;
}

const WHITE = 0xffffff;
/** Diving koi take on this pale water-blue as they sink, keeping their own colour (a dark tint turns them muddy). */
const UNDERWATER = new Color(TIMING.diveTint).toNumber();

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
    private readonly water: WaterSurface,
    private readonly fx: MatchEffects,
  ) {}

  /**
   * Two koi trade places: the one the player dragged lifts toward the surface and passes over the other. They shove
   * the water apart as they go, and each one settles into its new cell with a small push.
   */
  async swap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    this.round = 0;
    const lifted = this.view.spriteOf(first.piece.id);
    this.view.bringToFront(lifted);
    this.stir(first.at, second.at, 1);
    await Promise.all([
      this.slide(lifted, second.at, TIMING.swapLift),
      this.slide(this.view.spriteOf(second.piece.id), first.at, TIMING.swapSink),
    ]);
    for (const cell of [first.at, second.at]) {
      this.water.push(this.onStage(this.view.cellToPoint(cell)), WATER.swapSettlePush, WATER.swapRadius);
    }
  }

  /** A swap that makes no match: both koi lean toward each other and spring back, with a smaller shove. */
  async invalidSwap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    this.view.bringToFront(this.view.spriteOf(first.piece.id));
    this.stir(first.at, second.at, 0.6);
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

  /** One splash per match, and its points pop up over it; a cell shared by two matches counts once. */
  private celebrate(step: CascadeStep): void {
    const perPiece = scoreRound(step, this.round, SCORE.pointsPerPiece) / Math.max(step.cleared.length, 1);
    const counted = new Set<string>();
    for (const match of step.matches) {
      const fresh = match.cells.filter((cell) => !counted.has(`${cell.col},${cell.row}`));
      for (const cell of fresh) counted.add(`${cell.col},${cell.row}`);
      if (fresh.length === 0) continue;
      const points = match.cells.map((cell) => this.view.cellToPoint(cell));
      this.fx.splash(points);
      this.fx.points(centreOf(points), Math.round(fresh.length * perPiece));
    }
  }

  /** The water is shoved apart between two cells (a swap): a push at the midpoint, `strength` times the full one. */
  private stir(from: Cell, to: Cell, strength: number): void {
    const middle = centreOf([this.view.cellToPoint(from), this.view.cellToPoint(to)]);
    this.water.push(this.onStage(middle), WATER.swapPush * strength, WATER.swapRadius);
  }

  /** A point on the board, on the stage (where the water is pushed). */
  private onStage(boardPoint: PointData): PointData {
    return { x: this.view.x + boardPoint.x, y: this.view.y + boardPoint.y };
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

  /**
   * A matched koi kicks (a quick squash), pushes the water down and sinks away into the deep, turning as it goes.
   * It keeps its colour, only cooling a little, and fades into the blue.
   */
  private async dive(id: number, at: Cell): Promise<void> {
    const koi = this.view.spriteOf(id);
    const point = this.view.cellToPoint(at);
    this.water.push(this.onStage(point), WATER.divePush, WATER.diveRadius);
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
          ease: 'none',
          onUpdate: () => {
            koi.alpha = 1 - sink.depth * sink.depth;
            koi.tint = mixColor(WHITE, UNDERWATER, sink.depth);
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
      koi.alpha = 1 - depth.amount * depth.amount;
      koi.tint = mixColor(WHITE, UNDERWATER, depth.amount);
    };
    show();
    const rowsAboveBoard = -spawn.from.row - 1;
    await gsap
      .timeline({ delay: delay + TIMING.fallBase + rowsAboveBoard * TIMING.riseStagger })
      .to(depth, { amount: 0, duration: TIMING.rise, ease: 'power2.out', onUpdate: show })
      .call(
        () => {
          this.water.push(this.onStage(point), WATER.surfacePush, WATER.diveRadius);
        },
        [],
        TIMING.rise * TIMING.riseSurfaceAt,
      );
  }
}

/** The middle of some points. */
function centreOf(points: readonly PointData[]): Point {
  const centre = new Point();
  for (const point of points) {
    centre.x += point.x / points.length;
    centre.y += point.y / points.length;
  }
  return centre;
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
