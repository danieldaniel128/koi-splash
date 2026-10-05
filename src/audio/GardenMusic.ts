import { AUDIO, MUSIC } from '../config/audio';
import { Composer } from './composer';
import type { BarMood } from './composer';
import { playNote } from './instruments';
import type { Voice } from './Synth';
import type { Mood, Track } from './Track';

const STEPS_PER_BAR = 8;

/**
 * The music, composed as it plays: each bar is asked of the composer just before it's due and scheduled on the audio
 * clock, so it keeps time when a frame is late. The game's mood takes effect at the next bar line: tense grows a
 * heartbeat, a win plays the cadence home once and then the chords rest, a loss rests.
 */
export class GardenMusic implements Track {
  private readonly composer: Composer;
  private readonly stepSeconds = 60 / MUSIC.tempo / 2;
  private mood: Mood = 'calm';
  private cadenceDue = false;
  private nextBar: number | null = null;

  constructor(
    private readonly voice: Voice,
    random: () => number = Math.random,
  ) {
    this.composer = new Composer(random);
  }

  setMood(mood: Mood): void {
    // a win plays its cadence at the next bar line, unless the game has moved on by then
    if (mood !== 'won') this.cadenceDue = false;
    else if (this.mood !== 'won') this.cadenceDue = true;
    this.mood = mood;
  }

  /**
   * Schedules the bars due before the lookahead. While the voice can't play, the bar line is kept: the bars already
   * scheduled still play when it's back (a hidden page's clock stops and goes on where it stopped), so starting a
   * fresh one would play two at once. A bar line the clock has passed (it ran on with nothing scheduled) starts afresh
   * just ahead, so no bar is ever scheduled in the past.
   */
  update(): void {
    const now = this.voice.now();
    if (now === null) {
      this.cadenceDue = false; // a win the player didn't hear isn't played later, in the middle of the next game
      return;
    }
    if (this.nextBar === null || this.nextBar < now) this.nextBar = now + 0.1;
    while (this.nextBar < now + AUDIO.lookahead) {
      this.play(this.nextBar - now);
      this.nextBar += this.stepSeconds * STEPS_PER_BAR;
    }
  }

  private play(delay: number): void {
    for (const note of this.composer.next(this.barMood())) {
      playNote(this.voice, note, {
        delay: delay + note.step * this.stepSeconds,
        seconds: note.length * this.stepSeconds,
      });
    }
  }

  private barMood(): BarMood {
    if (this.cadenceDue) {
      this.cadenceDue = false;
      return 'cadence';
    }
    if (this.mood === 'won' || this.mood === 'lost') return 'rest';
    return this.mood;
  }
}
