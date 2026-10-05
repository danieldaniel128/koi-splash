import { AUDIO, MUSIC } from '../config/audio';

/** The parts of the music, each played by its own instrument (src/audio/instruments.ts). */
export type Part = 'pad' | 'bass' | 'arp' | 'koto' | 'flute' | 'drum';

/**
 * How a bar should go: calm, tense (a heartbeat under it, a busier melody), a cadence (the melody rising home to D,
 * for a win), or resting (only the chords, after a level ends).
 */
export type BarMood = 'calm' | 'tense' | 'cadence' | 'rest';

/** One note (or chord) of a bar: when it starts and how long it lasts (in eighths), and its pitches (semitones from D4). */
export interface MusicNote {
  readonly part: Part;
  readonly step: number;
  readonly length: number;
  readonly pitches: readonly number[];
}

/** A rhythm: notes at these eighths, this many eighths long. */
type Rhythm = readonly (readonly [step: number, length: number])[];

const STEPS = 8; // eighths in a bar
const KOTO_RHYTHMS: readonly Rhythm[] = [
  [
    [0, 2],
    [2, 1],
    [3, 1],
    [4, 4],
  ],
  [
    [0, 3],
    [3, 1],
    [4, 2],
    [6, 2],
  ],
  [
    [1, 1],
    [2, 2],
    [4, 4],
  ],
  [
    [0, 4],
    [6, 2],
  ],
];
const BUSY_RHYTHMS: readonly Rhythm[] = [
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 4],
  ],
  [
    [0, 2],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 2],
  ],
];
const FLUTE_RHYTHMS: readonly Rhythm[] = [
  [
    [0, 6],
    [6, 2],
  ],
  [
    [0, 3],
    [3, 5],
  ],
];
/** A phrase's last bar: it settles on a long note. */
const CLOSING: Rhythm = [
  [0, 2],
  [2, 2],
  [4, 4],
];
/** How the melody wanders from note to note (scale steps): mostly by step, sometimes a leap. */
const WALK = [-2, -1, -1, 1, 1, 2] as const;
const HEARTBEAT = [0, 1] as const;

/**
 * Composes the music bar by bar as it plays, so it never loops the same way twice: the chords of the progression
 * under a pad and a bass, a quiet arpeggio, and a melody that wanders the pentatonic scale by step, lands on the
 * chord on the strong beats and closes each four-bar phrase on a long chord tone (the last on the root); every other
 * answering phrase goes to the flute. Deterministic for a given random source (it's tested that way).
 */
export class Composer {
  private bar = 0;
  private degree: number = MUSIC.melody.start;
  private fluteAnswers = false;

  constructor(private readonly random: () => number) {}

  /** The next bar's notes. */
  next(mood: BarMood): MusicNote[] {
    // the cadence is the first bar of the home chord, so the bars after it go on in that chord
    if (mood === 'cadence') this.bar = 0;
    const notes = mood === 'cadence' ? cadence() : this.compose(mood);
    this.bar++;
    return notes;
  }

  private compose(mood: BarMood): MusicNote[] {
    const chord = this.chord();
    const notes: MusicNote[] = [{ part: 'bass', step: 0, length: STEPS, pitches: [chord.root] }];
    if (this.bar % MUSIC.bars === 0)
      notes.push({ part: 'pad', step: 0, length: STEPS * MUSIC.bars, pitches: chord.pad });
    if (mood === 'rest') return notes;
    notes.push(...arpeggio(chord.pad, mood === 'tense' ? [1, 3, 5, 7] : [2, 5]));
    if (mood === 'tense')
      notes.push(...HEARTBEAT.map((step) => ({ part: 'drum' as const, step, length: 1, pitches: [] })));
    notes.push(...this.melody(mood, chord.tones));
    return notes;
  }

  /** The chord this bar is in (each lasts MUSIC.bars bars). */
  private chord(): (typeof MUSIC.progression)[number] {
    const { progression } = MUSIC;
    return progression[Math.floor(this.bar / MUSIC.bars) % progression.length] ?? progression[0];
  }

  private melody(mood: BarMood, tones: readonly number[]): MusicNote[] {
    const inCycle = this.bar % (MUSIC.bars * MUSIC.progression.length);
    if (inCycle === 0) this.fluteAnswers = this.random() < MUSIC.melody.flute;
    const closing = inCycle % 4 === 3;
    if (!closing && inCycle !== 0 && this.random() < MUSIC.melody.rest) return [];
    const part = inCycle >= 4 && this.fluteAnswers ? 'flute' : 'koto';
    const rhythm = closing ? CLOSING : this.pick(this.rhythms(part, mood));
    return rhythm.map(([step, length], k) => {
      const last = closing && k === rhythm.length - 1;
      const strong = step % 4 === 0;
      this.degree = this.walk(strong || last ? tones : null, last && inCycle === 7);
      return { part, step, length, pitches: [semitonesOf(this.degree)] };
    });
  }

  private rhythms(part: Part, mood: BarMood): readonly Rhythm[] {
    if (part === 'flute') return FLUTE_RHYTHMS;
    return mood === 'tense' ? [...KOTO_RHYTHMS, ...BUSY_RHYTHMS] : KOTO_RHYTHMS;
  }

  /** The melody's next degree: a step or a leap within its range, landing on a chord tone (the root) when asked. */
  private walk(tones: readonly number[] | null, root: boolean): number {
    const { low, high } = MUSIC.melody;
    const target = Math.min(high, Math.max(low, this.degree + this.pick(WALK)));
    if (!tones) return target;
    return nearestTone(target, root ? tones.slice(0, 1) : tones, { low, high });
  }

  private pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.random() * items.length)];
    if (item === undefined) throw new Error('pick() from an empty list');
    return item;
  }
}

/** The pentatonic degree nearest `target` (within the range) whose place in the scale is one of `tones`. Pure. */
export function nearestTone(
  target: number,
  tones: readonly number[],
  range: { low: number; high: number },
): number {
  const size = AUDIO.scale.length;
  let best = target;
  let distance = Infinity;
  for (let degree = range.low; degree <= range.high; degree++) {
    const fits = tones.includes(((degree % size) + size) % size);
    if (fits && Math.abs(degree - target) < distance) {
      best = degree;
      distance = Math.abs(degree - target);
    }
  }
  return best;
}

/** A pentatonic degree (0 = D4) in semitones from D4. Pure. */
export function semitonesOf(degree: number): number {
  const size = AUDIO.scale.length;
  return (AUDIO.scale[((degree % size) + size) % size] ?? 0) + 12 * Math.floor(degree / size);
}

/** The chord's upper notes, one at a time, on these eighths. */
function arpeggio(pad: readonly number[], steps: readonly number[]): MusicNote[] {
  const upper = pad.slice(1);
  return steps.map((step, k) => ({ part: 'arp', step, length: 2, pitches: [upper[k % upper.length] ?? 0] }));
}

/** A win: the melody climbs the scale home to D, over the first chord (its pad held for the chord's bars, as usual). */
function cadence(): MusicNote[] {
  const [home] = MUSIC.progression;
  const climb = [5, 7, 8, 10].map((degree, k) => ({
    part: 'koto' as const,
    step: k,
    length: k === 3 ? STEPS - 3 : 1,
    pitches: [semitonesOf(degree)],
  }));
  return [
    { part: 'pad', step: 0, length: STEPS * MUSIC.bars, pitches: home.pad },
    { part: 'bass', step: 0, length: STEPS, pitches: [home.root] },
    ...climb,
  ];
}
