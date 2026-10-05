import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import type { ResultDisplay } from './GameScene';
import type { GameStatus } from './GameStatus';

/** The screens the player goes through: the loading screen, the game, and the end-of-level card over the game. */
export type Screen = 'loading' | 'playing' | 'result';

/** Loading leads to the game, once; the end card opens over the game, and playing again goes back to it. */
const SCREEN_FLOW: readonly Transition<Screen, undefined>[] = [
  { from: 'loading', to: 'playing' },
  { from: 'playing', to: 'result' },
  { from: 'result', to: 'playing' },
];

/** What the screen flow moves between. */
export interface ScreenViews {
  /** The loading screen: fades away to the game. */
  readonly loader: { hide(): Promise<void> };
  /** The game: has the keyboard focus while it's played. */
  readonly game: { focus(): void };
  /** The end-of-level card: shows how the level went, and has the focus while it's open. */
  readonly card: ResultDisplay & { focus(): void };
}

/**
 * The way between the screens, on the same state machine as the turn: loading -> playing -> result -> playing. It
 * makes every move between them: the loading screen fading away to the game, the end card opening when the scene
 * says the level is over (the flow is the scene's result display), and playing again, the one way back from the
 * card. The keyboard focus follows: to the card's button when it opens, back to the game when it's played.
 */
export class ScreenFlow implements ResultDisplay {
  private readonly screens: StateMachine<Screen, undefined>;
  private restartLevel: (() => void) | null = null;

  constructor(private readonly views: ScreenViews) {
    this.screens = new StateMachine<Screen, undefined>('loading', SCREEN_FLOW, undefined, {
      playing: {
        onEnter: () => {
          views.game.focus();
        },
      },
      result: {
        onEnter: () => {
          views.card.focus();
        },
      },
    });
  }

  get screen(): Screen {
    return this.screens.state;
  }

  /** What playing again does: whoever runs the level starts it over. */
  onReplay(restart: () => void): void {
    this.restartLevel = restart;
  }

  /** Loading is done: the loading screen fades away, and the game is played. */
  async start(): Promise<void> {
    await this.views.loader.hide();
    this.screens.transition('playing');
  }

  /** The level is over: the end card opens over the game. */
  show(outcome: 'won' | 'lost', status: GameStatus): void {
    this.views.card.show(outcome, status);
    this.screens.transition('result');
  }

  /** The end card goes away, as the level starts over. */
  hide(): void {
    this.views.card.hide();
  }

  /** Plays again: the level starts over and the game has the focus back. Only from the end card. */
  replay(): void {
    if (!this.screens.is('result')) return;
    this.restartLevel?.();
    this.screens.transition('playing');
  }
}
