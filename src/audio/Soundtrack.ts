import { AUDIO, MUSIC } from '../config/audio';
import type { GameEventBus, GameEvents } from '../game/events';
import type { Bus } from './Mixer';
import type { Mood, Track } from './Track';

/** What dips a channel for a moment. */
export interface Ducker {
  duck(bus: Bus, depth: number, seconds: number): void;
}

/** The events that move the music, and the mood each brings. */
const MOOD_OF: { readonly [K in keyof GameEvents]?: (event: GameEvents[K]) => Mood } = {
  moveSpent: ({ movesLeft }) => (movesLeft <= AUDIO.lowMoves ? 'tense' : 'calm'),
  won: () => 'won',
  lost: () => 'lost',
};

/** The events the music dips under for a moment so the effects come through, and how deep. */
const DUCK_ON: { readonly [K in keyof GameEvents]?: number } = {
  match: MUSIC.duck.match,
  lineFired: MUSIC.duck.special,
  whirlPopped: MUSIC.duck.special,
  rainbowFired: MUSIC.duck.special,
};

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
    for (const type of Object.keys(MOOD_OF) as (keyof GameEvents)[]) this.follow(events, type);
    for (const type of Object.keys(DUCK_ON) as (keyof GameEvents)[]) this.dipOn(events, type);
  }

  /** Call once per frame. */
  update(): void {
    for (const track of this.tracks) track.update();
  }

  private follow(events: GameEventBus, type: keyof GameEvents): void {
    const moodOf = MOOD_OF[type] as (event: unknown) => Mood;
    events.on(type, (event) => {
      const mood = moodOf(event);
      for (const track of this.tracks) track.setMood(mood);
    });
  }

  private dipOn(events: GameEventBus, type: keyof GameEvents): void {
    const depth = DUCK_ON[type] ?? 0;
    events.on(type, () => {
      this.ducker.duck('music', depth, MUSIC.duck.back);
    });
  }
}
