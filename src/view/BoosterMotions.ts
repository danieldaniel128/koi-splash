import { gsap } from 'gsap';
import { Container, Sprite, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { paintPellet } from '../art/pellet';
import { BOOSTER_MOTION } from '../config/specials';
import { WATER } from '../config/water';
import type { Moved } from '../model/boosters';
import type { Cell, Kind, Piece } from '../model/types';
import type { BoardView } from './BoardView';
import type { GameEventBus } from '../game/events';
import { hitStop } from './hitStop';
import type { Koi } from './Koi';
import type { WaterSurface } from './water/PondWater';

/** One koi's leap: where from and to (board space), how long, how high (cells), which way it bows, how it turns. */
interface Leap {
  readonly from: PointData;
  readonly to: PointData;
  readonly duration: number;
  readonly height: number;
  readonly bow: number;
  readonly spin: (k: number) => number;
}

/**
 * The boosters played on the board, after the prototype. Each resolves when the board is still, ready to settle.
 * - swap: the two koi leap out of the water in crossing arcs bowed the same way, the first higher with a full spin,
 *   the second lower with a tilt, landing just before it; the game catches its breath as they cross
 * - feed: pellets are lobbed from the button and float by the food; the koi of its colour turn to it and swim into
 *   their lines along bowed paths, one after another, the koi in their way sliding into the cells they left
 * - special: the koi rises and spins up into its special, sparkles swirling into it
 * Lives in the board's space, over the koi (the pellets and sparkles).
 */
export class BoosterMotions extends Container {
  private readonly pellet: Texture;

  private readonly view: BoardView;
  private readonly water: WaterSurface;
  private readonly cell: number;
  private readonly sparkle: Texture;
  private readonly events: GameEventBus;

  constructor(deps: {
    readonly view: BoardView;
    readonly water: WaterSurface;
    readonly cell: number;
    /** The sparkle the special booster swirls in. */
    readonly sparkle: Texture;
    /** Where it says when each motion's moments happen (the sounds follow them). */
    readonly events: GameEventBus;
  }) {
    super();
    this.view = deps.view;
    this.water = deps.water;
    this.cell = deps.cell;
    this.sparkle = deps.sparkle;
    this.events = deps.events;
    this.pellet = Texture.from(paintPellet(Math.ceil(deps.cell * BOOSTER_MOTION.feed.pellet)));
  }

  /** Two koi leap out of the water and land in each other's cells, crossing in the air. */
  async leap([first, second]: readonly Moved[]): Promise<void> {
    if (!first || !second) return;
    const look = BOOSTER_MOTION.swap;
    const apart = Math.hypot(first.to.col - first.from.col, first.to.row - first.from.row);
    const duration = Math.min(look.max, Math.max(look.min, look.min + (apart - 1) * look.perCell));
    const height = look.height * (0.75 + 0.25 * Math.min(1, apart / 4)); // a far leap goes higher
    const a = this.koiOf(first.piece);
    const b = this.koiOf(second.piece);
    const headingA = a.heading;
    const headingB = b.heading;
    this.events.emit('koiLeapt', { duration });
    gsap.delayedCall(duration * 0.47, () => {
      hitStop(look.hitStop);
    });
    await Promise.all([
      this.arc(a, first, {
        ...this.path(first, look.bend),
        duration,
        height,
        spin: (k) => headingA + Math.PI * 2 * easeInOut(k),
      }),
      this.arc(b, second, {
        ...this.path(second, -look.bend),
        duration: duration * look.second,
        height: height * look.height2,
        spin: (k) => headingB + look.tilt * Math.sin(Math.PI * k),
      }),
    ]);
  }

  /**
   * Feeding: pellets are lobbed from `thrownFrom` (board space) to the food, the koi of its colour turn to it, then
   * each moved koi swims to its new cell, the school first and the koi pushed aside after them.
   */
  async feed(moved: readonly Moved[], food: Cell, kind: Kind, thrownFrom: PointData): Promise<void> {
    const look = BOOSTER_MOTION.feed;
    const target = this.view.cellToPoint(food);
    this.throwPellets(thrownFrom, target);
    this.events.emit('pelletsThrown');
    const school = moved.filter((move) => move.piece.kind === kind);
    for (const move of school) this.faceToward(this.koiOf(move.piece), target);
    const start = look.throw + look.turn * 0.5;
    await Promise.all(
      moved.map((move, rank) => {
        const lead = school.includes(move);
        const delay = start + rank * look.stagger + (lead ? 0 : look.pushed);
        return this.swimTo(this.koiOf(move.piece), move, delay, lead ? target : null);
      }),
    );
    await wait(look.hold);
  }

  /** A koi rises out of the water and spins up, sparkles swirling in; `becomes` turns it special as it comes down. */
  async powerUp(piece: Piece, at: Cell, becomes: () => void): Promise<void> {
    const look = BOOSTER_MOTION.special;
    const koi = this.koiOf(piece);
    const rest = koi.restScale;
    const home = this.view.cellToPoint(at);
    const heading = koi.heading;
    this.swirlSparkles(home, look.spin);
    this.events.emit('koiMorphed');
    const k = { t: 0 };
    await gsap.to(k, {
      t: 1,
      duration: look.spin,
      ease: 'none',
      onUpdate: () => {
        const up = Math.sin(Math.PI * k.t);
        koi.y = home.y - up * look.rise * this.cell;
        koi.scale.set(rest * (1 + 0.42 * up * look.rise));
        koi.heading = heading + Math.PI * 2 * look.spinTurns * easeInOut(k.t);
      },
    });
    koi.position.copyFrom(home);
    koi.scale.set(rest);
    becomes();
    this.splash(at, WATER.bumpPush);
  }

  /** A leap's path: its two ends, and its bow (signed, cells of sideways per cell of length). */
  private path(move: Moved, bend: number): Pick<Leap, 'from' | 'to' | 'bow'> {
    return { from: this.view.cellToPoint(move.from), to: this.view.cellToPoint(move.to), bow: bend };
  }

  /** One koi's leap: out of the water, over, into its new cell, growing at the top and turning as it goes. */
  private async arc(koi: Koi, move: Moved, leap: Leap): Promise<void> {
    const look = BOOSTER_MOTION.swap;
    const { from, to } = leap;
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
    const rest = koi.restScale;
    this.view.bringToFront(koi);
    this.splash(move.from, WATER.bumpPush);
    const k = { t: 0 };
    await gsap.to(k, {
      t: 1,
      duration: leap.duration,
      ease: 'none',
      onUpdate: () => {
        const along = (k.t + smoothstep(k.t)) / 2; // half eased: it leaves and lands softly
        const up = Math.sin(Math.PI * k.t);
        const bow = leap.bow * length * up;
        koi.x = from.x + (to.x - from.x) * along + normal.x * bow;
        koi.y = from.y + (to.y - from.y) * along + normal.y * bow - leap.height * this.cell * up;
        koi.scale.set(rest * (1 + look.grow * leap.height * up));
        koi.heading = leap.spin(k.t);
      },
    });
    koi.position.copyFrom(to);
    koi.scale.set(rest);
    this.splash(move.to, WATER.bumpPush * 1.5);
    this.events.emit('koiLanded', { low: leap.bow < 0 }); // the second koi bows the other way and plops lower
  }

  /** A koi swims to its new cell along a bowed path; a koi of the school turns to the food once it's there. */
  private async swimTo(koi: Koi, move: Moved, delay: number, food: PointData | null): Promise<void> {
    const look = BOOSTER_MOTION.feed;
    const from = this.view.cellToPoint(move.from);
    const to = this.view.cellToPoint(move.to);
    const cells = Math.hypot(move.to.col - move.from.col, move.to.row - move.from.row);
    const duration = Math.min(look.swimMax, look.swim0 + cells * look.swimPer);
    const side = move.piece.id % 2 === 0 ? 1 : -1;
    const offset = look.bend * Math.min(cells, 3) * side; // the bow, as a share of the path
    const control = {
      x: (from.x + to.x) / 2 - (to.y - from.y) * offset,
      y: (from.y + to.y) / 2 + (to.x - from.x) * offset,
    };
    const k = { t: 0 };
    await gsap.to(k, {
      t: 1,
      delay,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const u = 1 - k.t;
        const x = u * u * from.x + 2 * u * k.t * control.x + k.t * k.t * to.x;
        const y = u * u * from.y + 2 * u * k.t * control.y + k.t * k.t * to.y;
        if (Math.hypot(x - koi.x, y - koi.y) > 0.1) this.faceToward(koi, { x, y });
        koi.position.set(x, y);
      },
    });
    if (!food) return;
    this.faceToward(koi, food);
    this.events.emit('koiFed');
  }

  /** A handful of pellets thrown in a high lob, landing scattered round the food, floating a while, then gone. */
  private throwPellets(from: PointData, food: PointData): void {
    const look = BOOSTER_MOTION.feed;
    for (let i = 0; i < look.pellets; i++) {
      const angle = Math.random() * Math.PI * 2;
      const reach = Math.sqrt(Math.random()) * look.scatter * this.cell;
      const land = { x: food.x + Math.cos(angle) * reach, y: food.y + Math.sin(angle) * reach };
      const pellet = new Sprite(this.pellet);
      pellet.anchor.set(0.5);
      this.addChild(pellet);
      const k = { t: 0 };
      gsap
        .timeline({
          onComplete: () => {
            pellet.destroy();
          },
        })
        .to(k, {
          t: 1,
          duration: look.throw * (0.85 + Math.random() * 0.27),
          ease: 'none',
          onUpdate: () => {
            const z = Math.sin(Math.PI * k.t) * look.lob * this.cell; // the lob's height
            pellet.position.set(from.x + (land.x - from.x) * k.t, from.y + (land.y - from.y) * k.t - z);
            pellet.scale.set(1 + z / (this.cell * 3));
          },
          onComplete: () => {
            this.water.push(this.onStage(land), WATER.surfacePush, WATER.diveRadius);
          },
        })
        .to(pellet, {
          x: land.x + (Math.random() - 0.5) * 4,
          y: land.y + (Math.random() - 0.5) * 4,
          duration: look.food,
        })
        .to(pellet, { alpha: 0, duration: 0.25 }, '-=0.25');
    }
  }

  /** Sparkles spiralling into a point over `duration`. */
  private swirlSparkles(centre: PointData, duration: number): void {
    const count = Math.round(BOOSTER_MOTION.special.sparkles * duration);
    for (let i = 0; i < count; i++) {
      const sparkle = new Sprite(this.sparkle);
      sparkle.anchor.set(0.5);
      sparkle.blendMode = 'add';
      sparkle.setSize(this.cell * (0.18 + Math.random() * 0.08));
      this.addChild(sparkle);
      const start = Math.random() * Math.PI * 2;
      const reach = this.cell * (0.7 + Math.random() * 0.4);
      const k = { t: 0 };
      gsap.to(k, {
        t: 1,
        delay: (i / count) * duration,
        duration: 0.35,
        ease: 'power1.in',
        onUpdate: () => {
          const angle = start + 0.9 * k.t * Math.PI;
          sparkle.position.set(
            centre.x + Math.cos(angle) * reach * (1 - k.t),
            centre.y + Math.sin(angle) * reach * (1 - k.t),
          );
          sparkle.alpha = Math.sin(Math.PI * k.t);
        },
        onComplete: () => {
          sparkle.destroy();
        },
      });
    }
  }

  private faceToward(koi: Koi, point: PointData): void {
    koi.turnToward(Math.atan2(point.x - koi.x, koi.y - point.y), 1);
  }

  private koiOf(piece: Piece): Koi {
    return this.view.spriteOf(piece.id);
  }

  private splash(at: Cell, strength: number): void {
    this.water.push(this.onStage(this.view.cellToPoint(at)), strength, WATER.swapRadius);
  }

  private onStage(point: PointData): PointData {
    return { x: this.view.x + point.x, y: this.view.y + point.y };
  }
}

function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    gsap.delayedCall(seconds, resolve);
  });
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
