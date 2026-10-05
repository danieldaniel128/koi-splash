import type { FederatedPointerEvent } from 'pixi.js';
import type { BoardView } from './BoardView';
import { SwipeTracker } from './SwipeTracker';
import type { BoardGestures } from './SwipeTracker';

/**
 * The board's pointer input: Pixi's pointer events on the board, fed to a SwipeTracker that turns them into swipes
 * and taps. Pixi doesn't pass on a cancelled pointer, so that comes from the canvas itself, and a gesture is dropped
 * when the window loses focus or the page is hidden, since its end may never arrive. A right click or a long press
 * on the canvas opens no browser menu over the game.
 */
export class SwipeInput {
  private readonly tracker: SwipeTracker;

  constructor(
    private readonly view: BoardView,
    private readonly canvas: HTMLElement,
    thresholdPx: number,
    gestures: BoardGestures,
  ) {
    this.tracker = new SwipeTracker((point) => view.pointToCell(point), thresholdPx, gestures);
    view.eventMode = 'static';
    view.on('pointerdown', this.handleDown);
    view.on('globalpointermove', this.handleMove);
    view.on('pointerup', this.handleUp);
    view.on('pointerupoutside', this.handleLeave);
    canvas.addEventListener('pointercancel', this.handleCancel);
    canvas.addEventListener('contextmenu', this.handleMenu);
    window.addEventListener('blur', this.handleLost);
    document.addEventListener('visibilitychange', this.handleLost);
  }

  destroy(): void {
    this.view.off('pointerdown', this.handleDown);
    this.view.off('globalpointermove', this.handleMove);
    this.view.off('pointerup', this.handleUp);
    this.view.off('pointerupoutside', this.handleLeave);
    this.canvas.removeEventListener('pointercancel', this.handleCancel);
    this.canvas.removeEventListener('contextmenu', this.handleMenu);
    window.removeEventListener('blur', this.handleLost);
    document.removeEventListener('visibilitychange', this.handleLost);
  }

  // Arrow functions keep `this` bound when Pixi calls them as event listeners.
  private readonly handleDown = (event: FederatedPointerEvent): void => {
    const point = this.view.toLocal(event.global);
    this.tracker.down({ id: event.pointerId, point, primary: event.isPrimary, button: event.button });
  };

  private readonly handleMove = (event: FederatedPointerEvent): void => {
    this.tracker.move(event.pointerId, this.view.toLocal(event.global));
  };

  private readonly handleUp = (event: FederatedPointerEvent): void => {
    this.tracker.up(event.pointerId);
  };

  private readonly handleLeave = (event: FederatedPointerEvent): void => {
    this.tracker.cancel(event.pointerId);
  };

  private readonly handleCancel = (event: PointerEvent): void => {
    this.tracker.cancel(event.pointerId);
  };

  private readonly handleLost = (): void => {
    this.tracker.reset();
  };

  private readonly handleMenu = (event: Event): void => {
    event.preventDefault();
  };
}
