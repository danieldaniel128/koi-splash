import type { PointData } from 'pixi.js';
import type { Cell } from '../model/types';
import { swipeTarget } from './swipeTarget';

/** What the board's input reports: a swipe from one cell to its neighbour, or a tap on a cell. */
export interface BoardGestures {
  swipe(from: Cell, to: Cell): void;
  tap(cell: Cell): void;
}

/** A pointer going down: which one, where (board px), whether it's the first finger, and which mouse button. */
export interface PointerPress {
  readonly id: number;
  readonly point: PointData;
  readonly primary: boolean;
  readonly button: number;
}

/** The mouse's main button (a finger or a pen tip reports it too). */
const MAIN_BUTTON = 0;

/**
 * Follows one finger (or the mouse) on the board and reports its gesture. A drag reports one swipe as soon as it
 * passes the threshold, then ignores the rest of the drag until the finger lifts; a finger that lifts before that is
 * a tap on its cell. Only the pointer that started the gesture counts: a second finger, another finger's move and a
 * right click are ignored. It knows nothing of Pixi or the DOM: SwipeInput feeds it.
 */
export class SwipeTracker {
  private start: { readonly id: number; readonly cell: Cell; readonly point: PointData } | null = null;

  constructor(
    private readonly cellAt: (point: PointData) => Cell | null,
    private readonly thresholdPx: number,
    private readonly gestures: BoardGestures,
  ) {}

  /**
   * A pointer went down. The first finger (or the main button) starts a gesture on its cell; it also replaces a
   * gesture whose end was never heard, since no other finger can be down then.
   */
  down(press: PointerPress): void {
    if (!press.primary || press.button !== MAIN_BUTTON) return;
    const cell = this.cellAt(press.point);
    this.start = cell ? { id: press.id, cell, point: press.point } : null;
  }

  move(id: number, point: PointData): void {
    if (this.start?.id !== id) return;
    const dx = point.x - this.start.point.x;
    const dy = point.y - this.start.point.y;
    const target = swipeTarget(this.start.cell, dx, dy, this.thresholdPx);
    if (!target) return;

    const from = this.start.cell;
    this.start = null; // one swap per swipe
    this.gestures.swipe(from, target);
  }

  /** The finger lifted before it swiped: a tap on the cell it went down on. */
  up(id: number): void {
    if (this.start?.id !== id) return;
    const tapped = this.start.cell;
    this.start = null;
    this.gestures.tap(tapped);
  }

  /** The gesture's pointer was lost (it lifted off the board, or the browser took it): nothing happens. */
  cancel(id: number): void {
    if (this.start?.id === id) this.start = null;
  }

  /** Forgets any gesture going on (the window lost focus, the page was hidden): its end may never come. */
  reset(): void {
    this.start = null;
  }
}
