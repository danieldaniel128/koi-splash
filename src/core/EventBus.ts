/** A listener per event, each for its own payload: what a listener map (a sound per event, say) is typed as. */
export type EventHandlers<Events extends object> = {
  readonly [K in keyof Events]?: (payload: Events[K]) => void;
};

/**
 * A typed event bus (Observer): who makes something happen emits it, who cares about it listens, and neither knows the
 * other. `Events` maps each event's name to its payload (undefined: no payload). Listeners run in the order they were
 * added; a listener that throws doesn't stop the others, and its failure is logged once, so it can't flood the console.
 */
export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>();
  private readonly failed = new WeakSet<(payload: never) => void>();

  /** Starts listening to an event. Returns a function that stops it. */
  on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
    };
  }

  /** Starts listening to every event in the map, each with its own listener. Returns a function that stops them all. */
  onEach(handlers: EventHandlers<Events>): () => void {
    const stops = (Object.keys(handlers) as (keyof Events)[]).map((type) => this.onIf(type, handlers[type]));
    return () => {
      for (const stop of stops) stop();
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
        this.report(listener, type, error);
      }
    }
  }

  private onIf<K extends keyof Events>(type: K, handler: EventHandlers<Events>[K]): () => void {
    return handler ? this.on(type, handler) : () => undefined;
  }

  private report(listener: (payload: never) => void, type: keyof Events, error: unknown): void {
    if (this.failed.has(listener)) return;
    this.failed.add(listener);
    console.error(`a listener of ${String(type)} failed (logged once)`, error);
  }
}
