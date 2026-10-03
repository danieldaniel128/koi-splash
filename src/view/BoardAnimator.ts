import { gsap } from 'gsap';
import type { Sprite } from 'pixi.js';
import { TIMING } from '../config/timing';
import type { CascadeStep, Cell, Fall, Piece, Spawn } from '../model/types';
import type { BoardView } from './BoardView';

/** A piece and the cell it sits in when an animation starts. */
export interface PlacedPiece {
  readonly piece: Piece;
  readonly at: Cell;
}

/**
 * Plays the model's results on the board view. Every method returns a promise that resolves when the motion ends,
 * so the scene can await the turn step by step instead of chaining callbacks.
 */
export class BoardAnimator {
  constructor(
    private readonly view: BoardView,
    private readonly cellSize: number,
  ) {}

  /** Two koi trade places. */
  async swap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    await Promise.all([this.slide(first, second.at), this.slide(second, first.at)]);
  }

  /** A swap that makes no match: both koi lean toward each other and spring back. */
  async invalidSwap(first: PlacedPiece, second: PlacedPiece): Promise<void> {
    await Promise.all([this.lean(first, second.at), this.lean(second, first.at)]);
  }

  /** One cascade round: matched koi shrink away while the koi above fall and new ones drop in. */
  async playStep(step: CascadeStep): Promise<void> {
    const fallDelay = step.cleared.length > 0 ? TIMING.clear * TIMING.fallStartAt : 0;
    await Promise.all([
      ...step.cleared.map(({ piece }) => this.vanish(piece.id)),
      ...step.falls.map((fall) => this.drop(this.view.spriteOf(fall.piece.id), fall, fallDelay)),
      ...step.spawns.map((spawn) => this.dropIn(spawn, fallDelay)),
    ]);
  }

  private async slide(placed: PlacedPiece, to: Cell): Promise<void> {
    const target = this.view.cellToPoint(to);
    await gsap.to(this.view.spriteOf(placed.piece.id), {
      x: target.x,
      y: target.y,
      duration: TIMING.swap,
      ease: 'power2.inOut',
    });
  }

  private async lean(placed: PlacedPiece, toward: Cell): Promise<void> {
    const sprite = this.view.spriteOf(placed.piece.id);
    const reach = TIMING.invalidReach * this.cellSize;
    await gsap.to(sprite, {
      x: sprite.x + Math.sign(toward.col - placed.at.col) * reach,
      y: sprite.y + Math.sign(toward.row - placed.at.row) * reach,
      duration: TIMING.invalidSwap / 2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });
  }

  private async vanish(id: number): Promise<void> {
    const sprite = this.view.spriteOf(id);
    await gsap.to(sprite.scale, { x: 0, y: 0, duration: TIMING.clear, ease: 'back.in(2)' });
    this.view.removePiece(id);
  }

  private async dropIn(spawn: Spawn, delay: number): Promise<void> {
    const sprite = this.view.addPiece(spawn.piece, spawn.from);
    // the lowest new koi in a column leads, the ones above follow a beat later
    const rowsAboveBoard = -spawn.from.row - 1;
    await this.drop(sprite, spawn, delay + rowsAboveBoard * TIMING.spawnStagger);
  }

  /** Falls under gravity (longer drops take longer), then a small hop on landing. */
  private async drop(sprite: Sprite, move: Fall | Spawn, delay: number): Promise<void> {
    const target = this.view.cellToPoint(move.to);
    const rows = move.to.row - move.from.row;
    const fallTime = Math.sqrt((2 * rows) / TIMING.gravity);
    await gsap
      .timeline({ delay })
      .to(sprite, { y: target.y, duration: fallTime, ease: 'power2.in' })
      .to(sprite, { y: target.y - TIMING.landBounce, duration: TIMING.landBounceTime, ease: 'power1.out' })
      .to(sprite, { y: target.y, duration: TIMING.landBounceTime, ease: 'power1.in' });
  }
}
