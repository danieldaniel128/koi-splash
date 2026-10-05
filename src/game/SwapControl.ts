import type { Cell } from '../model/types';
import { isAdjacent, sameCell } from '../model/types';

/** What swapping by hand needs from the game: whether it takes a swap now, where the koi are, and the swap. */
export interface SwapGame {
  readonly canSwap: boolean;
  hasKoi(cell: Cell): boolean;
  handleSwipe(from: Cell, to: Cell): void;
}

/** The board's mark for a picked koi: it lifts over a gold ring (null settles it back). */
export interface PickMark {
  lift(cell: Cell | null): void;
}

/**
 * Swapping by hand: a swipe swaps a koi with the neighbour it points at, and so do two taps, on a koi and then on
 * its neighbour. The first tap picks the koi (it lifts over the gold ring, as with the Swap booster); tapping it
 * again puts it back, and tapping a koi further away picks that one instead. A swipe, an armed booster or a new
 * level drops the pick, so a picked koi never outlives the board it was picked on.
 */
export class SwapControl {
  private picked: Cell | null = null;

  constructor(
    private readonly game: SwapGame,
    private readonly mark: PickMark,
  ) {}

  swipe(from: Cell, to: Cell): void {
    this.drop();
    this.game.handleSwipe(from, to);
  }

  /** A tap on the board while no booster is armed. Ignored while a turn plays. */
  tap(cell: Cell): void {
    if (!this.game.canSwap) return;
    const picked = this.picked;
    this.drop();
    if (!picked) this.pick(cell);
    else if (isAdjacent(picked, cell)) this.game.handleSwipe(picked, cell);
    else if (!sameCell(picked, cell)) this.pick(cell);
  }

  /** Puts the picked koi back, if there is one. */
  drop(): void {
    if (!this.picked) return;
    this.picked = null;
    this.mark.lift(null);
  }

  private pick(cell: Cell): void {
    if (!this.game.hasKoi(cell)) return;
    this.picked = cell;
    this.mark.lift(cell);
  }
}
