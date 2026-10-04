/** How the game is going, for the music: calm, tense (few moves left), or the level won or lost. */
export type Mood = 'calm' | 'tense' | 'won' | 'lost';

/**
 * Something that plays on a channel for as long as the game runs: the music, the ambience. A generated one schedules
 * its next sounds a little ahead of the audio clock on every update; a recorded one just loops. Swapping one for the
 * other changes nothing around it.
 */
export interface Track {
  /** Call once per frame. */
  update(): void;
  /** How the game is going; a track may ignore it. */
  setMood(mood: Mood): void;
}
