import { describe, expect, it } from 'vitest';
import { Composer } from '../src/audio/composer';
import type { BarMood, MusicNote } from '../src/audio/composer';
import { AUDIO, MUSIC } from '../src/config/audio';
import { Random } from '../src/core/Random';

/** Bars in one pass through the progression. */
const CYCLE = MUSIC.bars * MUSIC.progression.length;
/** Bars in a phrase: each closes on a long chord tone. */
const PHRASE = 4;

/** Bars from a seeded composer, one mood each. */
function compose(moods: readonly BarMood[], seed: number): MusicNote[][] {
  const random = new Random(seed);
  const composer = new Composer(() => random.next());
  return moods.map((mood) => composer.next(mood));
}

const melody = (bar: readonly MusicNote[]): MusicNote[] =>
  bar.filter((n) => n.part === 'koto' || n.part === 'flute');
const pitchClass = (semitones: number): number => ((semitones % 12) + 12) % 12;
/** The pitch classes of a chord's melody tones (they're places in the pentatonic scale). */
const tonesOf = (chord: (typeof MUSIC.progression)[number]): number[] =>
  chord.tones.map((place) => pitchClass(AUDIO.scale[place]));
const chordOf = (bar: number): (typeof MUSIC.progression)[number] =>
  MUSIC.progression[Math.floor(bar / MUSIC.bars) % MUSIC.progression.length] ?? MUSIC.progression[0];

describe('Composer, as its config sets it', () => {
  // a few seeds, three passes through the progression each
  const pieces = [1, 2, 3, 4].map((seed) => compose(Array<BarMood>(CYCLE * 3).fill('calm'), seed));

  it("plays each chord of the progression for its bars, the bass on the chord's root", () => {
    for (const bars of pieces) {
      bars.forEach((bar, k) => {
        const bass = bar.filter((n) => n.part === 'bass');
        expect(bass.map((n) => n.pitches)).toEqual([[chordOf(k).root]]);
        const pad = bar.find((n) => n.part === 'pad');
        expect(pad?.pitches).toEqual(k % MUSIC.bars === 0 ? chordOf(k).pad : undefined);
      });
    }
  });

  it('lands the melody on a tone of its chord on every strong beat', () => {
    for (const bars of pieces) {
      bars.forEach((bar, k) => {
        for (const note of melody(bar).filter((n) => n.step % 4 === 0)) {
          expect(tonesOf(chordOf(k))).toContain(pitchClass(note.pitches[0] ?? 0));
        }
      });
    }
  });

  it('closes every phrase on a long tone of its chord, and every pass on the root of the last chord', () => {
    const lastChord = MUSIC.progression[MUSIC.progression.length - 1] ?? MUSIC.progression[0];
    const root = pitchClass(AUDIO.scale[lastChord.tones[0]]);
    let closings = 0;
    for (const bars of pieces) {
      bars.forEach((bar, k) => {
        if (k % PHRASE !== PHRASE - 1) return;
        const last = melody(bar).at(-1);
        const pitch = pitchClass(last?.pitches[0] ?? -1);
        expect(last?.length).toBe(4);
        expect(tonesOf(chordOf(k))).toContain(pitch);
        if (k % CYCLE === CYCLE - 1) {
          expect(pitch).toBe(root);
          closings++;
        }
      });
    }
    expect(closings).toBe(pieces.length * 3);
  });
});
