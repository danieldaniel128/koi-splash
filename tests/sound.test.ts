import { describe, expect, it } from 'vitest';
import { SoundBoard } from '../src/audio/SoundBoard';
import { noteOf } from '../src/audio/Synth';
import type { Voice } from '../src/audio/Synth';
import { createGameEvents } from '../src/game/events';

/** A voice that writes down what it was asked to play. */
function fakeVoice(): Voice & { played: string[] } {
  const played: string[] = [];
  return {
    played,
    tone: (freq) => played.push(`tone:${Math.round(freq)}`),
    noise: () => played.push('noise'),
    pluck: (freq) => played.push(`pluck:${Math.round(freq)}`),
    plip: () => played.push('plip'),
    note: (i) => noteOf(i, 293.66, [0, 2, 4, 7, 9]),
    throttle: () => true,
  };
}

describe('noteOf', () => {
  it('walks D major pentatonic from D4, octave by octave, and wraps below', () => {
    const scale = [0, 2, 4, 7, 9];
    expect(noteOf(0, 293.66, scale)).toBeCloseTo(293.66);
    expect(noteOf(3, 293.66, scale)).toBeCloseTo(440, 0); // A4
    expect(noteOf(5, 293.66, scale)).toBeCloseTo(587.33, 1); // D5, an octave up
    expect(noteOf(-1, 293.66, scale)).toBeCloseTo(246.94, 1); // B3, below the scale
  });
});

describe('SoundBoard', () => {
  it('plays what each event sounds like, and nothing for events it was not told', () => {
    const events = createGameEvents();
    const voice = fakeVoice();
    new SoundBoard(events, voice);
    events.emit('match', { round: 0, size: 3 });
    expect(voice.played.filter((p) => p.startsWith('pluck'))).toEqual(['pluck:494', 'pluck:659']); // B4, E5
    voice.played.length = 0;
    events.emit('match', { round: 2, size: 4 }); // a cascade climbs, a 4 adds a third note
    expect(voice.played.filter((p) => p.startsWith('pluck'))).toEqual([
      'pluck:659',
      'pluck:880',
      'pluck:1175',
    ]);
  });

  it('gives every event a sound', () => {
    const events = createGameEvents();
    const voice = fakeVoice();
    new SoundBoard(events, voice);
    const before = voice.played.length;
    events.emit('lineFired');
    events.emit('whirlPopped');
    events.emit('prismHit', { n: 3 });
    events.emit('boosterArmed', { type: 'feed', slot: 2 });
    events.emit('won');
    expect(voice.played.length).toBeGreaterThan(before + 10);
  });
});
