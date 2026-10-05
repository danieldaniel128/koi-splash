import { AUDIO } from '../config/audio';
import type { Bus } from '../config/audio';
import type { Mixer, Output } from './Mixer';
import { noteOf } from './pitch';

/** What a sound recipe plays with: tones, noise bursts and the two small building blocks, on the game's scale. */
export interface Voice {
  /** A tone: `freq` Hz for `dur` s at `vol`, gliding to `glide` Hz, `delay` s from now, swelling in over `attack` s. */
  tone(freq: number, dur: number, vol: number, opts?: ToneOptions): void;
  /** Soft noise through a lowpass at `freq` Hz (sweeping to `sweepTo`), for `dur` s at `vol`. */
  noise(freq: number, dur: number, vol: number, opts?: NoiseOptions): void;
  /** A plucked note: a sine and a short triangle an octave up. */
  pluck(freq: number, vol: number, delay?: number): void;
  /** A water plip: a short high sine dropping fast. */
  plip(delay?: number): void;
  /** Note `i` of the scale (D major pentatonic from D4; negative and past the octave wrap). */
  note(i: number): number;
  /** True at most once every `gap` s for `key`: keeps a burst of the same sound gentle. */
  throttle(key: string, gap: number): boolean;
  /** The audio clock (s), or null while this voice can't play (no touch yet, its channel off, the page hidden). */
  now(): number | null;
}

/** Where a sound sits: -1 (left) to 1 (right). */
interface Placed {
  readonly pan?: number;
}

export interface ToneOptions extends Placed {
  readonly type?: OscillatorType;
  readonly delay?: number;
  readonly glide?: number;
  readonly attack?: number;
  /** Cents off the note (a pair a few cents apart makes a pad shimmer). */
  readonly detune?: number;
  /** A lowpass at this many Hz, to soften a bright wave. */
  readonly filter?: number;
  /** A slow wobble in pitch: `rate` Hz, `depth` Hz either way (a breathy flute). */
  readonly vibrato?: { readonly rate: number; readonly depth: number };
}

export interface NoiseOptions extends Placed {
  readonly delay?: number;
  readonly sweepTo?: number;
  readonly attack?: number;
  /** A bandpass of this sharpness at `freq` instead of the lowpass: a breath on a note, an airy hiss. */
  readonly band?: number;
}

/**
 * The prototype's Web Audio synth, ported, playing on one of the mixer's channels: every voice runs through its own
 * gain envelope (and a filter and a pan when asked) into the channel. Nothing plays while the channel is off.
 */
export class Synth implements Voice {
  private readonly last = new Map<string, number>();

  constructor(
    private readonly mixer: Mixer,
    private readonly bus: Bus,
  ) {}

  tone(freq: number, dur: number, vol: number, opts: ToneOptions = {}): void {
    const output = this.mixer.output(this.bus);
    if (!output) return;
    const { ctx } = output;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    if (opts.detune) osc.detune.value = opts.detune;
    if (opts.vibrato) wobble(ctx, osc, opts.vibrato, { t, dur });
    const shaped = opts.filter ? lowpass(ctx, osc, opts.filter, t) : osc;
    playThrough(output, shaped, { t, vol, attack: opts.attack ?? 0.008, dur, pan: opts.pan });
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise(freq: number, dur: number, vol: number, opts: NoiseOptions = {}): void {
    const output = this.mixer.output(this.bus);
    const buffer = this.mixer.noise;
    if (!output || !buffer) return;
    const { ctx } = output;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    source.buffer = buffer;
    source.loop = dur > buffer.duration - 0.1; // a long swell reads round the second of noise
    filter.type = opts.band ? 'bandpass' : 'lowpass';
    if (opts.band) filter.Q.value = opts.band;
    filter.frequency.setValueAtTime(freq, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
    source.connect(filter);
    playThrough(output, filter, { t, vol, attack: opts.attack ?? 0.02, dur, pan: opts.pan });
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
    const now = this.now() ?? 0;
    if (now - (this.last.get(key) ?? -Infinity) < gap) return false;
    this.last.set(key, now);
    return true;
  }

  now(): number | null {
    return this.mixer.output(this.bus)?.ctx.currentTime ?? null;
  }
}

/** How a sound is shaped on its way out: from `t`, up to `vol` over `attack`, gone at `dur`, placed at `pan`. */
interface Shape {
  readonly t: number;
  readonly vol: number;
  readonly attack: number;
  readonly dur: number;
  readonly pan?: number | undefined;
}

/** Sends a source through its envelope (and its pan) into the channel. */
function playThrough(output: Output, source: AudioNode, shape: Shape): void {
  const { ctx, out } = output;
  const gain = ctx.createGain();
  envelope(gain, shape);
  source.connect(gain);
  if (shape.pan === undefined) {
    gain.connect(out);
    return;
  }
  const panner = ctx.createStereoPanner();
  panner.pan.value = shape.pan;
  gain.connect(panner);
  panner.connect(out);
}

/** A pluck's shape: from silence up to `vol` over `attack`, then down to silence at `dur` (both exponential). */
function envelope(gain: GainNode, { t, vol, attack, dur }: Shape): void {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

/** A lowpass after a source. */
function lowpass(ctx: AudioContext, source: AudioNode, freq: number, t: number): AudioNode {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, t);
  source.connect(filter);
  return filter;
}

/** A slow oscillator nudging another's pitch, for as long as it plays. */
function wobble(
  ctx: AudioContext,
  osc: OscillatorNode,
  vibrato: { rate: number; depth: number },
  span: { t: number; dur: number },
): void {
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = vibrato.rate;
  depth.gain.value = vibrato.depth;
  lfo.connect(depth);
  depth.connect(osc.frequency);
  lfo.start(span.t);
  lfo.stop(span.t + span.dur + 0.03);
}
