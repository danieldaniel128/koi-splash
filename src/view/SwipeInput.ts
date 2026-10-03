import type { FederatedPointerEvent, PointData } from 'pixi.js';
import type { Cell } from '../model/types';
import type { BoardView } from './BoardView';
import { swipeTarget } from './swipeTarget';

export type SwipeHandler = (from: Cell, to: Cell) => void;

/**
 * Turns a finger (or mouse) drag on the board into one swap request. A swipe reports once, as soon as it passes the
 * threshold, then ignores the rest of the drag until the finger lifts.
 */
export class SwipeInput {
  private start: { readonly cell: Cell; readonly point: PointData } | null = null;

  constructor(
    private readonly view: BoardView,
    private readonly thresholdPx: number,
    private readonly onSwipe: SwipeHandler,
  ) {
    view.eventMode = 'static';
    view.on('pointerdown', this.handleDown);
    view.on('globalpointermove', this.handleMove);
    view.on('pointerup', this.handleUp);
    view.on('pointerupoutside', this.handleUp);
  }

  destroy(): void {
    this.view.off('pointerdown', this.handleDown);
    this.view.off('globalpointermove', this.handleMove);
    this.view.off('pointerup', this.handleUp);
    this.view.off('pointerupoutside', this.handleUp);
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
    this.onSwipe(from, target);
  };

  private readonly handleUp = (): void => {
    this.start = null;
  };
}
