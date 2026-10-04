/**
 * The sound, after the prototype's little Web Audio synth: plucked pentatonic notes, water plips and soft one-shot
 * splashes, all made on the fly (no sound files).
 * - master: the overall volume (into a gentle compressor); music: the background notes' volume
 * - base and scale: the notes are D major pentatonic from D4 (semitones of one octave)
 * - landGap, diveGap: the closest two landings or dives may sound (s), so a school stays gentle
 * - bell: the partials of the struck bell (frequency ratios)
 * - music: a background note every `every` s (a random time in that range), and how often a second note answers it
 */
export const AUDIO = {
  master: 0.5,
  base: 293.66,
  scale: [0, 2, 4, 7, 9],
  landGap: 0.06,
  diveGap: 0.055,
  countGap: 0.05,
  bell: [1, 2.76, 5.4, 8.93],
  music: { volume: 0.06, every: [1.6, 3.2], answer: 0.4, start: 2 },
  /** Moves left at which the move tick warms, then turns into a double knock. */
  lowMoves: 5,
  lastMoves: 3,
  /** Where the player's choice is kept between visits. */
  storageKey: 'koiSplash.sound',
} as const;
