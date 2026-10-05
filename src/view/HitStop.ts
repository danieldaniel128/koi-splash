import { SPECIAL_FX } from '../config/specials';

/**
 * Hit-stop: the animations' clock slows to a crawl for an instant (`scale` of real speed), so a hit lands. The frame
 * loop moves GSAP's clock on by real time times `rate` (see addFrameLoop), so only the tweens slow: the water, the
 * koi's swimming, the sound and the HTML UI's own animations keep real time. GSAP's own time scale is left alone,
 * because changing it moves the clock it's fed and every tween in flight would jump to its end. Timed in real time,
 * so the slowdown can't slow itself. A second hit-stop during one extends it to whichever ends later. One is made by
 * the composition root and handed to every effect that stops the clock.
 */
export class HitStop {
  private speed = 1;
  private resume = 0;
  private endsAt = 0;

  /** How fast the animations' clock runs now: 1 is real time. */
  get rate(): number {
    return this.speed;
  }

  /** Holds the clock for `seconds` (real time) at `scale` of its speed. */
  hold(seconds: number, scale: number = SPECIAL_FX.hitStop.scale): void {
    const now = performance.now();
    const endsAt = Math.max(this.endsAt, now + seconds * 1000);
    this.speed = scale;
    window.clearTimeout(this.resume);
    this.endsAt = endsAt;
    this.resume = window.setTimeout(() => {
      this.speed = 1;
      this.endsAt = 0;
    }, endsAt - now);
  }
}
