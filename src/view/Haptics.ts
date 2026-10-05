/**
 * Short vibrations on phones that have them, for the big moments. They go with the sound effects: off when the
 * effects channel is off. Where the browser can't vibrate, nothing happens; it never throws.
 */
export class Haptics {
  constructor(
    /** Whether the effects channel is on now. */
    private readonly effectsOn: () => boolean,
  ) {}

  /** A pulse of `pattern` ms (or a pattern of pulses and pauses). */
  pulse(pattern: number | readonly number[]): void {
    if (!this.effectsOn() || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    } catch {
      // a browser may refuse to vibrate (no gesture yet, a setting): the moment just has no buzz
    }
  }
}
