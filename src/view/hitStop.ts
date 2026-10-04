import { gsap } from 'gsap';

/**
 * The animations' clock slows to a crawl for an instant (`scale` of real speed, for `seconds`): a hit lands. Timed in
 * real time, so the slowdown can't slow itself; the water and the koi's swimming keep their own clock. A second
 * hit-stop during one extends it.
 */
export function hitStop(seconds: number, scale = 0.08): void {
  gsap.globalTimeline.timeScale(scale);
  window.clearTimeout(resume);
  resume = window.setTimeout(() => {
    gsap.globalTimeline.timeScale(1);
  }, seconds * 1000);
}

let resume = 0;
