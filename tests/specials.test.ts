import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { Board } from '../src/model/Board';
import { groupMatches } from '../src/model/groups';
import { findMatches, trySwap } from '../src/model/rules';
import { specialFor } from '../src/model/specials';
import type { Special } from '../src/model/types';

const SPEC = { cols: 6, rows: 6, kinds: 5 };

/**
 * A board from rows of characters: a digit is a koi of that kind; a letter is a special on a koi of kind 4: 'h' a
 * striped koi along its row, 'v' along its column, 'w' a whirlpool, 'r' a rainbow koi.
 */
function boardFrom(rows: string[]): Board {
  const board = new Board(rows[0]?.length ?? 0, rows.length);
  const specials: Record<string, Special> = {
    h: { type: 'line', along: 'row' },
    v: { type: 'line', along: 'col' },
    w: { type: 'whirl' },
    r: { type: 'rainbow' },
  };
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const special = specials[line.charAt(col)];
      const piece = board.createPiece(special ? 4 : Number(line.charAt(col)));
      board.set({ col, row }, special ? { ...piece, special } : piece);
    }
  });
  return board;
}

describe('specialFor', () => {
  const shape = (rows: string[]): Special | null => {
    const [group] = groupMatches(findMatches(boardFrom(rows)));
    return group ? specialFor(group) : null;
  };

  it('a 4 makes a striped koi along its run, an L a whirlpool, a 5 a rainbow koi, a 3 nothing', () => {
    expect(shape(['1111', '2323', '3232'])).toEqual({ type: 'line', along: 'row' });
    expect(shape(['123', '123', '123', '123'])).toEqual({ type: 'line', along: 'col' });
    expect(shape(['1230', '1320', '1112'])).toEqual({ type: 'whirl' });
    expect(shape(['11111', '23232'])).toEqual({ type: 'rainbow' });
    expect(shape(['111', '232'])).toBeNull();
  });
});

describe('specials in a cascade', () => {
  it('a matched 4 leaves a striped koi where the player swapped, and clears the other three', () => {
    // shifted diagonals: no ready-made matches; swapping (2, 1) up makes 1111 along row 0
    const board = boardFrom(['110134', '231402', '234012', '340123', '401234', '012340']);
    const result = trySwap(board, { col: 2, row: 1 }, { col: 2, row: 0 }, SPEC, new Random(1));
    if (!result.valid) throw new Error('refused');
    const [first] = result.steps;
    expect(first?.created).toHaveLength(1);
    expect(first?.created[0]?.at).toEqual({ col: 2, row: 0 });
    expect(first?.created[0]?.piece.special).toEqual({ type: 'line', along: 'row' });
    expect(first?.cleared).toHaveLength(3);
  });

  it('a swapped striped koi fires on its own and sweeps its row', () => {
    const board = boardFrom(['232323', '32h232', '232323', '323232', '232323', '323232']);
    const result = trySwap(board, { col: 2, row: 1 }, { col: 2, row: 2 }, SPEC, new Random(1));
    if (!result.valid) throw new Error('refused');
    const [first] = result.steps;
    expect(first?.fired).toHaveLength(1);
    const swept = first?.cleared.filter((c) => c.blast === 0).map((c) => c.at.row);
    expect(new Set(swept)).toEqual(new Set([2])); // it moved to row 2 and swept it
    expect(swept).toHaveLength(5);
  });

  it('a whirlpool drains the eight round it, and leaves a special outside them', () => {
    const board = boardFrom(['232323', '3w2v23', '232323', '323232', '232323', '323232']);
    const result = trySwap(board, { col: 1, row: 1 }, { col: 1, row: 2 }, SPEC, new Random(1));
    if (!result.valid) throw new Error('refused');
    const [first] = result.steps;
    expect(first?.fired.map((f) => f.piece.special?.type)).toEqual(['whirl']);
    expect(first?.fired[0]?.reach).toHaveLength(8);
    // the whirlpool moved to (1, 2); the striped koi at (3, 1) is out of its reach, so it stays
    expect(first?.cleared.some((c) => c.at.col === 3 && c.at.row === 1)).toBe(false);
  });

  it('a rainbow koi swapped with a koi takes every koi of that colour, nearest first', () => {
    const board = boardFrom(['012340', '1r3401', '234012', '340123', '401234', '012340']);
    const result = trySwap(board, { col: 1, row: 1 }, { col: 2, row: 1 }, SPEC, new Random(1));
    if (!result.valid) throw new Error('refused');
    const [first] = result.steps;
    const blast = first?.fired[0];
    expect(blast?.target).toBe(3);
    const taken = first?.cleared.filter((c) => c.blast === 0) ?? [];
    expect(taken.length).toBeGreaterThan(5);
    expect(taken.every((c) => c.piece.kind === 3)).toBe(true);
    const from = blast?.at ?? { col: 0, row: 0 };
    const distances = taken.map((c) => (c.at.col - from.col) ** 2 + (c.at.row - from.row) ** 2);
    expect(distances).toEqual([...distances].sort((a, b) => a - b)); // nearest first
  });

  it('never strands a cell: after any cascade every open cell has a piece', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const board = boardFrom(['2h2323', '3w3232', '2r2323', '3v3232', '232323', '323232']);
      const result = trySwap(board, { col: 1, row: 2 }, { col: 2, row: 2 }, SPEC, new Random(seed));
      if (!result.valid) throw new Error('refused');
      for (const cell of board.cells()) expect(board.get(cell)).not.toBeNull();
    }
  });
});
