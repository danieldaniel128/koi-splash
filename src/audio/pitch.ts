import { AUDIO } from '../config/audio';

/** How much higher a note this many semitones up sounds (a frequency ratio). Pure. */
export function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/** The note this many semitones above the base (D4), in Hz. Pure. */
export function frequencyOf(semitones: number, base: number = AUDIO.base): number {
  return base * semitoneRatio(semitones);
}

/** Note `i` of a scale over a base frequency (semitones per octave in `scale`). Pure. */
export function noteOf(i: number, base: number, scale: readonly number[]): number {
  const n = scale.length;
  const octave = Math.floor(i / n);
  const step = scale[((i % n) + n) % n] ?? 0;
  return frequencyOf(step + 12 * octave, base);
}
