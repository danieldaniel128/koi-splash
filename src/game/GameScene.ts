import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import type { Random } from '../core/Random';
import type { Board } from '../model/Board';
import { createBoard, resetBoard, trySwap } from '../model/rules';
import type { BoardSpec } from '../model/rules';
import { scoreRound } from '../model/score';
import type { Cell } from '../model/types';
import type { BoardAnimator, PlacedPiece } from '../view/BoardAnimator';
import type { BoardView } from '../view/BoardView';
import type { GameStatus } from './GameStatus';

type TurnState = 'idle' | 'swapping' | 'resolving' | 'won' | 'lost';

/** Mutable level state, owned by the scene and read by the transition guards. */
interface LevelState {
  movesLeft: number;
  score: number;
  readonly targetScore: number;
}

/** Table order is the priority: 'won' is checked before 'lost', so reaching the target on the last move wins. */
const TURN_TRANSITIONS: readonly Transition<TurnState, LevelState>[] = [
  { from: 'idle', to: 'swapping', when: (level) => level.movesLeft > 0 },
  { from: 'swapping', to: 'resolving' },
  { from: 'swapping', to: 'idle' }, // the swap made no match and went back
  { from: 'resolving', to: 'won', when: (level) => level.score >= level.targetScore },
  { from: 'resolving', to: 'lost', when: (level) => level.movesLeft === 0 },
  { from: 'resolving', to: 'idle' },
  { from: 'won', to: 'idle' }, // play again
  { from: 'lost', to: 'idle' },
];

/** The display side the scene drives. Implemented by the HUD view. */
export interface StatusDisplay {
  update(status: GameStatus): void;
}

/** The end-of-level card. Implemented by the result overlay view. */
export interface ResultDisplay {
  show(outcome: 'won' | 'lost', status: GameStatus): void;
  hide(): void;
}

export interface LevelRules {
  readonly moves: number;
  readonly targetScore: number;
  readonly pointsPerPiece: number;
}

export interface GameSceneDeps {
  readonly spec: BoardSpec;
  readonly level: LevelRules;
  readonly rng: Random;
  readonly view: BoardView;
  readonly animator: BoardAnimator;
  readonly status: StatusDisplay;
  readonly result: ResultDisplay;
}

/**
 * The presenter: takes swipes from the view, asks the model for the result and plays it back through the animator.
 * The turn state machine keeps one turn at a time and decides, at the end of each turn, whether the level is won,
 * lost or goes on.
 */
export class GameScene {
  private readonly board: Board;
  private readonly level: LevelState;
  private readonly turn: StateMachine<TurnState, LevelState>;

  constructor(private readonly deps: GameSceneDeps) {
    this.board = createBoard(deps.spec, deps.rng);
    this.level = { movesLeft: deps.level.moves, score: 0, targetScore: deps.level.targetScore };
    this.turn = new StateMachine<TurnState, LevelState>('idle', TURN_TRANSITIONS, this.level, {
      won: {
        onEnter: (level) => {
          deps.result.show('won', level);
        },
      },
      lost: {
        onEnter: (level) => {
          deps.result.show('lost', level);
        },
      },
    });
    deps.view.render(this.board);
    deps.status.update(this.level);
  }

  /** Swipe handler for the input. Ignored while a turn is playing or after the level has ended. */
  readonly handleSwipe = (from: Cell, to: Cell): void => {
    if (!this.turn.can('swapping')) return;
    void this.playTurn(from, to);
  };

  /** Starts the level over with a fresh board. Only allowed once the level has ended. */
  restart(): void {
    if (!this.turn.is('won') && !this.turn.is('lost')) return;
    resetBoard(this.board, this.deps.spec, this.deps.rng);
    this.level.movesLeft = this.deps.level.moves;
    this.level.score = 0;
    this.deps.view.render(this.board);
    this.deps.status.update(this.level);
    this.deps.result.hide();
    this.turn.transition('idle');
  }

  private async playTurn(from: Cell, to: Cell): Promise<void> {
    const pair = this.placedPair(from, to);
    if (!pair) return; // swiped off the edge of the board
    this.turn.transition('swapping');
    try {
      await this.resolveSwap(pair);
    } catch (error) {
      // an animation failed mid-turn: snap the view back to the model so the game stays playable
      console.error(error);
      this.deps.view.render(this.board);
      if (this.turn.can('idle')) this.turn.transition('idle');
    }
  }

  private async resolveSwap([first, second]: readonly [PlacedPiece, PlacedPiece]): Promise<void> {
    const { spec, rng, view, animator } = this.deps;
    const result = trySwap(this.board, first.at, second.at, spec, rng);
    if (!result.valid) {
      await animator.invalidSwap(first, second);
      this.turn.transition('idle');
      return;
    }

    this.level.movesLeft--;
    this.deps.status.update(this.level);
    await animator.swap(first, second);
    this.turn.transition('resolving');
    for (const [round, step] of result.steps.entries()) {
      await animator.playStep(step);
      this.level.score += scoreRound(step, round, this.deps.level.pointsPerPiece);
      this.deps.status.update(this.level); // the score climbs with each round of the cascade
    }
    if (result.reshuffled) view.render(this.board);
    this.turn.next();
  }

  /** The two pieces being swapped, with their cells, read before the model changes the board. */
  private placedPair(from: Cell, to: Cell): readonly [PlacedPiece, PlacedPiece] | null {
    const first = this.board.get(from);
    const second = this.board.get(to);
    if (!first || !second) return null;
    return [
      { piece: first, at: from },
      { piece: second, at: to },
    ];
  }
}
