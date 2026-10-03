import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import type { Random } from '../core/Random';
import type { Board } from '../model/Board';
import { trySwap } from '../model/rules';
import type { BoardSpec } from '../model/rules';
import type { Cell } from '../model/types';
import type { BoardAnimator, PlacedPiece } from '../view/BoardAnimator';
import type { BoardView } from '../view/BoardView';

type TurnState = 'idle' | 'swapping' | 'resolving';

const TURN_TRANSITIONS: readonly Transition<TurnState, undefined>[] = [
  { from: 'idle', to: 'swapping' },
  { from: 'swapping', to: 'resolving' },
  { from: 'swapping', to: 'idle' }, // the swap made no match and went back
  { from: 'resolving', to: 'idle' },
];

export interface GameSceneDeps {
  readonly board: Board;
  readonly spec: BoardSpec;
  readonly rng: Random;
  readonly view: BoardView;
  readonly animator: BoardAnimator;
}

/**
 * The presenter: takes swipes from the view, asks the model for the result and plays it back through the animator.
 * The turn state machine keeps one turn at a time; swipes outside 'idle' are ignored.
 */
export class GameScene {
  private readonly turn = new StateMachine<TurnState, undefined>('idle', TURN_TRANSITIONS, undefined);

  constructor(private readonly deps: GameSceneDeps) {}

  /** Swipe handler for the input. Ignored while a turn is playing. */
  readonly handleSwipe = (from: Cell, to: Cell): void => {
    if (!this.turn.can('swapping')) return;
    void this.playTurn(from, to);
  };

  private async playTurn(from: Cell, to: Cell): Promise<void> {
    const pair = this.placedPair(from, to);
    if (!pair) return; // swiped off the edge of the board
    this.turn.transition('swapping');
    try {
      await this.resolveSwap(pair);
    } catch (error) {
      // an animation failed mid-turn: snap the view back to the model so the game stays playable
      console.error(error);
      this.deps.view.render(this.deps.board);
      if (!this.turn.is('idle')) this.turn.transition('idle');
    }
  }

  private async resolveSwap([first, second]: readonly [PlacedPiece, PlacedPiece]): Promise<void> {
    const { board, spec, rng, view, animator } = this.deps;
    const result = trySwap(board, first.at, second.at, spec, rng);
    if (!result.valid) {
      await animator.invalidSwap(first, second);
      this.turn.transition('idle');
      return;
    }

    await animator.swap(first, second);
    this.turn.transition('resolving');
    for (const step of result.steps) await animator.playStep(step);
    if (result.reshuffled) view.render(board);
    this.turn.next();
  }

  /** The two pieces being swapped, with their cells, read before the model changes the board. */
  private placedPair(from: Cell, to: Cell): readonly [PlacedPiece, PlacedPiece] | null {
    const first = this.deps.board.get(from);
    const second = this.deps.board.get(to);
    if (!first || !second) return null;
    return [
      { piece: first, at: from },
      { piece: second, at: to },
    ];
  }
}
