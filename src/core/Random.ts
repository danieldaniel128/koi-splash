/**
 * Where randomness comes from: a float in [0, 1). Everything that rolls dice takes one of these, so play can use a
 * fresh seed while tests and paintings use a fixed one and get the same result every time.
 */
export type RandomSource = () => number;

/**
 * A small seeded random source (mulberry32). The same seed always gives the same sequence, which keeps boards and
 * paintings reproducible in tests and when debugging a level.
 */
export function seeded(seed: number = Date.now()): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max], both inclusive. */
export function int(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** One of the items, each as likely. Throws on an empty list. */
export function pick<T>(random: RandomSource, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}

/**
 * The seed a page's address asks for (`?seed=42`), so a board can be dealt again exactly, or `fallback` when it asks
 * for none or the seed isn't a whole number.
 */
export function seedFromQuery(query: string, fallback: number): number {
  const asked = new URLSearchParams(query).get('seed') ?? '';
  return /^-?\d+$/.test(asked) ? Number(asked) : fallback;
}
