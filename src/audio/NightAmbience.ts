import { AMBIENCE, AUDIO } from '../config/audio';
import { AMBIENT } from './instruments';
import type { Voice } from './Synth';
import type { Track } from './Track';

type Layer = keyof typeof AMBIENT;

const LAYERS = Object.keys(AMBIENT) as Layer[];

/**
 * The pond at night, made as it plays: each layer (water, drops, crickets, a chime) sounds again after a random gap
 * from its range, scheduled a little ahead on the audio clock. It doesn't follow the game's mood: the pond is the
 * same whatever happens on it.
 */
export class NightAmbience implements Track {
  private readonly next = new Map<Layer, number>();

  constructor(
    private readonly voice: Voice,
    private readonly random: () => number = Math.random,
  ) {}

  setMood(): void {
    // the pond doesn't change with the game
  }

  update(): void {
    const now = this.voice.now();
    if (now === null) {
      this.next.clear(); // off or asleep: start fresh when it's back
      return;
    }
    for (const layer of LAYERS) this.next.set(layer, this.schedule(layer, now));
  }

  /** Plays a layer's sounds due before the lookahead; returns when it's due next. */
  private schedule(layer: Layer, now: number): number {
    let at = this.next.get(layer) ?? now + this.gap(layer) * this.random(); // the layers start staggered
    if (at < now - 1) at = now;
    while (at < now + AUDIO.lookahead) {
      AMBIENT[layer](this.voice, Math.max(0, at - now), this.random);
      at += this.gap(layer);
    }
    return at;
  }

  private gap(layer: Layer): number {
    const [low, high] = AMBIENCE[layer].gap;
    return low + this.random() * (high - low);
  }
}
