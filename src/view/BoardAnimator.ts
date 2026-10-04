import { gsap } from 'gsap';
import { Color, Point } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { TIMING } from '../config/timing';
import { WATER } from '../config/water';
import { scoreRound } from '../model/score';
import type { CascadeStep, Cell, Cleared, Created, Piece, Spawn } from '../model/types';
import type { BoardView } from './BoardView';
import type { Koi } from './Koi';
import { planRound } from './specialTiming';
import type { ClearPlan } from './specialTiming';
import type { SpecialFx } from './SpecialFx';
import type { SpecialMotions } from './SpecialMotions';
import type { WaterSurface } from './water/PondWater';

/** A piece and the cell it sits in when an animation starts. */
export interface PlacedPiece {
  readonly piece: Piece;
  readonly at: Cell;
}

/** The match effects over the water, in the board's space (one splash per match, points). */
export interface MatchEffects {
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
  /**
   * Cascade round within the current turn, for the points shown (later rounds are worth more). The scene doesn't
   * pass the round in, so this counter mirrors its loop index; the scene passing the round's points would be cleaner.
   */
  private round = 0;

  constructor(
    private readonly view: BoardView,
    private readonly cellSize: number,
    private readonly water: WaterSurface,
    private readonly fx: MatchEffects,
    /** The level's points per piece, the same value the scene scores with. */
    private readonly pointsPerPiece: number,
    /** The specials' effects and the ways koi leave around them. */
    private readonly specials: { readonly fx: SpecialFx; readonly motions: SpecialMotions },
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
    this.stir(first.at, second.at, WATER.invalidSwapPush);
    await Promise.all([this.lean(first, second.at, TIMING.swapLift), this.lean(second, first.at, 1)]);
  }

  /**
   * A koi swiped into a lily pad: it darts toward the pad, squashes against it with a small splash, and swims back
   * to its place.
   */
  async bumpPad(koi: PlacedPiece, padCell: Cell): Promise<void> {
    const sprite = this.view.spriteOf(koi.piece.id);
    const home = { x: sprite.x, y: sprite.y };
    const reach = TIMING.bumpReach * this.cellSize;
    const dx = Math.sign(padCell.col - koi.at.col) * reach;
    const dy = Math.sign(padCell.row - koi.at.row) * reach;
    const { restScale } = sprite;
    this.view.bringToFront(sprite);
    await gsap
      .timeline()
      .to(sprite, { x: home.x + dx, y: home.y + dy, duration: TIMING.bumpIn, ease: 'power2.in' })
      .call(() => {
        this.water.push(this.onStage({ x: home.x + dx, y: home.y + dy }), WATER.bumpPush, WATER.swapRadius);
      })
      .to(sprite.scale, {
        x: restScale * TIMING.bumpSquash,
        y: restScale * TIMING.bumpSquash,
        duration: TIMING.bumpIn * 0.6,
        yoyo: true,
        repeat: 1,
      })
      .to(sprite, { x: home.x, y: home.y, duration: TIMING.bumpOut, ease: 'back.out(2)' }, '<');
  }

  /**
   * One cascade round, timed by planRound: matched koi dive (a special's shape spirals into it), specials fire and
   * their blasts take their koi in their own rhythm, then the koi above swim down and new ones rise into the gaps.
   */
  async playStep(step: CascadeStep): Promise<void> {
    const plan = planRound(step, TIMING.specials);
    this.score(step);
    for (const blast of plan.blasts) this.specials.fx.fire(blast);
    // the koi above start swimming down while the last ones are still going
    const swimDelay =
      step.cleared.length > 0 ? Math.max(0, plan.end - TIMING.dive * (1 - TIMING.swimStartAt)) : 0;
    await Promise.all([
      ...step.created.map((made) => this.birth(made)),
      ...step.cleared.map((cleared) => this.leave(cleared, plan.clears.get(cleared.piece.id))),
      ...step.falls.map((fall) =>
        this.swim(this.view.spriteOf(fall.piece.id), fall.to, fall.to.row - fall.from.row, swimDelay),
      ),
      ...step.spawns.map((spawn) => this.rise(spawn, swimDelay)),
    ]);
    this.round++;
  }

  /** A special is born once its shape has spiralled into it: it takes its look, with a flash and a ring. */
  private async birth(made: Created): Promise<void> {
    const merge = made.from.length > 0 ? TIMING.specials.merge : 0;
    this.specials.fx.birth(made.at, made.piece.kind, merge);
    await gsap.to({}, { duration: merge });
    this.view.makeSpecial(made.piece);
  }

  /** A koi leaves the board the way its round's plan says, then its sprite goes. */
  private async leave({ piece, at }: Cleared, plan: ClearPlan | undefined): Promise<void> {
    const special = plan ? this.specialExit(piece, plan) : null;
    if (!special) {
      await this.dive(piece.id, at, plan?.delay ?? 0); // a plain dive, which removes the koi itself
      return;
    }
    await special;
    this.view.removePiece(piece.id);
  }

  /** The way a koi leaves around the specials (see SpecialMotions), or null when it simply dives. */
  private specialExit(piece: Piece, plan: ClearPlan): Promise<void> | null {
    const koi = this.view.spriteOf(piece.id);
    const { motions } = this.specials;
    const toward = plan.toward ? this.view.cellToPoint(plan.toward) : null;
    switch (plan.how) {
      case 'merge':
        return toward ? motions.merge(koi, toward, plan.delay, plan.lasts) : null;
      case 'drain':
        return toward ? motions.drain(koi, toward, plan.delay, plan.lasts) : null;
      case 'zap':
        return motions.zap(koi, plan.delay);
      case 'fire':
        return piece.special ? motions.exit(koi, piece.special, plan.delay, plan.lasts) : null;
      case 'dive':
        return null;
    }
  }

  /** Each match's points pop up over it (a cell shared by two matches counts once), and each blast's over its special. */
  private score(step: CascadeStep): void {
    const perPiece = scoreRound(step, this.round, this.pointsPerPiece) / Math.max(step.cleared.length, 1);
    const counted = new Set<string>();
    for (const match of step.matches) {
      const fresh = match.cells.filter((cell) => !counted.has(`${cell.col},${cell.row}`));
      for (const cell of fresh) counted.add(`${cell.col},${cell.row}`);
      if (fresh.length === 0) continue;
      const points = match.cells.map((cell) => this.view.cellToPoint(cell));
      this.fx.points(centreOf(points), Math.round(fresh.length * perPiece));
    }
    // each special's blast pops its points over the special
    step.fired.forEach((fired, blast) => {
      const taken = step.cleared.filter((cleared) => cleared.blast === blast).length;
      if (taken > 0) this.fx.points(this.view.cellToPoint(fired.at), Math.round(taken * perPiece));
    });
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
   * A matched koi dives: it tips forward and swims down into the deep along its heading, shrinking and taking on the
   * water's colour until it's gone, and the water closes over it with a ring. No flash, no squash: it swims away.
   */
  private async dive(id: number, at: Cell, delay = 0): Promise<void> {
    const koi = this.view.spriteOf(id);
    gsap.delayedCall(delay, () => {
      this.water.push(this.onStage(this.view.cellToPoint(at)), WATER.divePush, WATER.diveRadius);
    });
    const ahead = TIMING.diveGlide * this.cellSize;
    const deep = koi.restScale * TIMING.diveScale;
    const sink = { depth: 0 };
    await gsap
      .timeline({ delay })
      .to(
        koi,
        {
          x: koi.x + Math.sin(koi.rotation) * ahead,
          y: koi.y - Math.cos(koi.rotation) * ahead,
          duration: TIMING.dive,
          ease: 'sine.in',
        },
        0,
      )
      .to(koi.scale, { x: deep, y: deep, duration: TIMING.dive, ease: 'power1.in' }, 0)
      .to(
        sink,
        {
          depth: 1,
          duration: TIMING.dive,
          ease: 'power1.in',
          onUpdate: () => {
            koi.alpha = 1 - sink.depth * sink.depth;
            koi.tint = mixColor(WHITE, UNDERWATER, sink.depth);
          },
        },
        0,
      );
    this.view.removePiece(id);
  }

  /**
   * Swims down into a gap: the koi turns to face where it's going and swims there at swimming pace (longer
   * distances take longer, no gravity and no bounce). Its tail beats faster on its own while it moves.
   */
  private async swim(koi: Koi, to: Cell, rows: number, delay: number): Promise<void> {
    const target = this.view.cellToPoint(to);
    gsap.delayedCall(delay, () => {
      koi.turnToward(Math.atan2(target.x - koi.x, koi.y - target.y), 1);
    });
    await gsap.to(koi, {
      x: target.x,
      y: target.y,
      duration: TIMING.swimBase + TIMING.swimPerRow * rows,
      delay,
      ease: 'sine.inOut',
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
    await gsap
      .timeline({ delay: delay + TIMING.swimBase + spawn.order * TIMING.riseStagger })
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
