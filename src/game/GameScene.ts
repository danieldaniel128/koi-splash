import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import type { Random } from '../core/Random';
import type { Board } from '../model/Board';
import { createGoal } from '../model/goals';
import type { Goal, GoalDef } from '../model/goals';
import { PadField } from '../model/pads';
import type { Pad, PadEvent, PadSpec } from '../model/pads';
import { createBoard, resetBoard, trySwap } from '../model/rules';
import type { BoardSpec } from '../model/rules';
import { scoreRound } from '../model/score';
import type { CascadeStep, Cell } from '../model/types';
import type { BoardAnimator, PlacedPiece } from '../view/BoardAnimator';
import type { BoardView } from '../view/BoardView';
import type { GameStatus } from './GameStatus';

type TurnState = 'idle' | 'swapping' | 'resolving' | 'won' | 'lost';

/** Mutable level state, owned by the scene and read by the transition guards. */
interface LevelState {
  movesLeft: number;
  score: number;
  readonly goal: Goal;
}

/** Table order is the priority: 'won' is checked before 'lost', so reaching the goal on the last move wins. */
const TURN_TRANSITIONS: readonly Transition<TurnState, LevelState>[] = [
  { from: 'idle', to: 'swapping', when: (level) => level.movesLeft > 0 },
  { from: 'swapping', to: 'resolving' },
  { from: 'swapping', to: 'idle' }, // the swap made no match and went back
  { from: 'resolving', to: 'won', when: (level) => level.goal.isComplete() },
  { from: 'resolving', to: 'lost', when: (level) => level.movesLeft === 0 },
  { from: 'resolving', to: 'idle' },
  { from: 'won', to: 'idle' }, // play again
  { from: 'lost', to: 'idle' },
];

/** The display side the scene drives. Implemented by the HUD view. */
export interface StatusDisplay {
  update(status: GameStatus): void;
}

/** The lily pads on the board. Implemented by the pad view. */
export interface PadDisplay {
  reset(pads: readonly Pad[]): void;
  play(events: readonly PadEvent[]): Promise<void>;
}

/** The end-of-level card. Implemented by the result overlay view. */
export interface ResultDisplay {
  show(outcome: 'won' | 'lost', status: GameStatus): void;
  hide(): void;
}

export interface LevelRules {
  readonly moves: number;
  readonly pointsPerPiece: number;
  readonly goal: GoalDef;
  readonly pads: PadSpec;
}

export interface GameSceneDeps {
  readonly spec: BoardSpec;
  readonly level: LevelRules;
  readonly rng: Random;
  readonly view: BoardView;
  readonly animator: BoardAnimator;
  readonly status: StatusDisplay;
  readonly pads: PadDisplay;
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
  private pads: PadField;

  constructor(private readonly deps: GameSceneDeps) {
    // the pads go down first, so the koi only fill the free cells around them
    this.pads = PadField.scatter(deps.level.pads, deps.spec, deps.rng);
    this.board = createBoard(deps.spec, deps.rng, this.pads.cells);
    this.level = { movesLeft: deps.level.moves, score: 0, goal: createGoal(deps.level.goal) };
    this.turn = new StateMachine<TurnState, LevelState>('idle', TURN_TRANSITIONS, this.level, {
      won: {
        onEnter: () => {
          deps.result.show('won', this.status());
        },
      },
      lost: {
        onEnter: () => {
          deps.result.show('lost', this.status());
        },
      },
    });
    deps.view.render(this.board);
    deps.pads.reset(this.pads.pads);
    deps.status.update(this.status());
  }

  /** Swipe handler for the input. Ignored while a turn is playing or after the level has ended. */
  readonly handleSwipe = (from: Cell, to: Cell): void => {
    if (!this.turn.can('swapping')) return;
    void this.playTurn(from, to);
  };

  /** Starts the level over with a fresh board. Only allowed once the level has ended. */
  restart(): void {
    if (!this.turn.is('won') && !this.turn.is('lost')) return;
    this.pads = PadField.scatter(this.deps.level.pads, this.deps.spec, this.deps.rng);
    resetBoard(this.board, this.deps.spec, this.deps.rng, this.pads.cells);
    this.level.movesLeft = this.deps.level.moves;
    this.level.score = 0;
    this.level.goal.reset();
    this.deps.view.render(this.board);
    this.deps.pads.reset(this.pads.pads);
    this.deps.status.update(this.status());
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
    const result = trySwap(this.board, first.at, second.at, spec, rng, this.pads);
    if (!result.valid) {
      await animator.invalidSwap(first, second);
      this.turn.transition('idle');
      return;
    }

    this.level.movesLeft--;
    this.deps.status.update(this.status());
    await animator.swap(first, second);
    this.turn.transition('resolving');
    for (const [round, step] of result.steps.entries()) await this.playRound(step, round);
    if (result.reshuffled) view.render(this.board);
    this.turn.next();
  }

  /**
   * One cascade round: the pads next to the cleared koi react while the koi clear and fall (into a bloomed pad's
   * cell too), and the goal counts it.
   */
  private async playRound(step: CascadeStep, round: number): Promise<void> {
    const points = scoreRound(step, round, this.deps.level.pointsPerPiece);
    this.level.score += points;
    this.level.goal.record({ points, padEvents: step.padEvents });
    await Promise.all([this.deps.animator.playStep(step), this.deps.pads.play(step.padEvents)]);
    this.deps.status.update(this.status()); // the score and the goal climb with each round of the cascade
  }

  private status(): GameStatus {
    return { movesLeft: this.level.movesLeft, score: this.level.score, goal: this.level.goal.progress() };
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
