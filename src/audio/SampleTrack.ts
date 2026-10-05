import { runDetached } from '../core/detached';
import type { Bus, Mixer, Output } from './Mixer';
import type { Track } from './Track';

/**
 * A recorded loop on a channel, for when the music or the ambience is a file (MUSIC.file, AMBIENCE.file): fetched
 * and decoded once the channel can play, then looped. It doesn't follow the game's mood. A file that won't load is
 * just silence (and a warning).
 */
export class SampleTrack implements Track {
  private started = false;

  constructor(
    private readonly mixer: Mixer,
    private readonly bus: Bus,
    private readonly url: string,
  ) {}

  setMood(): void {
    // a recording plays as it was made
  }

  update(): void {
    if (this.started) return;
    const output = this.mixer.output(this.bus);
    if (!output) return;
    this.started = true;
    runDetached(this.start(output), `the recording ${this.url}`);
  }

  private async start({ ctx, out }: Output): Promise<void> {
    try {
      const response = await fetch(this.url);
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(out);
      source.start();
    } catch (error) {
      console.warn(`could not play ${this.url}`, error);
    }
  }
}
