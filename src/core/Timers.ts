/**
 * Timeouts kept together, so their owner can cancel every one still waiting at once (an end card closed before its
 * stars have landed). Times are in seconds.
 */
export class Timers {
  private readonly waiting = new Set<ReturnType<typeof setTimeout>>();

  /** Runs `then` after `seconds`, unless cancelled first. */
  after(seconds: number, then: () => void): void {
    const id = setTimeout(() => {
      this.waiting.delete(id);
      then();
    }, seconds * 1000);
    this.waiting.add(id);
  }

  /** Cancels every timeout still waiting. */
  cancelAll(): void {
    for (const id of this.waiting) clearTimeout(id);
    this.waiting.clear();
  }
}
