import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { BOOSTER_MARKS } from '../config/specials';
import type { Cell } from '../model/types';
import type { Koi } from './Koi';

/** What the marks need from the board: its koi by cell, and where its cells are. */
export interface MarkedBoard {
  koiAt(cell: Cell): Koi | null;
  koi(): Iterable<Koi>;
  cellOf(koi: Koi): Cell | null;
}

/**
 * The board's answer while a booster is armed (after the prototype): the koi it can't take dim, the ones it can pulse
 * in a slow wave across the pond, the picked koi lifts out of the water over a gold ring, and a tap it can't take
 * makes that koi wobble. Follows the koi every frame; lives in the board's space, under the koi (the ring).
 */
export class BoardMarks extends Container {
  private test: ((cell: Cell) => boolean) | null = null;
  private picked: Koi | null = null;
  private readonly ring = new Graphics();
  private dim = 0;
  private time = 0;

  constructor(
    private readonly board: MarkedBoard,
    private readonly cell: number,
  ) {
    super();
    this.ring.blendMode = 'add';
    this.addChild(this.ring);
  }

  /** Marks the koi a booster can take (`test`), or clears the marks (null): every koi back as it was. */
  show(test: ((cell: Cell) => boolean) | null): void {
    this.test = test;
    if (test) return;
    this.lift(null);
    this.dim = 0;
    for (const koi of this.board.koi()) {
      koi.alpha = 1;
      koi.scale.set(koi.restScale);
    }
  }

  /** Lifts a picked koi out of the water (null: it settles back). */
  lift(cell: Cell | null): void {
    if (this.picked && !this.picked.destroyed) this.picked.scale.set(this.picked.restScale);
    this.picked = cell ? this.board.koiAt(cell) : null;
  }

  /** A tap the booster can't take: that koi wobbles. */
  shake(cell: Cell): void {
    const koi = this.board.koiAt(cell);
    if (!koi) return;
    const home = koi.x;
    gsap
      .timeline()
      .to(koi, { x: home - this.cell * 0.08, duration: 0.06 })
      .to(koi, { x: home + this.cell * 0.06, duration: 0.08 })
      .to(koi, { x: home, duration: 0.12, ease: 'back.out(3)' });
  }

  /**
   * While a booster is armed (the board is still then), every koi takes its mark. Call once per frame after the koi
   * moved; it does nothing when no booster is armed, so it never fights the turn's animations. O(koi).
   */
  follow(deltaSeconds: number): void {
    this.time += deltaSeconds;
    const test = this.test;
    if (test) {
      this.dim += (1 - this.dim) * Math.min(1, deltaSeconds * BOOSTER_MARKS.dimIn);
      for (const koi of this.board.koi()) if (koi !== this.picked) this.mark(koi, test);
    }
    this.drawPicked();
  }

  /** A koi the booster can take pulses in a wave across the pond; one it can't dims. */
  private mark(koi: Koi, test: (cell: Cell) => boolean): void {
    const look = BOOSTER_MARKS;
    const cell = this.board.cellOf(koi);
    if (!cell || !test(cell)) {
      koi.alpha = 1 - look.dim * this.dim;
      koi.scale.set(koi.restScale);
      return;
    }
    koi.alpha = 1;
    const wave = 0.5 + 0.5 * Math.sin(this.time * look.pulseSpeed - (cell.col + cell.row) * 0.6);
    koi.scale.set(koi.restScale * (1 + look.pulse * wave));
  }

  /** The picked koi floats a little above the water over a pulsing gold ring with two pink arcs turning round it. */
  private drawPicked(): void {
    this.ring.clear();
    const koi = this.picked;
    if (!koi || koi.destroyed) return;
    const look = BOOSTER_MARKS;
    const beat = 0.5 + 0.5 * Math.sin(this.time * 6);
    koi.scale.set(koi.restScale * (1 + look.lift * 0.42));
    const { x, y } = koi.position;
    this.ring
      .circle(x, y, this.cell * (0.5 + 0.03 * beat))
      .stroke({ width: 3, color: look.gold, alpha: 0.7 + 0.3 * beat });
    for (const offset of [0, Math.PI]) {
      const start = this.time * 2.4 + offset;
      this.ring
        .arc(x, y, this.cell * 0.6, start, start + 1.6)
        .stroke({ width: 2, color: look.pink, alpha: 0.8 });
    }
  }
}
