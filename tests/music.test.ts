import { describe, expect, it } from 'vitest';
import { Composer, nearestTone, semitonesOf } from '../src/audio/composer';
import type { BarMood, MusicNote } from '../src/audio/composer';
import { GardenMusic } from '../src/audio/GardenMusic';
import type { Bus } from '../src/config/audio';
import { Soundtrack } from '../src/audio/Soundtrack';
import { noteOf } from '../src/audio/pitch';
import type { Voice } from '../src/audio/Synth';
import type { Mood, Track } from '../src/audio/Track';
import { MUSIC } from '../src/config/audio';
import { seeded } from '../src/core/Random';
import { createGameEvents } from '../src/game/events';

const PENTATONIC = [0, 2, 4, 7, 9];

/** A voice on a clock the test moves, counting what it was asked to play and when (its delays). */
function clockedVoice(): Voice & { time: number | null; tones: number; delays: number[] } {
  const voice = {
    time: 0 as number | null,
    tones: 0,
    delays: [] as number[],
    tone: (_freq: number, _dur: number, _vol: number, opts?: { delay?: number }) => {
      voice.tones++;
      voice.delays.push(opts?.delay ?? 0);
    },
    noise: () => undefined,
    pluck: () => undefined,
    plip: () => undefined,
    note: (i: number) => noteOf(i, 293.66, PENTATONIC),
    throttle: () => true,
    now: () => voice.time,
  };
  return voice;
}

/** Bars from a seeded composer, one mood each. */
function compose(moods: readonly BarMood[], seed = 7): MusicNote[][] {
  const random = seeded(seed);
  const composer = new Composer(random);
  return moods.map((mood) => composer.next(mood));
}

const melodic = (bar: MusicNote[]): MusicNote[] => bar.filter((n) => n.part === 'koto' || n.part === 'flute');
const inScale = (semitones: number): boolean => PENTATONIC.includes(((semitones % 12) + 12) % 12);

describe('the composer', () => {
  const bars = compose(Array<BarMood>(64).fill('calm'));

  it('keeps the melody on the pentatonic scale and in its range', () => {
    const pitches = bars.flatMap(melodic).flatMap((n) => n.pitches);
    expect(pitches.length).toBeGreaterThan(64);
    expect(pitches.every(inScale)).toBe(true);
    const { low, high } = MUSIC.melody;
    expect(Math.min(...pitches)).toBeGreaterThanOrEqual(semitonesOf(low));
    expect(Math.max(...pitches)).toBeLessThanOrEqual(semitonesOf(high));
  });

  it('changes chord every few bars, with the pad, and keeps a bass under every bar', () => {
    bars.forEach((bar, k) => {
      expect(bar.some((n) => n.part === 'bass')).toBe(true);
      expect(bar.some((n) => n.part === 'pad')).toBe(k % MUSIC.bars === 0);
    });
  });

  it('grows a heartbeat when tense, rests after a level, and climbs home to D for a win', () => {
    const [tense, rest, cadence] = compose(['tense', 'rest', 'cadence']);
    expect(tense?.filter((n) => n.part === 'drum').map((n) => n.step)).toEqual([0, 1]);
    expect(rest?.every((n) => n.part === 'pad' || n.part === 'bass')).toBe(true);
    expect((melodic(cadence ?? []).at(-1)?.pitches[0] ?? 1) % 12).toBe(0);
  });

  it('stays on the home chord after the win cadence, under the pad it holds', () => {
    const [, , , , after] = compose(['calm', 'calm', 'calm', 'cadence', 'rest']);
    const [home] = MUSIC.progression;
    expect(after?.find((n) => n.part === 'bass')?.pitches).toEqual([home.root]);
    expect(after?.some((n) => n.part === 'pad')).toBe(false);
  });

  it('plays the same for the same seed', () => {
    expect(compose(['calm', 'calm', 'tense'], 3)).toEqual(compose(['calm', 'calm', 'tense'], 3));
  });
});

describe('nearestTone and semitonesOf', () => {
  it('lands on the closest degree whose place in the scale is a chord tone', () => {
    expect(nearestTone(6, [0, 2, 3], { low: 3, high: 10 })).toBe(5); // E5 -> D5 (F#5 is as near: the lower wins)
    expect(nearestTone(4, [3], { low: 3, high: 10 })).toBe(3); // B4 -> A4
    expect(semitonesOf(5)).toBe(12);
    expect(semitonesOf(-1)).toBe(-3);
  });
});

describe('GardenMusic', () => {
  it('schedules a bar just before it is due, once, and nothing while it cannot play', () => {
    const voice = clockedVoice();
    const music = new GardenMusic(voice, () => 0.5);
    voice.time = null;
    music.update();
    expect(voice.tones).toBe(0);
    voice.time = 10;
    music.update();
    const first = voice.tones;
    expect(first).toBeGreaterThan(0);
    music.update();
    expect(voice.tones).toBe(first); // the next bar isn't due yet
    voice.time = 10 + (60 / MUSIC.tempo) * 4;
    music.update();
    expect(voice.tones).toBeGreaterThan(first);
  });

  it('plays no bar twice when the voice comes back from a pause (a hidden tab, a quick off and on)', () => {
    const voice = clockedVoice();
    const music = new GardenMusic(voice, () => 0.5);
    voice.time = 10;
    music.update();
    const first = voice.tones;
    voice.time = null;
    music.update();
    voice.time = 10.05; // the bar scheduled before the pause is still to come
    music.update();
    expect(voice.tones).toBe(first);
  });

  it('plays the win cadence only while it can be heard, and not once the game has moved on', () => {
    // the first bar after these moods (a win first, unheard, when `silentWin`)
    const bar = (silentWin: boolean, moods: readonly Mood[]): number[] => {
      const voice = clockedVoice();
      const music = new GardenMusic(voice, () => 0.5);
      if (silentWin) {
        voice.time = null;
        music.setMood('won');
        music.update();
      }
      voice.time = 10;
      for (const mood of moods) music.setMood(mood);
      music.update();
      return voice.delays;
    };
    expect(bar(true, ['won'])).toEqual(bar(false, ['lost'])); // won while silent: the chords just rest
    expect(bar(false, ['won', 'calm'])).toEqual(bar(false, ['calm'])); // played again before the bar line
    expect(bar(false, ['won'])).not.toEqual(bar(false, ['lost'])); // heard: the cadence plays
  });

  it('never schedules a bar in the past, when frames stalled or the clock ran on while it was silent', () => {
    for (const pause of [false, true]) {
      const voice = clockedVoice();
      const music = new GardenMusic(voice, () => 0.5);
      voice.time = 10;
      music.update();
      if (pause) {
        voice.time = null;
        music.update();
      }
      voice.time = 10 + (60 / MUSIC.tempo) * 4 + 0.5; // half a second past the next bar line
      music.update();
      expect(Math.min(...voice.delays)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Soundtrack', () => {
  it('tells its tracks how the game goes and dips the music under the effects', () => {
    const events = createGameEvents();
    const moods: Mood[] = [];
    const track: Track = { update: () => undefined, setMood: (mood) => void moods.push(mood) };
    const dips: [Bus, number][] = [];
    new Soundtrack(events, [track], { duck: (bus, depth) => void dips.push([bus, depth]) });
    events.emit('moveSpent', { movesLeft: 9 });
    events.emit('moveSpent', { movesLeft: 4 });
    events.emit('won');
    events.emit('match', { roundIndex: 0, size: 3 });
    events.emit('whirlPopped');
    expect(moods).toEqual(['calm', 'tense', 'won']);
    expect(dips).toEqual([
      ['music', MUSIC.duck.match],
      ['music', MUSIC.duck.special],
    ]);
  });

  it('turns the music calm as soon as a level starts again, before any move', () => {
    const events = createGameEvents();
    const moods: Mood[] = [];
    const track: Track = { update: () => undefined, setMood: (mood) => void moods.push(mood) };
    new Soundtrack(events, [track], { duck: () => undefined });
    events.emit('moveSpent', { movesLeft: 1 });
    events.emit('won');
    events.emit('levelStarted');
    expect(moods).toEqual(['tense', 'won', 'calm']);
  });
});
