/**
 * Starts async work nobody waits for (a turn started from a swipe, a popup flying off) and logs it if it fails, so a
 * rejected promise is never lost. `onError` puts things back in order after the log.
 */
export function runDetached(work: Promise<unknown>, what: string, onError?: () => void): void {
  work.catch((error: unknown) => {
    console.error(`${what} failed`, error);
    onError?.();
  });
}
