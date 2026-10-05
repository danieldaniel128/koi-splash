/** Waits for a moment the browser can spare, then runs `next`. */
export type IdleWait = (next: () => void) => void;

/** How long a job may wait for an idle moment before it runs anyway (ms), so a busy page still gets its turn. */
const LONGEST_WAIT_MS = 500;

/**
 * The first idle moment after the next frame (requestIdleCallback), or, where there's no such thing (Safari), just
 * after the next frame is painted. A frame in between gives the GPU its turn to draw what the last job painted.
 */
export function nextIdleMoment(next: () => void): void {
  requestAnimationFrame(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(next, { timeout: LONGEST_WAIT_MS });
    else setTimeout(next, 0);
  });
}

/**
 * Runs small jobs in the background, in order, one per idle moment, so none of them holds up a frame for long.
 * A job that fails is reported and skipped, and the rest go on: the work is only ever done ahead of need. Resolves
 * once every job has had its turn; it never rejects.
 */
export function runWhenIdle(jobs: readonly (() => void)[], wait: IdleWait = nextIdleMoment): Promise<void> {
  return new Promise((resolve) => {
    let next = 0;
    const runOne = (): void => {
      const job = jobs[next++];
      if (!job) {
        resolve();
        return;
      }
      try {
        job();
      } catch (error) {
        console.error(error);
      }
      wait(runOne);
    };
    wait(runOne);
  });
}
