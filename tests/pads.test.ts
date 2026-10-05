import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { Board } from '../src/model/Board';
import { PadField } from '../src/model/pads';
import type { Pad } from '../src/model/types';
import { createBoard, findMove, trySwap } from '../src/model/rules';

const SPEC = { cols: 7, rows: 9, kinds: 5 };

/** A bud on cell col,row: matches in the four cells next to it hit it. */
function bud(id: number, col: number, row: number, hits = 2): Pad {
  return { id, at: { col, row }, kind: 'bud', hitsLeft: hits, hitsNeeded: hits };
}

describe('PadField', () => {
  it('opens a bud on the first hit and blooms it on the second', () => {
    const field = new PadField([bud(1, 3, 3)]);
    expect(field.hit([{ col: 3, row: 2 }]).map((e) => e.type)).toEqual(['hit']);
    expect(field.hit([{ col: 4, row: 3 }]).map((e) => e.type)).toEqual(['bloom']);
    expect(field.pads).toEqual([]);
  });

  it('ignores clears that are not right next to it', () => {
    const field = new PadField([bud(1, 3, 3)]);
    expect(
      field.hit([
        { col: 4, row: 4 },
        { col: 5, row: 3 },
      ]),
    ).toEqual([]);
  });

  it('takes one hit per round however many neighbours clear', () => {
    const field = new PadField([bud(1, 3, 3)]);
    field.hit([
      { col: 2, row: 3 },
      { col: 4, row: 3 },
      { col: 3, row: 4 },
    ]);
    expect(field.pads[0]?.hitsLeft).toBe(1);
  });

  it('respects a configured number of hits', () => {
    const field = new PadField([bud(1, 1, 1, 15)]);
    for (let i = 0; i < 14; i++) field.hit([{ col: 1, row: 0 }]);
    expect(field.hit([{ col: 1, row: 0 }]).map((e) => e.type)).toEqual(['bloom']);
  });

  it('scatters the configured pads at least `spacing` cells apart', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const field = PadField.scatter(
        { buds: 3, emptyPads: 2, hitsToBloom: 2, hitsToDrift: 1, spacing: 2 },
        SPEC,
        new Random(seed),
      );
      const pads = field.pads;
      expect(pads.filter((p) => p.kind === 'bud')).toHaveLength(3);
      for (const a of pads) {
        for (const b of pads) {
          if (a !== b)
            expect(
              Math.max(Math.abs(a.at.col - b.at.col), Math.abs(a.at.row - b.at.row)),
            ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('is hit by a match that makes its special on the cell beside it', () => {
    // swapping (2, 2) up makes 1111 in row 1; its striped koi forms at (2, 1), the only cell of it next to the bud
    const rows = ['02.340', '113102', '231423', '340234', '402340', '023401'];
    const field = new PadField([bud(1, 2, 0)]);
    const board = new Board(6, 6);
    board.setBlocked({ col: 2, row: 0 }, true);
    rows.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        const mark = line.charAt(col);
        if (mark !== '.') board.set({ col, row }, board.createPiece(Number(mark)));
      }
    });
    const spec = { cols: 6, rows: 6, kinds: 5 };
    const result = trySwap(board, { col: 2, row: 2 }, { col: 2, row: 1 }, spec, new Random(1), field);
    if (!result.valid) throw new Error('refused');
    const [first] = result.steps;
    expect(first?.created.map((made) => made.at)).toEqual([{ col: 2, row: 1 }]);
    expect(first?.padEvents.map((event) => event.type)).toEqual(['hit']);
  });

  it('frees a bloomed pad cell and fills it in the same cascade round', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new Random(seed);
      const field = new PadField([bud(1, 3, 4, 1)]);
      const board = createBoard(SPEC, rng, field.cells);
      const move = findMove(board);
      if (!move) continue;
      const result = trySwap(board, move[0], move[1], SPEC, rng, field);
      if (!result.valid || !result.steps.some((s) => s.padEvents.some((e) => e.type === 'bloom'))) continue;
      expect(board.isBlocked({ col: 3, row: 4 })).toBe(false);
      expect(board.get({ col: 3, row: 4 })).not.toBeNull();
      return;
    }
    throw new Error('no seed bloomed the bud');
  });
});
