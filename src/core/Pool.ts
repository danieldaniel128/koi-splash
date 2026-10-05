/** How a pool makes, resets and caps its items. */
export interface PoolSpec<T> {
  /** Makes a new item when none is spare. */
  readonly create: () => T;
  /** Readies an item for its next use, as it's handed out again. */
  readonly reset?: (item: T) => void;
  /** At most this many spare items are kept; one released past it is dropped (and `discard` is called). */
  readonly cap: number;
  /** Frees an item the pool won't keep. */
  readonly discard?: (item: T) => void;
}

/**
 * Keeps released items for reuse, for things made and dropped many times a second (popups, sparkles, rings): making
 * one can cost far more than reusing it (a label draws a canvas). Engine-free. Acquire and release are O(1).
 */
export class Pool<T> {
  private readonly spare: T[] = [];

  constructor(private readonly spec: PoolSpec<T>) {}

  /** How many spare items are waiting. */
  get size(): number {
    return this.spare.length;
  }

  /** A spare item, reset, or a new one. */
  acquire(): T {
    const item = this.spare.pop();
    if (item === undefined) return this.spec.create();
    this.spec.reset?.(item);
    return item;
  }

  /** Hands an item back for reuse; past the cap it's discarded instead. */
  release(item: T): void {
    if (this.spare.length < this.spec.cap) this.spare.push(item);
    else this.spec.discard?.(item);
  }
}
