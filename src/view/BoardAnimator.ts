import { gsap } from 'gsap';
import { Point } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { TIMING } from '../config/timing';
import { WATER } from '../config/water';
import type { BoosterChange, BoosterUse } from '../model/boosters';
import type { CascadeStep, Cell, Cleared, Created, Piece, PlacedPiece, Spawn } from '../model/types';
import type { BoosterMotions } from './BoosterMotions';
import type { GameEventBus } from '../game/events';
import type { TurnAnimator } from '../game/GameScene';
import type { BoardView } from './BoardView';
import type { Koi } from './Koi';
import { rise, sink } from './motion/koiMotions';
import { play, wait } from './motion/play';
import { planRound } from './specialTiming';
import type { ClearPlan } from './specialTiming';
import { splitPoints } from './splitPoints';
import type { SpecialFx } from './SpecialFx';
import type { SpecialMotions } from './SpecialMotions';
import type { WaterSurface } from './water/PondWater';

/** What the animator plays with: the board, the water, the effects and motions, and the game's events. */
export interface AnimatorDeps {
  readonly view: BoardView;
  /** A cell's size (px): how far things travel. */
  readonly cell: number;
  readonly water: WaterSurface;
  /** The points that pop up over the matches. */
  readonly popups: MatchEffects;
  /** The specials' effects and the ways koi leave around them. */
  readonly specials: { readonly fx: SpecialFx; readonly motions: SpecialMotions };
  /** The boosters' motions, and where the feed's pellets are thrown from (board space). */
  readonly boosters: { readonly motions: BoosterMotions; readonly feedFrom: () => PointData };
  /** Where the animator says what happened (a koi diving, a special born), timed to the motion. */
  readonly events: GameEventBus;
}

/** The match effects over the water, in the board's space (one splash per match, points). */
export interface MatchEffects {
  points(at: PointData, amount: number): void;
}

/** How a koi leaves the board around the specials, by the way its round's plan says it goes; null when it dives. */
type ExitMotion = (koi: Koi, piece: Piece, plan: ClearPlan) => Promise<void> | null;

/**
 * Plays the model's results on the board view, koi-pond style: the dragged koi rises and passes over the other,
 * matched koi kick and dive into the deep under a splash of rings, the koi above glide down, and new koi rise from
 * the deep into the gaps. Every method returns a promise that resolves when the motion ends, so the scene can await
 * the turn step by step instead of chaining callbacks.
 */
export class BoardAnimator implements TurnAnimator {
  private readonly view: BoardView;
  private readonly cellSize: number;
  private readonly water: WaterSurface;
  private readonly fx: MatchEffects;
  private readonly specials: AnimatorDeps['specials'];
  private readonly boosters: AnimatorDeps['boosters'];
  private readonly events: GameEventBus;
  /** How a koi leaves, by the way its plan says it goes. */
  private readonly exits: Record<ClearPlan['how'], ExitMotion>;

  constructor(deps: AnimatorDeps) {
    this.view = deps.view;
    this.cellSize = deps.cell;
    this.water = deps.water;
    this.fx = deps.popups;
    this.specials = deps.specials;
    this.boosters = deps.boosters;
    this.events = deps.events;
    this.exits = this.exitMotions();
  }

  /** A booster changed the board: the view plays it (a leap, a feeding, a koi powering up) before it settles. */
  async playBooster(use: BoosterUse, change: BoosterChange): Promise<void> {
    const { motions, feedFrom } = this.boosters;
    if (use.type === 'swap') await motions.leap(change.moved);
    else if (use.type === 'feed' && change.fed !== undefined) {
      await motions.feed(change.moved, use.at, change.fed, feedFrom());
    } else {
      await Promise.all(
        change.made.map(({ piece, at }) =>
          motions.powerUp(piece, at, () => {
            this.view.makeSpecial(piece);
            this.specials.fx.birth(at, piece.kind, 0);
            if (piece.special) this.events.emit('specialBorn', { type: piece.special.type });
          }),
        ),
      );
    }
  }

  /**
   * Two koi trade places: the one the player dragged lifts toward the surface and passes over the other. They shove
   * the water apart as they go, and each one settles into its new cell with a small push.
   */
  async swap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
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

  /** A koi swiped into the bank (off the board, or a hole): it leans toward it and springs back, like a bad swap. */
  async bumpBank(koi: PlacedPiece, toward: Cell): Promise<void> {
    this.view.bringToFront(this.view.spriteOf(koi.piece.id));
    this.stir(koi.at, toward, WATER.invalidSwapPush);
    await this.lean(koi, toward, TIMING.swapLift);
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
    const bump = gsap
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
    await play(bump);
  }

  /**
   * One cascade round, timed by planRound: matched koi dive (a special's shape spirals into it), specials fire and
   * their blasts take their koi in their own rhythm, then the koi above swim down and new ones rise into the gaps.
   * `points` is what the scene scored for the round: its popups show exactly that.
   */
  async playStep(step: CascadeStep, points: number): Promise<void> {
    const plan = planRound(step, TIMING.specials);
    this.score(step, points);
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
  }

  /** A special is born once its shape has spiralled into it: it takes its look, with a flash and a ring. */
  private async birth(made: Created): Promise<void> {
    const merge = made.from.length > 0 ? TIMING.specials.merge : 0;
    this.specials.fx.birth(made.at, made.piece.kind, merge);
    await wait(merge);
    this.view.makeSpecial(made.piece);
    if (made.piece.special) this.events.emit('specialBorn', { type: made.piece.special.type });
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
    return this.exits[plan.how](this.view.spriteOf(piece.id), piece, plan);
  }

  private exitMotions(): Record<ClearPlan['how'], ExitMotion> {
    const { motions } = this.specials;
    const toward = (plan: ClearPlan): PointData | null =>
      plan.toward ? this.view.cellToPoint(plan.toward) : null;
    return {
      dive: () => null,
      merge: (koi, _piece, plan) => {
        const into = toward(plan);
        return into ? motions.merge(koi, into, plan.delay, plan.lasts) : null;
      },
      drain: (koi, _piece, plan) => {
        const into = toward(plan);
        return into ? motions.drain(koi, into, plan.delay, plan.lasts) : null;
      },
      zap: (koi, _piece, plan) => motions.zap(koi, plan.delay),
      fire: (koi, piece, plan) =>
        piece.special ? motions.exit(koi, piece.special, plan.delay, plan.lasts) : null,
    };
  }

  /** The round's points pop up over its matches and over each special that fired (see splitPoints). */
  private score(step: CascadeStep, points: number): void {
    for (const { over, amount } of splitPoints(step, points)) {
      this.fx.points(centreOf(over.map((cell) => this.view.cellToPoint(cell))), amount);
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
    await play(
      gsap
        .timeline()
        .to(koi, { x: target.x, y: target.y, duration: TIMING.swap, ease: 'power2.inOut' }, 0)
        .to(
          koi.scale,
          { x: size, y: size, duration: TIMING.swap / 2, ease: 'sine.out', yoyo: true, repeat: 1 },
          0,
        ),
    );
  }

  private async lean(placed: PlacedPiece, toward: Cell, peak: number): Promise<void> {
    const koi = this.view.spriteOf(placed.piece.id);
    const reach = TIMING.invalidReach * this.cellSize;
    const size = koi.restScale * peak;
    const half = TIMING.invalidSwap / 2;
    const lean = gsap
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
    await play(lean);
  }

  /**
   * A matched koi dives: it tips forward and swims down into the deep along its heading, shrinking and taking on the
   * water's colour until it's gone, and the water closes over it with a ring. No flash, no squash: it swims away.
   */
  private async dive(id: number, at: Cell, delay = 0): Promise<void> {
    const koi = this.view.spriteOf(id);
    gsap.delayedCall(delay, () => {
      this.water.push(this.onStage(this.view.cellToPoint(at)), WATER.divePush, WATER.diveRadius);
      this.events.emit('dive');
    });
    const ahead = TIMING.diveGlide * this.cellSize;
    const glide = {
      x: koi.x + Math.sin(koi.rotation) * ahead,
      y: koi.y - Math.cos(koi.rotation) * ahead,
      duration: TIMING.dive,
      ease: 'sine.in',
    };
    await play(gsap.timeline({ delay }).to(koi, glide, 0).add(sink(koi, TIMING.dive), 0));
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
    await play(
      gsap.to(koi, {
        x: target.x,
        y: target.y,
        duration: TIMING.swimBase + TIMING.swimPerRow * rows,
        delay,
        ease: 'sine.inOut',
      }),
    );
    this.events.emit('land');
  }

  /** A new koi rises from the deep into its cell, the lowest of a column first, and breaks the surface. */
  private async rise(spawn: Spawn, delay: number): Promise<void> {
    const koi = this.view.addPiece(spawn.piece, spawn.to);
    const point = this.view.cellToPoint(spawn.to);
    const surfaces = (): void => {
      this.water.push(this.onStage(point), WATER.surfacePush, WATER.diveRadius);
    };
    await play(
      gsap
        .timeline({ delay: delay + TIMING.swimBase + spawn.order * TIMING.riseStagger })
        .add(rise(koi, TIMING.rise))
        .call(surfaces, [], TIMING.rise * TIMING.riseSurfaceAt),
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
