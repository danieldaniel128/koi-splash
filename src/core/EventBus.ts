/**
 * A typed event bus (Observer): who makes something happen emits it, who cares about it listens, and neither knows the
 * other. `Events` maps each event's name to its payload (undefined: no payload). Listeners run in the order they were
 * added; a listener that throws doesn't stop the others.
 */
export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  /** Starts listening to an event. Returns a function that stops it. */
  on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
    };
  }

  /** Tells every listener of `type`, in order. O(listeners). */
  emit<K extends keyof Events>(type: K, ...payload: Events[K] extends undefined ? [] : [Events[K]]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        (listener as (payload: Events[K] | undefined) => void)(payload[0]);
      } catch (error) {
        console.error(`listener of ${String(type)} failed`, error);
      }
    }
  }
}
