import { describe, expect, it } from 'vitest';
import { playSoundsOf } from '../src/audio/SoundBoard';
import { noteOf } from '../src/audio/pitch';
import type { Voice } from '../src/audio/Synth';
import { AUDIO } from '../src/config/audio';
import { createGameEvents } from '../src/game/events';
import type { GameEventBus, GameEvents } from '../src/game/events';

/** One payload for every game event: a new event that isn't listed here fails to compile. */
const EVERY_EVENT: { readonly [K in keyof GameEvents]: GameEvents[K] } = {
  swap: undefined,
  invalidSwap: undefined,
  moveSpent: { movesLeft: 9 },
  match: { roundIndex: 0, size: 3 },
  dive: undefined,
  land: undefined,
  budHit: undefined,
  bloom: undefined,
  padDrift: undefined,
  reshuffle: undefined,
  goalMet: { n: 0 },
  allGoalsMet: undefined,
  specialBorn: { type: 'line' },
  lineFired: undefined,
  whirlFired: undefined,
  whirlPopped: undefined,
  rainbowRose: undefined,
  rainbowFired: undefined,
  prismHit: { n: 3 },
  boosterArmed: { type: 'feed', slot: 2 },
  boosterCancelled: undefined,
  boosterRefused: undefined,
  koiLifted: undefined,
  koiLeapt: { duration: 0.5 },
  koiLanded: { low: false },
  pelletsThrown: undefined,
  koiFed: undefined,
  petalsOpened: undefined,
  koiMorphed: undefined,
  levelStarted: undefined,
  won: undefined,
  lost: undefined,
  starLanded: { k: 0 },
  buttonClicked: undefined,
};

/** The one event with no sound of its own: the music answers it instead (see Soundtrack). */
const SILENT: readonly (keyof GameEvents)[] = ['levelStarted'];

/** A voice that counts what it was asked to play. */
function countingVoice(): Voice & { sounds: number } {
  const voice = {
    sounds: 0,
    tone: () => {
      voice.sounds++;
    },
    noise: () => {
      voice.sounds++;
    },
    pluck: () => {
      voice.sounds++;
    },
    plip: () => {
      voice.sounds++;
    },
    note: (i: number) => noteOf(i, AUDIO.base, AUDIO.scale),
    throttle: () => true,
    now: () => 0,
  };
  return voice;
}

/** Emits any event by name, with its payload. */
function emit(events: GameEventBus, type: keyof GameEvents): void {
  const send = events.emit.bind(events) as (type: keyof GameEvents, payload?: unknown) => void;
  send(type, EVERY_EVENT[type]);
}

describe('playSoundsOf', () => {
  it('plays a sound for every game event but the silent one', () => {
    for (const type of Object.keys(EVERY_EVENT) as (keyof GameEvents)[]) {
      const events = createGameEvents();
      const voice = countingVoice();
      playSoundsOf(events, voice);
      emit(events, type);
      if (SILENT.includes(type)) expect(voice.sounds, type).toBe(0);
      else expect(voice.sounds, type).toBeGreaterThan(0);
    }
  });
});
