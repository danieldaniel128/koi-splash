/**
 * The sound, after the prototype's little Web Audio synth: plucked pentatonic notes, water plips and soft one-shot
 * splashes, all made on the fly (no sound files), on three channels with their own volume: the effects, the music
 * and the ambience.
 * - master: the overall volume (into a gentle compressor); buses: each channel's volume under it
 * - base and scale: the notes are D major pentatonic from D4 (semitones of one octave)
 * - landGap, diveGap: the closest two landings or dives may sound (s), so a school stays gentle
 * - bell: the partials of the struck bell (frequency ratios)
 */
/**
 * A match's sound climbs with each round of a cascade: its first note is this scale degree, and it climbs one degree
 * a round up to `maxClimb`; a bigger match adds a third note. The splash under it grows by `perKoi` for each koi
 * cleared, up to `koiCap` koi.
 */
export const MATCH_SOUND = {
  firstNote: 4,
  maxClimb: 9,
  /** Scale degrees above the first note for the second and third plucks. */
  second: 2,
  third: 4,
  splash: 0.07,
  perKoi: 0.008,
  koiCap: 10,
} as const;

/** The sound's channels: each has its own volume and switch, and they all meet in the master. */
export const BUSES = ['music', 'ambience', 'sfx'] as const;
export type Bus = (typeof BUSES)[number];

export const AUDIO = {
  master: 0.5,
  buses: { sfx: 1, music: 0.6, ambience: 0.8 },
  base: 293.66,
  scale: [0, 2, 4, 7, 9],
  landGap: 0.06,
  diveGap: 0.055,
  bell: [1, 2.76, 5.4, 8.93],
  /** How far ahead the music and ambience are scheduled on the audio clock (s): steady even when a frame is late. */
  lookahead: 0.25,
  /** Where the player's choices are kept between visits (one key per channel under it). */
  storageKey: 'koiSplash.sound',
} as const;

/**
 * The music: a slow moonlit-garden piece, composed as it plays (src/audio/composer.ts) so it never loops the same
 * way twice. Swap `file` for a URL to play a recorded loop on the music channel instead (moods then don't apply).
 * - tempo: beats a minute (a bar is 4 beats, counted in eighths)
 * - progression: the chords, `bars` each: the bass root, the pad's voicing (semitones from D4) and the melody's chord
 *   tones (degrees of the pentatonic scale, 0..4)
 * - melody: the range it wanders in (scale steps from D4), how often a bar rests, and how often a phrase is the flute's
 * - volumes: each part's level on the music channel
 * - duck: how far the music dips (share of its volume) under a match or a special, and how fast it comes back (s)
 */
export const MUSIC = {
  file: null as string | null,
  tempo: 68,
  bars: 2,
  progression: [
    { name: 'Dadd9', root: -12, pad: [-12, -5, 2, 4], tones: [0, 2, 3] },
    { name: 'Bm7', root: -15, pad: [-15, -8, -5, 0], tones: [4, 0, 2] },
    { name: 'Gmaj7', root: -19, pad: [-7, -3, 0, 4], tones: [4, 0, 2] },
    { name: 'Asus4', root: -17, pad: [-5, 0, 2, 9], tones: [3, 1, 4] },
  ],
  melody: { low: 3, high: 10, start: 5, rest: 0.2, flute: 0.5 },
  volumes: { pad: 0.05, bass: 0.1, arp: 0.05, koto: 0.11, flute: 0.08, drum: 0.14 },
  duck: { match: 0.25, special: 0.5, back: 0.6 },
} as const;

/**
 * The ambience: a pond at night, also made as it plays. Each layer sounds again after a random gap in its range (s):
 * water lapping at the stones (long soft swells that overlap into one), a drop now and then, crickets singing in
 * short bouts from either side, and a far wind chime. `file` plays a recorded loop instead.
 */
export const AMBIENCE = {
  file: null as string | null,
  water: { gap: [1.4, 2.4], volume: 0.3, length: 4.5 },
  drop: { gap: [2.5, 7], volume: 0.06 },
  cricket: { gap: [0.5, 2.8], volume: 0.022, pitch: 4300, chirps: [2, 4] },
  chime: { gap: [16, 34], volume: 0.04, notes: [2, 4] },
} as const;
