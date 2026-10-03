/** Motion timings in seconds. These are the main feel dials. */
export const TIMING = {
  /** Two koi slide past each other. */
  swap: 0.16,
  /** A swap that makes no match: slide part of the way, then back. */
  invalidSwap: 0.32,
  /** How far the koi travel toward each other before bouncing back, as a share of a cell. */
  invalidReach: 0.4,
  /** Matched koi shrink and fade. */
  clear: 0.26,
  /** Falling starts at this share of the clear, so there is no dead pause between them. */
  fallStartAt: 0.7,
  /** Fall acceleration in cells per second squared: longer drops take longer, like real gravity. */
  gravity: 40,
  /** Height and duration of the small hop when a koi lands. */
  landBounce: 4,
  landBounceTime: 0.08,
  /** Delay between new koi entering the same column, top-most last. */
  spawnStagger: 0.05,
} as const;
