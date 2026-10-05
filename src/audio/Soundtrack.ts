import { AUDIO, MUSIC } from '../config/audio';
import type { EventHandlers } from '../core/EventBus';
import type { GameEventBus, GameEvents } from '../game/events';
import type { Bus } from '../config/audio';
import type { Mood, Track } from './Track';

/** What dips a channel for a moment. */
export interface Ducker {
  duck(bus: Bus, depth: number, seconds: number): void;
}

/** The events that move the music, and the mood each brings. */
function moodsFrom(setMood: (mood: Mood) => void): EventHandlers<GameEvents> {
  return {
    levelStarted: () => {
      setMood('calm');
    },
    moveSpent: ({ movesLeft }) => {
      setMood(movesLeft <= AUDIO.lowMoves ? 'tense' : 'calm');
    },
    won: () => {
      setMood('won');
    },
    lost: () => {
      setMood('lost');
    },
  };
}

/** The events the music dips under for a moment so the effects come through, and how deep. */
const DUCK_ON: readonly (readonly [keyof GameEvents, number])[] = [
  ['match', MUSIC.duck.match],
  ['lineFired', MUSIC.duck.special],
  ['whirlPopped', MUSIC.duck.special],
  ['rainbowFired', MUSIC.duck.special],
];

/**
 * The music and the ambience: it keeps their tracks playing, tells them how the game is going (from the game's
 * events) and dips the music under the big effects. Like the sound board, it knows the game only by its events.
 */
export class Soundtrack {
  constructor(
    events: GameEventBus,
    private readonly tracks: readonly Track[],
    private readonly ducker: Ducker,
  ) {
    events.onEach(
      moodsFrom((mood) => {
        for (const track of this.tracks) track.setMood(mood);
      }),
    );
    for (const [type, depth] of DUCK_ON) {
      events.on(type, () => {
        this.ducker.duck('music', depth, MUSIC.duck.back);
      });
    }
  }

  /** Call once per frame. */
  update(): void {
    for (const track of this.tracks) track.update();
  }
}
