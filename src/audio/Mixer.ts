import { AUDIO } from '../config/audio';

/** The sound's channels: each has its own volume and switch, and they all meet in the master. */
export type Bus = 'sfx' | 'music' | 'ambience';

export const BUSES: readonly Bus[] = ['music', 'ambience', 'sfx'];

/** Something for every bus. Pure. */
export function byBus<T>(make: (bus: Bus) => T): Record<Bus, T> {
  return { music: make('music'), ambience: make('ambience'), sfx: make('sfx') };
}

/** Where a voice plays now: the audio context and its channel's input. */
export interface Output {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
}

/**
 * The events a browser counts as the player's own gesture, the only moments it lets a page start sound. A finger
 * going down isn't one yet (it may turn into a scroll): its lift is.
 */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/** One channel: its level (volume and switch) and, under it, a dip the music takes under the effects. */
interface Channel {
  readonly level: GainNode;
  readonly duck: GainNode;
}

/**
 * The mixer: the audio context, a channel per bus (level, then a duck), the master volume and a gentle compressor
 * that evens out a big cascade. The context is made on the player's first gesture (browsers only allow sound after
 * one), sleeps while the page is hidden, and a missing Web Audio just means silence. A channel that's off gives no
 * output, so nothing is even scheduled on it.
 */
export class Mixer {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly channels = new Map<Bus, Channel>();
  private gestures: EventTarget | null = null;

  constructor(private readonly on: Record<Bus, boolean>) {}

  /** One second of soft noise every voice shares (null before the first touch). */
  get noise(): AudioBuffer | null {
    return this.noiseBuffer;
  }

  isOn(bus: Bus): boolean {
    return this.on[bus];
  }

  /** Turns a channel on or off: it fades, so sounds still ringing fade with it. */
  setOn(bus: Bus, on: boolean): void {
    this.on[bus] = on;
    const channel = this.channels.get(bus);
    if (this.ctx && channel)
      channel.level.gain.setTargetAtTime(this.levelOf(bus), this.ctx.currentTime, 0.05);
  }

  /**
   * Starts the sound on the player's next gesture on `target`. It listens whenever the sound isn't running, so a
   * phone that stopped it (a call, another app's sound) gets it back on the next tap.
   */
  listenForUnlock(target: EventTarget): void {
    this.gestures = target;
    this.listen(true);
  }

  /** Makes (or resumes) the audio context. Call from a user gesture. */
  unlock(): void {
    this.init();
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    ctx.resume().catch((error: unknown) => {
      console.warn('sound could not start yet', error); // the next gesture tries again
    });
  }

  /** Lets the sound sleep while the page is hidden, and wakes it when it's back. */
  setAwake(awake: boolean): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'closed') return;
    (awake ? ctx.resume() : ctx.suspend()).catch((error: unknown) => {
      console.warn('sound could not sleep or wake', error);
    });
  }

  /** The context and a channel's input, when the channel can play now (made, running, and on). */
  output(bus: Bus): Output | null {
    const channel = this.channels.get(bus);
    if (!this.on[bus] || !this.ctx || !channel || this.ctx.state !== 'running') return null;
    return { ctx: this.ctx, out: channel.level };
  }

  /** Dips a channel by `depth` (share of its volume) at once, then lets it come back over `seconds`. */
  duck(bus: Bus, depth: number, seconds: number): void {
    const channel = this.channels.get(bus);
    if (!this.ctx || !channel) return;
    const gain = channel.duck.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(1 - depth, now, 0.02);
    gain.setTargetAtTime(1, now + 0.08, seconds / 3);
  }

  /** Listens for the gestures that can start the sound, or stops. Adding the same listener twice adds it once. */
  private listen(on: boolean): void {
    const target = this.gestures;
    if (!target) return;
    for (const type of GESTURES) {
      if (on) target.addEventListener(type, this.handleGesture, { capture: true });
      else target.removeEventListener(type, this.handleGesture, { capture: true });
    }
  }

  // An arrow function keeps `this` bound as a listener; capture, so a handler that stops the event can't hide it.
  private readonly handleGesture = (event: Event): void => {
    if (event.type === 'pointerdown' && (event as PointerEvent).pointerType !== 'mouse') return;
    this.unlock();
  };

  private levelOf(bus: Bus): number {
    return this.on[bus] ? AUDIO.buses[bus] : 0;
  }

  private init(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      const ctx = new AudioContext();
      // a gentle squeeze on the loudest moments, not a hard limiter, so the mix keeps its swells
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 4;
      compressor.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = AUDIO.master;
      master.connect(compressor);
      for (const bus of BUSES) this.channels.set(bus, this.channel(ctx, bus, master));
      this.noiseBuffer = softNoise(ctx);
      ctx.addEventListener('statechange', () => {
        this.listen(ctx.state !== 'running' && ctx.state !== 'closed');
      });
      this.ctx = ctx;
    } catch (error) {
      console.warn('sound is not available', error);
    }
  }

  private channel(ctx: AudioContext, bus: Bus, master: AudioNode): Channel {
    const level = ctx.createGain();
    const duck = ctx.createGain();
    level.gain.value = this.levelOf(bus);
    level.connect(duck);
    duck.connect(master);
    return { level, duck };
  }
}

/** One second of white noise softened by a one-pole lowpass: a water hiss, not a radio hiss. */
function softNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b = 0;
  for (let i = 0; i < length; i++) {
    b = b * 0.62 + (Math.random() * 2 - 1) * 0.38;
    data[i] = b * 1.8;
  }
  return buffer;
}
