import { gsap } from 'gsap';

/**
 * Plays an animation and resolves when it ends: when it completes, and also when it's killed or cleared before that,
 * so a turn that awaits it can never hang on a motion something else stopped. (A GSAP animation's own `then` only
 * resolves on completion.) Any onComplete or onInterrupt it already had still runs.
 */
export function play(animation: gsap.core.Animation): Promise<void> {
  return new Promise((resolve) => {
    for (const type of ['onComplete', 'onInterrupt'] as const) {
      const own = animation.eventCallback(type) as (() => void) | null;
      animation.eventCallback(type, () => {
        own?.call(animation);
        resolve();
      });
    }
  });
}

/** Waits `seconds` on the animations' clock (so a hit-stop holds it too). */
export function wait(seconds: number): Promise<void> {
  return play(gsap.delayedCall(seconds, () => undefined));
}
