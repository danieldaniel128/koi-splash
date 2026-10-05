import { describe, expect, it } from 'vitest';
import { SCORE } from '../src/config/level';
import { Random } from '../src/core/Random';
import { trySwap } from '../src/model/rules';
import { scoreRound } from '../src/model/score';
import type { CascadeStep, Cell, Cleared, Created, Special } from '../src/model/types';
import { boardFrom } from './support/boards';

const POINTS = SCORE.pointsPerPiece;

const cells = (count: number, row = 0): Cell[] => Array.from({ length: count }, (_, col) => ({ col, row }));

/** A round that cleared `count` koi and made these specials, each from a shape of `size` koi. */
function round(count: number, made: readonly { special: Special; size: number }[] = []): CascadeStep {
  const cleared: Cleared[] = cells(count).map((at, i) => ({ piece: { id: i + 1, kind: 0 }, at }));
  const created: Created[] = made.map(({ special, size }, i) => ({
    piece: { id: 100 + i, kind: 0, special },
    at: { col: 0, row: i + 1 },
    from: cells(size - 1, i + 1), // the rest of the shape swam into the special's cell
  }));
  return { matches: [], created, fired: [], cleared, padEvents: [], falls: [], spawns: [] };
}

describe('scoreRound', () => {
  it('pays for each koi cleared', () => {
    expect(scoreRound(round(3), 0, POINTS)).toBe(3 * POINTS);
    expect(scoreRound(round(0), 0, POINTS)).toBe(0);
  });

  it('multiplies a round by its place in the cascade: the second pays double, the third triple', () => {
    expect(scoreRound(round(4), 1, POINTS)).toBe(2 * 4 * POINTS);
    expect(scoreRound(round(4), 2, POINTS)).toBe(3 * 4 * POINTS);
  });

  it("pays three koi's worth for each koi a special's shape had past three", () => {
    const striped = { special: { type: 'line', along: 'row' }, size: 4 } as const;
    const rainbow = { special: { type: 'rainbow' }, size: 5 } as const;
    const whirl = { special: { type: 'whirl' }, size: 5 } as const;
    expect(scoreRound(round(3, [striped]), 0, POINTS)).toBe((3 + 3) * POINTS);
    expect(scoreRound(round(4, [rainbow]), 0, POINTS)).toBe((4 + 6) * POINTS);
    expect(scoreRound(round(4, [whirl]), 0, POINTS)).toBe((4 + 6) * POINTS);
  });

  it('adds up the bonuses of every special a round made, and multiplies them with the round', () => {
    const striped = { special: { type: 'line', along: 'col' }, size: 4 } as const;
    const rainbow = { special: { type: 'rainbow' }, size: 5 } as const;
    expect(scoreRound(round(7, [striped, rainbow]), 2, POINTS)).toBe(3 * (7 + 3 + 6) * POINTS);
  });

  it('scores a real swap that makes a rainbow koi: the four koi cleared and six for the shape of five', () => {
    // swapping (2, 1) up lines up five 1s along the top row
    const board = boardFrom(['11211', '23123', '34234']);
    const result = trySwap(
      board,
      { col: 2, row: 1 },
      { col: 2, row: 0 },
      { cols: 5, rows: 3, kinds: 5 },
      new Random(1),
    );
    if (!result.valid) throw new Error('refused');
    const first = result.steps[0];
    if (!first) throw new Error('no round');
    expect(first.created.map((c) => c.piece.special)).toEqual([{ type: 'rainbow' }]);
    expect(first.cleared).toHaveLength(4);
    expect(scoreRound(first, 0, POINTS)).toBe((4 + 6) * POINTS);
  });
});
