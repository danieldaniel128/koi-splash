import { describe, expect, it } from 'vitest';
import type { CascadeStep, Piece, Special } from '../src/model/types';
import { blastLands, planRound } from '../src/view/specialTiming';

const TIMING = {
  merge: 0.36,
  sweep: 0.03,
  whirlSpin: 0.32,
  whirlPull: 0.34,
  whirlCorner: 0.03,
  rainbowRise: 0.3,
  rainbowStep: 0.05,
  rainbowTravel: 0.14,
  chain: 0.1,
  dive: 0.32,
};
let nextId = 1;
const koi = (special?: Special): Piece => ({ id: nextId++, kind: 0, ...(special ? { special } : {}) });
const step = (over: Partial<CascadeStep>): CascadeStep => ({
  matches: [],
  created: [],
  fired: [],
  cleared: [],
  padEvents: [],
  falls: [],
  spawns: [],
  ...over,
});

describe('planRound', () => {
  it('a shape that makes a special spirals into it; other matched koi just dive', () => {
    const merging = koi();
    const plain = koi();
    const plan = planRound(
      step({
        created: [{ piece: koi({ type: 'whirl' }), at: { col: 2, row: 2 }, from: [{ col: 3, row: 2 }] }],
        cleared: [
          { piece: merging, at: { col: 3, row: 2 } },
          { piece: plain, at: { col: 6, row: 6 } },
        ],
      }),
      TIMING,
    );
    expect(plan.clears.get(merging.id)).toMatchObject({ how: 'merge', toward: { col: 2, row: 2 } });
    expect(plan.clears.get(plain.id)).toMatchObject({ how: 'dive', delay: 0 });
  });

  it('a striped sweep takes its cells in turn, outward', () => {
    const striped = koi({ type: 'line', along: 'row' });
    const near = koi();
    const far = koi();
    const plan = planRound(
      step({
        fired: [{ piece: striped, at: { col: 3, row: 1 }, reach: [] }],
        cleared: [
          { piece: striped, at: { col: 3, row: 1 } },
          { piece: near, at: { col: 4, row: 1 }, blast: 0, order: 0 },
          { piece: far, at: { col: 6, row: 1 }, blast: 0, order: 1 },
        ],
      }),
      TIMING,
    );
    expect(plan.clears.get(near.id)?.delay).toBeCloseTo(0.03);
    expect(plan.clears.get(far.id)?.delay).toBeCloseTo(0.09);
  });

  it('a special caught in a blast fires a beat after the blast reaches it, and the round waits for it', () => {
    const striped = koi({ type: 'line', along: 'row' });
    const whirl = koi({ type: 'whirl' });
    const drained = koi();
    const plan = planRound(
      step({
        fired: [
          { piece: striped, at: { col: 0, row: 1 }, reach: [] },
          { piece: whirl, at: { col: 4, row: 1 }, reach: [] },
        ],
        cleared: [
          { piece: striped, at: { col: 0, row: 1 } },
          { piece: whirl, at: { col: 4, row: 1 }, blast: 0, order: 3 },
          { piece: drained, at: { col: 5, row: 2 }, blast: 1, order: 0 },
        ],
      }),
      TIMING,
    );
    const whirlFires = 4 * 0.03 + 0.1;
    expect(plan.blasts[1]?.at).toBeCloseTo(whirlFires);
    expect(plan.clears.get(drained.id)).toMatchObject({ how: 'drain', toward: { col: 4, row: 1 } });
    expect(plan.clears.get(drained.id)?.delay).toBeCloseTo(whirlFires + 0.32 + 0.03); // a corner
    expect(plan.end).toBeCloseTo(whirlFires + 0.32 + 0.03 + 0.34);
  });
});

describe('blastLands', () => {
  it('is when the blast takes its first koi, so its points show as it lands', () => {
    const whirl = koi({ type: 'whirl' });
    const round = step({
      fired: [{ piece: whirl, at: { col: 3, row: 3 }, reach: [] }],
      cleared: [
        { piece: whirl, at: { col: 3, row: 3 } },
        { piece: koi(), at: { col: 4, row: 3 }, blast: 0, order: 0 },
        { piece: koi(), at: { col: 4, row: 4 }, blast: 0, order: 1 },
      ],
    });
    expect(blastLands(round, planRound(round, TIMING), 0)).toBeCloseTo(TIMING.whirlSpin);
  });

  it('is when it fires, for a blast that takes nothing', () => {
    const striped = koi({ type: 'line', along: 'row' });
    const round = step({
      fired: [{ piece: striped, at: { col: 0, row: 0 }, reach: [] }],
      cleared: [{ piece: striped, at: { col: 0, row: 0 } }],
    });
    expect(blastLands(round, planRound(round, TIMING), 0)).toBe(0);
  });
});
