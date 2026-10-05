import { StateMachine } from '../core/StateMachine';
import type { StateHooks, Transition } from '../core/StateMachine';
import { runDetached } from '../core/detached';
import type { Random } from '../core/Random';
import type { Board } from '../model/Board';
import { checkGoals, createGoals, goalsMet, recordRound } from '../model/goals';
import type { Goal, GoalDef } from '../model/goals';
import { PadField } from '../model/pads';
import type { PadSpec } from '../model/pads';
import { applyBooster, canTarget } from '../model/boosters';
import type { BoosterType, BoosterUse } from '../model/boosters';
import { createBoard, resetBoard, settle, trySwap } from '../model/rules';
import { scoreRound } from '../model/score';
import { starsFor, starsForWin } from '../model/stars';
import type { StarRule } from '../model/stars';
import type { BoardSpec, CascadeStep, Cell, Pad, PadEvent, PlacedPiece } from '../model/types';
import type { BoosterChange } from '../model/boosters';
import type { BoosterGame } from './BoosterControl';
import type { GameEventBus } from './events';
import type { GameStatus } from './GameStatus';
import type { SwapGame } from './SwapControl';

type TurnState = 'idle' | 'swapping' | 'resolving' | 'won' | 'lost';

/** Mutable level state, owned by the scene and read by the transition guards. */
interface LevelState {
  movesLeft: number;
  score: number;
  readonly goal: Goal;
}

/**
 * The level plays to its last move: met goals early and the player keeps scoring toward the stars. It ends when the
 * moves run out, won if every goal is met by then. Table order is the priority: 'won' is checked before 'lost'.
 */
const TURN_TRANSITIONS: readonly Transition<TurnState, LevelState>[] = [
  { from: 'idle', to: 'swapping', when: (level) => level.movesLeft > 0 },
  { from: 'swapping', to: 'resolving' },
  { from: 'swapping', to: 'idle' }, // the swap made no match and went back
  { from: 'resolving', to: 'won', when: (level) => level.movesLeft === 0 && level.goal.isComplete() },
  { from: 'resolving', to: 'lost', when: (level) => level.movesLeft === 0 },
  { from: 'resolving', to: 'idle' },
  { from: 'won', to: 'idle' }, // play again
  { from: 'lost', to: 'idle' },
];

/*
 * The scene's ports (ports and adapters): the small displays it drives, declared here and implemented by the view and
 * the UI, so the game never imports them and a test can stub each one.
 */

/** The board of koi. Implemented by the board view. */
export interface BoardDisplay {
  /** Shows the board as the model has it, every koi at rest in its cell. */
  render(board: Board): void;
  /** Whether the board shows it takes a move (between turns, with the level on). */
  setPlayable(playable: boolean): void;
}

/** Plays a turn's moves on the board; each resolves when its motion ends. Implemented by the board animator. */
export interface TurnAnimator {
  swap(first: PlacedPiece, second: PlacedPiece): Promise<void>;
  invalidSwap(first: PlacedPiece, second: PlacedPiece): Promise<void>;
  /** A koi swiped into the bank, or into a lily pad: it bumps its nose and swims back. */
  bumpBank(koi: PlacedPiece, toward: Cell): Promise<void>;
  bumpPad(koi: PlacedPiece, padCell: Cell): Promise<void>;
  /** One cascade round, with the points it scored. */
  playStep(step: CascadeStep, points: number): Promise<void>;
  playBooster(use: BoosterUse, change: BoosterChange): Promise<void>;
}

/** The level's status. Implemented by the HUD. */
export interface StatusDisplay {
  /** A level starts (the first, or again): shows its status at once, with nothing counting up. */
  reset(status: GameStatus): void;
  /** The status moved on during play: the changes animate. */
  update(status: GameStatus): void;
}

/** The lily pads on the board. Implemented by the pad view. */
export interface PadDisplay {
  reset(pads: readonly Pad[]): void;
  play(events: readonly PadEvent[]): Promise<void>;
  /** A koi bumped into the pad on this cell: it rocks on the water. */
  nudge(cell: Cell): Promise<void>;
}

/** The end-of-level card. Implemented by the UI's result card. */
export interface ResultDisplay {
  show(outcome: 'won' | 'lost', status: GameStatus): void;
  hide(): void;
}

export interface LevelRules {
  readonly moves: number;
  readonly pointsPerPiece: number;
  /** Points paid for each goal as it is met. */
  readonly goalBonus: number;
  /** The level's goals: it's won when every one is reached. */
  readonly goals: readonly GoalDef[];
  readonly pads: PadSpec;
  readonly stars: StarRule;
}

export interface GameSceneDeps {
  readonly spec: BoardSpec;
  readonly level: LevelRules;
  readonly rng: Random;
  readonly view: BoardDisplay;
  readonly animator: TurnAnimator;
  readonly status: StatusDisplay;
  readonly pads: PadDisplay;
  readonly result: ResultDisplay;
  /** Where the scene says what happens (a swap, a match, the pads, the goals, the end): the sounds listen. */
  readonly events: GameEventBus;
}

/** One cascade round, counted before it plays: its points, the goals it met (0 = the level's first) and the status after it. */
interface CountedRound {
  readonly step: CascadeStep;
  readonly round: number;
  readonly points: number;
  readonly met: readonly number[];
  readonly status: GameStatus;
}

/** A settled board, counted: its rounds, and whether the board was dealt again at the end. */
interface CountedTurn {
  readonly rounds: readonly CountedRound[];
  readonly reshuffled: boolean;
}

/**
 * The presenter (MVP, passive view): takes swipes from the input, asks the model for the result and plays it back
 * through the animator. The model settles the whole turn and the scene counts it before anything plays, so the level's
 * state never waits on an animation. The turn state machine keeps one turn at a time and decides, at the end of each
 * turn, whether the level is won, lost or goes on (it goes on until the last move).
 */
export class GameScene implements BoosterGame, SwapGame {
  private readonly board: Board;
  private readonly level: LevelState;
  private readonly turn: StateMachine<TurnState, LevelState>;
  private pads: PadField;

  constructor(private readonly deps: GameSceneDeps) {
    checkGoals(deps.level.goals, { buds: deps.level.pads.buds, kinds: deps.spec.kinds });
    // the pads go down first, so the koi only fill the free cells around them
    this.pads = PadField.scatter(deps.level.pads, deps.spec, deps.rng);
    this.board = createBoard(deps.spec, deps.rng, this.pads.cells);
    this.level = { movesLeft: deps.level.moves, score: 0, goal: createGoals(deps.level.goals) };
    this.turn = new StateMachine<TurnState, LevelState>(
      'idle',
      TURN_TRANSITIONS,
      this.level,
      this.turnHooks(),
    );
    this.showLevel();
  }

  /** Swipe handler for the input. Ignored while a turn is playing or after the level has ended. */
  readonly handleSwipe = (from: Cell, to: Cell): void => {
    if (!this.turn.can('swapping')) return;
    runDetached(this.playTurn(from, to), 'a turn');
  };

  /** True when a booster can be used: the board is still and the level is on. */
  get canBoost(): boolean {
    return this.turn.can('swapping');
  }

  /** True when the board takes a swap: it is still and the level is on. */
  get canSwap(): boolean {
    return this.turn.can('swapping');
  }

  /** Whether a booster can be used on this cell (see canTarget). */
  canTarget(type: BoosterType, cell: Cell): boolean {
    return canTarget(this.board, type, cell);
  }

  /**
   * Uses a booster: the board changes as it says and settles like after a swap, then the view plays it. No move is
   * spent. Resolves false (and changes nothing) when it can't be used now or has nothing to do.
   */
  async useBooster(use: BoosterUse): Promise<boolean> {
    if (!this.canBoost) return false;
    const change = applyBooster(this.board, use);
    if (!change) return false;
    const swap = use.type === 'swap' ? [use.b, use.a] : []; // a special made by it forms where the first koi lands
    const turn = this.count(settle(this.board, this.deps.spec, this.deps.rng, { pads: this.pads, swap }));
    await this.runTurn(async () => {
      await this.deps.animator.playBooster(use, change);
      await this.playCascade(turn);
    });
    return true;
  }

  /** Starts the level over with a fresh board. Only allowed once the level has ended. */
  restart(): void {
    if (!this.turn.is('won') && !this.turn.is('lost')) return;
    this.pads = PadField.scatter(this.deps.level.pads, this.deps.spec, this.deps.rng);
    resetBoard(this.board, this.deps.spec, this.deps.rng, this.pads.cells);
    this.level.movesLeft = this.deps.level.moves;
    this.level.score = 0;
    this.level.goal.reset();
    this.deps.result.hide();
    this.turn.transition('idle');
    this.showLevel();
  }

  /** Whether a koi rests in this cell (not a lily pad, a hole or off the board). */
  hasKoi(cell: Cell): boolean {
    return this.board.get(cell) !== null;
  }

  /** A level starts: every display shows it fresh, and it's announced once (the music and the rest start over). */
  private showLevel(): void {
    this.deps.view.render(this.board);
    this.deps.view.setPlayable(true);
    this.deps.pads.reset(this.pads.pads);
    this.deps.status.reset(this.status());
    this.deps.events.emit('levelStarted');
  }

  /** The turn's quick reactions: the board takes a move only while it's idle, and the level's end opens the card. */
  private turnHooks(): Partial<Record<TurnState, StateHooks<LevelState>>> {
    const { view, result, events } = this.deps;
    return {
      idle: {
        onEnter: () => {
          view.setPlayable(true);
        },
        onExit: () => {
          view.setPlayable(false);
        },
      },
      won: {
        onEnter: () => {
          result.show('won', {
            ...this.status(),
            stars: starsForWin(this.level.score, this.deps.level.stars),
          });
          events.emit('won');
        },
      },
      lost: {
        onEnter: () => {
          result.show('lost', this.status());
          events.emit('lost');
        },
      },
    };
  }

  private async playTurn(from: Cell, to: Cell): Promise<void> {
    const piece = this.board.get(from);
    if (!piece) return; // the swipe started on a lily pad or a hole
    const koi = { piece, at: from };
    const pair = this.placedPair(from, to);
    if (this.isBank(to)) await this.runTurn(() => this.bumpBank(koi, to));
    else if (this.board.isBlocked(to)) await this.runTurn(() => this.bumpPad(koi, to));
    else if (pair) await this.runTurn(() => this.resolveSwap(pair));
  }

  /** Runs one turn's animations. If one fails, the turn still ends as the model played it (see recover). */
  private async runTurn(play: () => Promise<void>): Promise<void> {
    this.turn.transition('swapping');
    try {
      await play();
    } catch (error) {
      console.error('a turn failed to play', error);
      this.recover();
    }
  }

  /**
   * An animation failed mid-turn. The model and the level's count already hold the turn's outcome, so every display
   * snaps to it and the turn ends through the table as usual: on the last move the level still ends.
   */
  private recover(): void {
    this.deps.view.render(this.board);
    this.deps.pads.reset(this.pads.pads);
    this.deps.status.update(this.status());
    if (this.turn.is('swapping')) this.turn.transition('resolving');
    if (this.turn.is('resolving')) this.turn.next();
  }

  /** A koi swiped into the bank: refused like a swap that makes nothing, with its sound. No move is spent. */
  private async bumpBank(koi: PlacedPiece, bank: Cell): Promise<void> {
    this.deps.events.emit('invalidSwap');
    await this.deps.animator.bumpBank(koi, bank);
    this.turn.transition('idle');
  }

  /** A koi swiped into a lily pad: it bumps its nose and swims back, the pad rocks. No move is spent. */
  private async bumpPad(koi: PlacedPiece, padCell: Cell): Promise<void> {
    await Promise.all([this.deps.animator.bumpPad(koi, padCell), this.deps.pads.nudge(padCell)]);
    this.turn.transition('idle');
  }

  private async resolveSwap([first, second]: readonly [PlacedPiece, PlacedPiece]): Promise<void> {
    const { spec, rng, animator } = this.deps;
    const result = trySwap(this.board, first.at, second.at, spec, rng, this.pads);
    if (!result.valid) {
      this.deps.events.emit('invalidSwap');
      await animator.invalidSwap(first, second);
      this.turn.transition('idle');
      return;
    }

    this.level.movesLeft--;
    const spent = this.status(); // the move is spent at once; the score climbs as the rounds play
    const turn = this.count(result);
    this.deps.events.emit('swap');
    this.deps.events.emit('moveSpent', { movesLeft: this.level.movesLeft });
    this.deps.status.update(spent);
    await animator.swap(first, second);
    await this.playCascade(turn);
  }

  /** Plays a counted turn's rounds, then ends the turn (won, lost or on to the next). */
  private async playCascade(turn: CountedTurn): Promise<void> {
    this.turn.transition('resolving');
    for (const round of turn.rounds) await this.playRound(round);
    if (turn.reshuffled) {
      this.deps.view.render(this.board);
      this.deps.events.emit('reshuffle');
    }
    this.turn.next();
  }

  /**
   * One cascade round: the pads next to the cleared koi react while the koi clear and fall (into a bloomed pad's
   * cell too), and the HUD climbs to the round's status.
   */
  private async playRound({ step, round, points, met, status }: CountedRound): Promise<void> {
    this.announce(step, round, met);
    await Promise.all([this.deps.animator.playStep(step, points), this.deps.pads.play(step.padEvents)]);
    this.deps.status.update(status);
  }

  /** Counts a settled board's rounds into the level (score and goals), in order, before any of them plays. */
  private count(result: { steps: readonly CascadeStep[]; reshuffled: boolean }): CountedTurn {
    const rounds = result.steps.map((step, round) => this.countRound(step, round));
    return { rounds, reshuffled: result.reshuffled };
  }

  /**
   * Feeds a round to the goals and adds its points to the score, with the bonus of each goal it met, and notes the
   * goals it met, numbered by when (0 = the first met).
   */
  private countRound(step: CascadeStep, round: number): CountedRound {
    const { goal } = this.level;
    const points = scoreRound(step, round, this.deps.level.pointsPerPiece);
    // a rainbow koi has no colour of its own: it counts toward no colour goal
    const cleared = step.cleared
      .filter(({ piece }) => piece.special?.type !== 'rainbow')
      .map(({ piece }) => piece.kind);
    const metBefore = goalsMet(goal.progress());
    this.level.score += recordRound(
      goal,
      { points, padEvents: step.padEvents, cleared },
      this.deps.level.goalBonus,
    );
    const metAfter = goalsMet(goal.progress());
    const met = Array.from({ length: metAfter - metBefore }, (_, i) => metBefore + i);
    return { step, round, points, met, status: this.status() };
  }

  /** Says what a round did: its match, what happened to the lily pads (once each), and the goals it met. */
  private announce(step: CascadeStep, round: number, met: readonly number[]): void {
    const { events } = this.deps;
    if (step.cleared.length > 0) events.emit('match', { round, size: step.cleared.length });
    const pads = new Set(step.padEvents.map((event) => event.type));
    if (pads.has('hit')) events.emit('budHit');
    if (pads.has('bloom')) events.emit('bloom');
    if (pads.has('drift')) events.emit('padDrift');
    for (const n of met) events.emit('goalMet', { n });
  }

  private status(): GameStatus {
    const { movesLeft, score, goal } = this.level;
    const { moves, stars } = this.deps.level;
    return { movesLeft, moves, stars: starsFor(score, stars), score, goals: goal.progress() };
  }

  /** True where a koi meets the bank: off the board, or a hole in its shape. */
  private isBank(cell: Cell): boolean {
    return !this.board.inBounds(cell) || this.board.isHole(cell);
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
