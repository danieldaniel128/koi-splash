import type { FederatedPointerEvent, PointData } from 'pixi.js';
import type { Cell } from '../model/types';
import type { BoardView } from './BoardView';
import { swipeTarget } from './swipeTarget';

/** What the board's input reports: a swipe from one cell to its neighbour, or a tap on a cell. */
export interface BoardGestures {
  swipe(from: Cell, to: Cell): void;
  tap(cell: Cell): void;
}

/**
 * Turns a finger (or mouse) on the board into gestures. A drag reports one swipe as soon as it passes the threshold,
 * then ignores the rest of the drag until the finger lifts; a finger that lifts before that is a tap on its cell.
 */
export class SwipeInput {
  private start: { readonly cell: Cell; readonly point: PointData } | null = null;

  constructor(
    private readonly view: BoardView,
    private readonly thresholdPx: number,
    private readonly gestures: BoardGestures,
  ) {
    view.eventMode = 'static';
    view.on('pointerdown', this.handleDown);
    view.on('globalpointermove', this.handleMove);
    view.on('pointerup', this.handleUp);
    view.on('pointerupoutside', this.handleCancel);
  }

  destroy(): void {
    this.view.off('pointerdown', this.handleDown);
    this.view.off('globalpointermove', this.handleMove);
    this.view.off('pointerup', this.handleUp);
    this.view.off('pointerupoutside', this.handleCancel);
  }

  // Arrow functions keep `this` bound when Pixi calls them as event listeners.
  private readonly handleDown = (event: FederatedPointerEvent): void => {
    const point = this.view.toLocal(event.global);
    const cell = this.view.pointToCell(point);
    this.start = cell ? { cell, point } : null;
  };

  private readonly handleMove = (event: FederatedPointerEvent): void => {
    if (!this.start) return;
    const point = this.view.toLocal(event.global);
    const dx = point.x - this.start.point.x;
    const dy = point.y - this.start.point.y;
    const target = swipeTarget(this.start.cell, dx, dy, this.thresholdPx);
    if (!target) return;

    const from = this.start.cell;
    this.start = null; // one swap per swipe
    this.gestures.swipe(from, target);
  };

  /** The finger lifted before it swiped: a tap on the cell it went down on. */
  private readonly handleUp = (): void => {
    const tapped = this.start?.cell;
    this.start = null;
    if (tapped) this.gestures.tap(tapped);
  };

  private readonly handleCancel = (): void => {
    this.start = null;
  };
}
