import { gsap } from 'gsap';
import { SPECIAL_FX } from '../config/specials';

/**
 * Hit-stop: the animations' clock slows to a crawl for an instant (`scale` of real speed), so a hit lands. It slows
 * only GSAP's clock: the water, the koi's swimming, the sound and the HTML UI's own animations keep real time. Timed
 * in real time, so the slowdown can't slow itself. A second hit-stop during one extends it to whichever ends later.
 * One is made by the composition root and handed to every effect that stops the clock.
 */
export class HitStop {
  private resume = 0;
  private endsAt = 0;

  /** Holds the clock for `seconds` (real time) at `scale` of its speed. */
  hold(seconds: number, scale: number = SPECIAL_FX.hitStop.scale): void {
    const now = performance.now();
    const endsAt = Math.max(this.endsAt, now + seconds * 1000);
    gsap.globalTimeline.timeScale(scale);
    window.clearTimeout(this.resume);
    this.endsAt = endsAt;
    this.resume = window.setTimeout(() => {
      gsap.globalTimeline.timeScale(1);
      this.endsAt = 0;
    }, endsAt - now);
  }
}
