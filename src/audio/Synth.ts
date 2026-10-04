import { AUDIO } from '../config/audio';

/** What a sound recipe plays with: tones, noise bursts and the two small building blocks, on the game's scale. */
export interface Voice {
  /** A tone: `freq` Hz for `dur` s at `vol`, gliding to `glide` Hz, `delay` s from now, swelling in over `attack` s. */
  tone(freq: number, dur: number, vol: number, opts?: ToneOptions): void;
  /** Soft noise through a lowpass at `freq` Hz (sweeping to `sweepTo`), for `dur` s at `vol`. */
  noise(dur: number, vol: number, freq: number, opts?: NoiseOptions): void;
  /** A plucked note: a sine and a short triangle an octave up. */
  pluck(freq: number, vol: number, delay?: number): void;
  /** A water plip: a short high sine dropping fast. */
  plip(delay?: number): void;
  /** Note `i` of the scale (D major pentatonic from D4; negative and past the octave wrap). */
  note(i: number): number;
  /** True at most once every `gap` s for `key`: keeps a burst of the same sound gentle. */
  throttle(key: string, gap: number): boolean;
}

export interface ToneOptions {
  readonly type?: OscillatorType;
  readonly delay?: number;
  readonly glide?: number;
  readonly attack?: number;
}

export interface NoiseOptions {
  readonly delay?: number;
  readonly sweepTo?: number;
  readonly attack?: number;
}

/** Note `i` of a scale over a base frequency (semitones per octave in `scale`). Pure. */
export function noteOf(i: number, base: number, scale: readonly number[]): number {
  const n = scale.length;
  const octave = Math.floor(i / n);
  const step = scale[((i % n) + n) % n] ?? 0;
  return base * Math.pow(2, (step + 12 * octave) / 12);
}

/**
 * The prototype's Web Audio synth, ported: every voice runs through its own gain envelope into a master gain and a
 * gentle compressor; noise comes from one second of softened white noise made once. The context is made on the
 * first touch (browsers only allow sound after one) and resumed when the page comes back; nothing plays while the
 * sound is off. A missing Web Audio just means silence.
 */
export class Synth implements Voice {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly last = new Map<string, number>();

  constructor(private on: boolean) {}

  get enabled(): boolean {
    return this.on;
  }

  /** Turns the sound on or off: the master volume fades, so sounds still ringing fade out with it. */
  setEnabled(on: boolean): void {
    this.on = on;
    if (this.ctx && this.out)
      this.out.gain.setTargetAtTime(on ? AUDIO.master : 0, this.ctx.currentTime, 0.03);
  }

  /** Makes (or resumes) the audio context. Call from a user gesture. */
  unlock(): void {
    this.init();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  tone(freq: number, dur: number, vol: number, opts: ToneOptions = {}): void {
    const ready = this.ready();
    if (!ready) return;
    const { ctx, out } = ready;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    envelope(gain, t, vol, opts.attack ?? 0.008, dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise(dur: number, vol: number, freq: number, opts: NoiseOptions = {}): void {
    const ready = this.ready();
    if (!ready || !this.noiseBuffer) return;
    const { ctx, out } = ready;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
    envelope(gain, t, vol, opts.attack ?? 0.02, dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(t, Math.random() * 0.1);
    source.stop(t + dur + 0.05);
  }

  pluck(freq: number, vol: number, delay = 0): void {
    this.tone(freq, 0.55, vol, { delay });
    this.tone(freq * 2, 0.16, vol * 0.3, { type: 'triangle', delay });
  }

  plip(delay = 0): void {
    this.tone(900 + Math.random() * 600, 0.08, 0.05, { delay, glide: 380 });
  }

  note(i: number): number {
    return noteOf(i, AUDIO.base, AUDIO.scale);
  }

  throttle(key: string, gap: number): boolean {
    const now = this.ctx?.currentTime ?? 0;
    if (now - (this.last.get(key) ?? -Infinity) < gap) return false;
    this.last.set(key, now);
    return true;
  }

  /** The context and the output, when sound can play now (made, running, and on). */
  private ready(): { ctx: AudioContext; out: GainNode } | null {
    if (!this.on || !this.ctx || !this.out || this.ctx.state !== 'running') return null;
    return { ctx: this.ctx, out: this.out };
  }

  private init(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      const ctx = new AudioContext();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 4;
      const out = ctx.createGain();
      out.gain.value = this.on ? AUDIO.master : 0;
      out.connect(compressor);
      compressor.connect(ctx.destination);
      this.noiseBuffer = softNoise(ctx);
      this.ctx = ctx;
      this.out = out;
    } catch (error) {
      console.warn('sound is not available', error);
    }
  }
}

/** A pluck's shape: from silence up to `vol` over `attack`, then down to silence at `dur` (both exponential). */
function envelope(gain: GainNode, t: number, vol: number, attack: number, dur: number): void {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
