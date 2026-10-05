import { AMBIENCE, AUDIO, MUSIC } from '../config/audio';
import type { MusicNote, Part } from './composer';
import { frequencyOf } from './pitch';
import type { Voice } from './Synth';

/** When a note sounds: `delay` s from now, lasting `seconds`. */
export interface Timing {
  readonly delay: number;
  readonly seconds: number;
}

/** How each part of the music sounds, built from the voice's tones and noise (Strategy, one per part). */
const INSTRUMENTS: Readonly<Record<Part, (v: Voice, freqs: readonly number[], at: Timing) => void>> = {
  pad: (v, freqs, { delay, seconds }) => {
    // two waves a few cents apart per note, softened and spread across the stereo field: a slow shimmering swell
    freqs.forEach((freq, k) => {
      const pan = (k / Math.max(1, freqs.length - 1)) * 0.8 - 0.4;
      const swell = { delay, attack: seconds * 0.35, filter: 900, pan };
      v.tone(freq, seconds + 1, MUSIC.volumes.pad, { ...swell, type: 'triangle', detune: -6 });
      v.tone(freq, seconds + 1, MUSIC.volumes.pad * 0.7, { ...swell, detune: 6 });
    });
  },
  bass: (v, [freq = 0], { delay, seconds }) => {
    v.tone(freq, seconds, MUSIC.volumes.bass, { delay, attack: 0.03 });
    v.tone(freq * 2, 0.35, MUSIC.volumes.bass * 0.25, { delay, type: 'triangle', filter: 700 }); // heard on a phone
  },
  arp: (v, [freq = 0], { delay }) => {
    koto(v, freq, MUSIC.volumes.arp, { delay, seconds: 1 });
  },
  koto: (v, [freq = 0], at) => {
    koto(v, freq, MUSIC.volumes.koto, at);
  },
  flute: (v, [freq = 0], { delay, seconds }) => {
    // a breathy shakuhachi: a sine that swells in with a slow vibrato, a faint overtone and the breath on its note
    const vol = MUSIC.volumes.flute;
    v.tone(freq, seconds, vol, { delay, attack: 0.18, vibrato: { rate: 4.8, depth: freq * 0.007 } });
    v.tone(freq * 2, seconds * 0.8, vol * 0.08, { delay, attack: 0.25 });
    v.noise(freq, seconds * 0.9, vol * 0.3, { delay, attack: 0.12, band: 8 });
  },
  drum: (v, _freqs, { delay }) => {
    // a soft taiko under the water: a low thump falling in pitch, a hint of skin, and a higher knock in the body
    // of the drum so phone speakers, which can't play the thump, still carry the beat
    v.tone(85, 0.45, MUSIC.volumes.drum, { delay, glide: 48, attack: 0.004 });
    v.tone(190, 0.12, MUSIC.volumes.drum * 0.45, { delay, glide: 130, attack: 0.002, type: 'triangle' });
    v.noise(1100, 0.06, MUSIC.volumes.drum * 0.35, { delay });
  },
};

/** Plays one note of the music on its instrument. */
export function playNote(v: Voice, note: MusicNote, at: Timing): void {
  INSTRUMENTS[note.part](
    v,
    note.pitches.map((semitones) => frequencyOf(semitones)),
    at,
  );
}

/** A plucked koto string: a bright triangle softened, its body, and a short glint an octave and a fifth up. */
function koto(v: Voice, freq: number, vol: number, { delay, seconds }: Timing): void {
  const ring = Math.max(0.9, Math.min(1.8, seconds + 0.5));
  v.tone(freq, ring, vol, { delay, type: 'triangle', filter: 2600, attack: 0.005 });
  v.tone(freq, ring * 0.7, vol * 0.6, { delay, attack: 0.005 });
  v.tone(freq * 3, 0.12, vol * 0.12, { delay, attack: 0.003 });
}

/** The ambience's sounds; `random` gives each its own small variation (where it sits, its pitch). */
export const AMBIENT = {
  /** Water lapping at the stones: a long soft swell of low noise, darkening as it falls back. */
  water: (v: Voice, delay: number, random: () => number): void => {
    const { volume, length } = AMBIENCE.water;
    v.noise(380 + random() * 120, length, volume, {
      delay,
      sweepTo: 240,
      attack: length * 0.45,
      pan: random() * 0.8 - 0.4,
    });
  },
  /** A drop into the pond: a high bloop falling fast, and a softer one after it. */
  drop: (v: Voice, delay: number, random: () => number): void => {
    const freq = 1100 + random() * 600;
    const pan = random() * 1.2 - 0.6;
    v.tone(freq, 0.09, AMBIENCE.drop.volume, { delay, glide: freq * 0.38, pan });
    v.tone(freq * 0.7, 0.14, AMBIENCE.drop.volume * 0.4, { delay: delay + 0.05, glide: freq * 0.3, pan });
  },
  /** A cricket from one side: a few chirps, each three quick pulses. */
  cricket: (v: Voice, delay: number, random: () => number): void => {
    const { volume, pitch, chirps } = AMBIENCE.cricket;
    const pan = random() < 0.5 ? -0.7 : 0.7;
    const freq = pitch * (0.95 + random() * 0.1);
    const count = chirps[0] + Math.floor(random() * (chirps[1] - chirps[0] + 1));
    for (let chirp = 0; chirp < count; chirp++) {
      for (let pulse = 0; pulse < 3; pulse++) {
        v.tone(freq, 0.022, volume, { delay: delay + chirp * 0.28 + pulse * 0.042, attack: 0.004, pan });
      }
    }
  },
  /** A far wind chime: a few high bells of the scale, struck one after another. */
  chime: (v: Voice, delay: number, random: () => number): void => {
    const { volume, notes } = AMBIENCE.chime;
    const count = notes[0] + Math.floor(random() * (notes[1] - notes[0] + 1));
    let at = delay;
    for (let k = 0; k < count; k++) {
      const freq = v.note(10 + Math.floor(random() * 5));
      const pan = random() * 1.4 - 0.7;
      AUDIO.bell.forEach((ratio, n) => {
        v.tone(freq * ratio, 3.2 / (n + 1), volume / (n + 1), { delay: at, attack: 0.004, pan });
      });
      at += 0.25 + random() * 0.45;
    }
  },
} as const;
