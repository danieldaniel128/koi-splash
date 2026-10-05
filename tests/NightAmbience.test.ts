import { afterEach, describe, expect, it, vi } from 'vitest';
import { AMBIENT } from '../src/audio/instruments';
import { NightAmbience } from '../src/audio/NightAmbience';
import { noteOf } from '../src/audio/Synth';
import type { Voice } from '../src/audio/Synth';
import { AMBIENCE, AUDIO } from '../src/config/audio';
import { Random } from '../src/core/Random';

type Layer = keyof typeof AMBIENT;
const LAYERS = Object.keys(AMBIENT) as Layer[];

/** A voice on a clock the test moves (null: it can't play), counting the noises it was asked for. */
function clockedVoice(): Voice & { time: number | null; noises: number } {
  const voice = {
    time: 0 as number | null,
    noises: 0,
    tone: () => undefined,
    noise: () => {
      voice.noises++;
    },
    pluck: () => undefined,
    plip: () => undefined,
    note: (i: number) => noteOf(i, AUDIO.base, AUDIO.scale),
    throttle: () => true,
    now: () => voice.time,
  };
  return voice;
}

/** How often each layer sounds, counted by watching the layers themselves. */
function countLayers(): Record<Layer, () => number> {
  const spies = LAYERS.map((layer) => [layer, vi.spyOn(AMBIENT, layer)] as const);
  return Object.fromEntries(spies.map(([layer, spy]) => [layer, () => spy.mock.calls.length])) as Record<
    Layer,
    () => number
  >;
}

/** Updates the ambience every tenth of a second, from `from` to `to` on the voice's clock (s). */
function play(ambience: NightAmbience, voice: { time: number | null }, from: number, to: number): void {
  for (let t = from; t < to; t += 0.1) {
    voice.time = t;
    ambience.update();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NightAmbience', () => {
  it('sounds every layer again and again, each after a gap from its own range', () => {
    const seconds = 120;
    const voice = clockedVoice();
    const random = new Random(11);
    const calls = countLayers();
    play(new NightAmbience(voice, () => random.next()), voice, 0, seconds);
    for (const layer of LAYERS) {
      const [shortest, longest] = AMBIENCE[layer].gap;
      expect(calls[layer](), layer).toBeGreaterThanOrEqual(Math.floor(seconds / longest));
      expect(calls[layer](), layer).toBeLessThanOrEqual(
        Math.floor((seconds + AUDIO.lookahead) / shortest) + 1,
      );
    }
    expect(voice.noises).toBe(calls.water()); // the water is the one layer made of noise
  });

  it('stays quiet while the voice cannot play, and starts afresh after, without catching up', () => {
    const voice = clockedVoice();
    const calls = countLayers();
    const ambience = new NightAmbience(voice, () => 0.5);
    play(ambience, voice, 0, 10);
    const before = LAYERS.map((layer) => calls[layer]());
    voice.time = null;
    ambience.update();
    expect(LAYERS.map((layer) => calls[layer]())).toEqual(before);
    voice.time = 70; // a minute later: a minute's worth must not play at once
    ambience.update();
    LAYERS.forEach((layer, i) => {
      expect(calls[layer]() - (before[i] ?? 0), layer).toBeLessThanOrEqual(1);
    });
  });
});
