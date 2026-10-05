/**
 * Small seeded random generator (mulberry32). The same seed always gives the same
 * sequence, which keeps boards reproducible in tests and when debugging a level.
 */
export class Random {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error('pick() from an empty list');
    return item;
  }
}

/**
 * The seed a page's address asks for (`?seed=42`), so a board can be dealt again exactly, or `fallback` when it asks
 * for none or the seed isn't a whole number.
 */
export function seedFromQuery(query: string, fallback: number): number {
  const asked = new URLSearchParams(query).get('seed') ?? '';
  return /^-?\d+$/.test(asked) ? Number(asked) : fallback;
}
