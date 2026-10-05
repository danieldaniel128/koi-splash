import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mixer } from '../src/audio/Mixer';

/** Just enough of an AudioContext for the mixer: it starts suspended, counts its resumes and can refuse them. */
class FakeContext extends EventTarget {
  static made: FakeContext[] = [];
  static refusing = false;
  state = 'suspended';
  resumes = 0;
  readonly sampleRate = 8;
  readonly destination = {};
  readonly currentTime = 0;

  constructor() {
    super();
    FakeContext.made.push(this);
  }

  resume(): Promise<void> {
    this.resumes++;
    return FakeContext.refusing ? Promise.reject(new Error('not allowed yet')) : Promise.resolve();
  }

  suspend(): Promise<void> {
    return Promise.resolve();
  }

  createDynamicsCompressor(): object {
    return { threshold: { value: 0 }, ratio: { value: 0 }, connect: () => undefined };
  }

  createGain(): object {
    return { gain: { value: 0 }, connect: () => undefined };
  }

  createBuffer(_channels: number, length: number): object {
    return { getChannelData: () => new Float32Array(length) };
  }

  /** The browser moves the context to a new state. */
  become(state: string): void {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

/** A mixer listening on a page of its own, and a way to make a gesture there (a touch, unless told). */
function setup(): { gesture: (type: string, pointerType?: string) => void } {
  vi.stubGlobal('AudioContext', FakeContext);
  const page = new EventTarget();
  new Mixer({ music: true, ambience: true, sfx: true }).listenForUnlock(page);
  const gesture = (type: string, pointerType = 'touch'): void => {
    page.dispatchEvent(Object.assign(new Event(type), { pointerType }));
  };
  return { gesture };
}

/** The context the mixer made. */
function context(): FakeContext {
  const ctx = FakeContext.made.at(-1);
  if (!ctx) throw new Error('no audio context was made');
  return ctx;
}

describe('Mixer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakeContext.made = [];
    FakeContext.refusing = false;
  });

  it('starts the sound when a finger lifts, not when it goes down; a mouse press starts it at once', () => {
    const touch = setup();
    touch.gesture('pointerdown');
    expect(FakeContext.made).toEqual([]);
    touch.gesture('pointerup');
    expect(context().resumes).toBe(1);

    const mouse = setup();
    mouse.gesture('pointerdown', 'mouse');
    expect(context().resumes).toBe(1);
  });

  it('stops listening once the sound runs, and starts it again after the phone interrupted it', () => {
    const { gesture } = setup();
    gesture('click');
    context().become('running');
    gesture('keydown');
    expect(context().resumes).toBe(1);
    context().become('interrupted');
    gesture('touchend');
    expect(context().resumes).toBe(2);
  });

  it('catches a refused start, and the next gesture tries again', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { gesture } = setup();
    FakeContext.refusing = true;
    gesture('click');
    await Promise.resolve();
    expect(warn).toHaveBeenCalledOnce();
    FakeContext.refusing = false;
    gesture('keydown');
    expect(context().resumes).toBe(2);
  });
});
