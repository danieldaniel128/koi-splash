import type { CascadeStep, Cell, Fired } from '../model/types';
import { cellKey, stepsApart } from '../model/types';

/** How long a special's parts take (s), after the prototype (see TIMING.specials). */
export interface SpecialTiming {
  /** A shape's koi spiral into the special they make. */
  readonly merge: number;
  /** A striped koi's sweep reaches one more cell every this long. */
  readonly sweep: number;
  /** A whirlpool spins up, then sucks its neighbours down over `whirlPull`; its corners a little later. */
  readonly whirlSpin: number;
  readonly whirlPull: number;
  readonly whirlCorner: number;
  /** A rainbow koi rises, then its beams leave one every `rainbowStep` and take `rainbowTravel` to land. */
  readonly rainbowRise: number;
  readonly rainbowStep: number;
  readonly rainbowTravel: number;
  /** A special caught in a blast fires this long after the blast reaches it. */
  readonly chain: number;
  /** A koi's dive, once it goes. */
  readonly dive: number;
}

/** How a koi leaves the board this round: when (s from the round's start), and how it goes. */
export interface ClearPlan {
  readonly delay: number;
  /** How long it takes to go, once it starts. */
  readonly lasts: number;
  readonly how: 'dive' | 'merge' | 'drain' | 'zap' | 'fire';
  /** Where it goes: the special it merges into, the whirlpool that drains it. */
  readonly toward?: Cell;
}

/** When each special fires this round (s from the round's start). */
export interface BlastPlan {
  readonly fired: Fired;
  readonly at: number;
}

export interface RoundPlan {
  /** Per piece id. */
  readonly clears: ReadonlyMap<number, ClearPlan>;
  readonly blasts: readonly BlastPlan[];
  /** When the last koi has gone, so the koi above can start swimming down. */
  readonly end: number;
}

/**
 * Times one cascade round from the model's data: matched koi go at once (the ones whose shape made a special spiral
 * into it), each special fires when it was matched or swapped (at once) or when another's blast reached it, and each
 * blast takes its cells in its own rhythm. Pure: the animator plays it, the tests check it. O(cleared + fired).
 */
export function planRound(step: CascadeStep, timing: SpecialTiming): RoundPlan {
  const clears = new Map<number, ClearPlan>();
  const blasts: BlastPlan[] = [];
  const mergeInto = new Map<string, Cell>();
  for (const made of step.created) for (const cell of made.from) mergeInto.set(cellKey(cell), made.at);

  for (const cleared of step.cleared) {
    if (cleared.blast !== undefined) continue;
    const into = mergeInto.get(cellKey(cleared.at));
    clears.set(
      cleared.piece.id,
      into
        ? { delay: 0, lasts: timing.merge, how: 'merge', toward: into }
        : { delay: 0, lasts: timing.dive, how: 'dive' },
    );
  }
  step.fired.forEach((fired, index) => {
    // matched or swapped: it fires at once; caught by an earlier blast: a beat after that blast reaches it
    const caught = clears.get(fired.piece.id)?.delay ?? 0;
    const start = caught > 0 ? caught + timing.chain : 0;
    const reach = step.cleared.filter((cleared) => cleared.blast === index);
    blasts.push({ fired, at: start });
    clears.set(fired.piece.id, { delay: start, lasts: firing(fired, reach.length, timing), how: 'fire' });
    for (const cleared of reach) {
      clears.set(cleared.piece.id, reachedBy(fired, start, cleared.at, cleared.order ?? 0, timing));
    }
  });
  let end = 0;
  for (const plan of clears.values()) end = Math.max(end, plan.delay + plan.lasts);
  return { clears, blasts, end };
}

/**
 * When a round's blast (its index in the round's fired) lands: when it takes its first koi, or when it fires if it
 * takes none. Its points show then. Pure. O(cleared).
 */
export function blastLands(step: CascadeStep, plan: RoundPlan, blast: number): number {
  let lands = Infinity;
  for (const cleared of step.cleared) {
    if (cleared.blast !== blast) continue;
    lands = Math.min(lands, plan.clears.get(cleared.piece.id)?.delay ?? Infinity);
  }
  return Number.isFinite(lands) ? lands : (plan.blasts[blast]?.at ?? 0);
}

/** When and how a blast's cell is taken: swept in turn, drained into the eddy, or zapped by a prism beam. */
function reachedBy(fired: Fired, start: number, at: Cell, order: number, timing: SpecialTiming): ClearPlan {
  const type = fired.piece.special?.type;
  if (type === 'whirl') {
    const corner = at.col !== fired.at.col && at.row !== fired.at.row;
    const delay = start + timing.whirlSpin + (corner ? timing.whirlCorner : 0);
    return { delay, lasts: timing.whirlPull, how: 'drain', toward: fired.at };
  }
  if (type === 'rainbow') {
    const delay = start + timing.rainbowRise + order * timing.rainbowStep + timing.rainbowTravel;
    return { delay, lasts: timing.dive, how: 'zap' };
  }
  const distance = stepsApart(at, fired.at);
  return { delay: start + distance * timing.sweep, lasts: timing.dive, how: 'dive' };
}

/** How long a firing special stays: until its whirlpool has drained, or its last beam has landed. */
function firing(fired: Fired, reached: number, timing: SpecialTiming): number {
  const type = fired.piece.special?.type;
  if (type === 'whirl') return timing.whirlSpin + timing.whirlCorner + timing.whirlPull;
  if (type === 'rainbow') {
    return timing.rainbowRise + Math.max(0, reached - 1) * timing.rainbowStep + timing.rainbowTravel;
  }
  return timing.dive;
}
