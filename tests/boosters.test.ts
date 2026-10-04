import { describe, expect, it } from 'vitest';
import { Board } from '../src/model/Board';
import { applyBooster, canTarget } from '../src/model/boosters';
import { findMatches } from '../src/model/rules';

/** A board from rows of digits (each digit is a kind). */
function boardFrom(rows: string[]): Board {
  const board = new Board(rows[0]?.length ?? 0, rows.length);
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++)
      board.set({ col, row }, board.createPiece(Number(line.charAt(col))));
  });
  return board;
}
// shifted diagonals: no matches, every kind spread out
const ROWS = ['012340', '123401', '234012', '340123', '401234', '012340'];

const kindsOf = (board: Board): number[] =>
  [...board.cells()].map((cell) => board.get(cell)?.kind ?? -1).sort();

describe('boosters', () => {
  it('swap trades any two koi, however far apart', () => {
    const board = boardFrom(ROWS);
    const a = board.get({ col: 0, row: 0 });
    const b = board.get({ col: 5, row: 5 });
    const change = applyBooster(board, { type: 'swap', a: { col: 0, row: 0 }, b: { col: 5, row: 5 } });
    expect(change?.moved).toHaveLength(2);
    expect(board.get({ col: 5, row: 5 })).toBe(a);
    expect(board.get({ col: 0, row: 0 })).toBe(b);
  });

  it('special turns a plain koi into the special picked, keeping its id; not one already special', () => {
    const board = boardFrom(ROWS);
    const id = board.get({ col: 2, row: 2 })?.id;
    const change = applyBooster(board, {
      type: 'special',
      at: { col: 2, row: 2 },
      special: { type: 'whirl' },
    });
    expect(change?.made[0]?.piece).toMatchObject({ id, special: { type: 'whirl' } });
    expect(canTarget(board, 'special', { col: 2, row: 2 })).toBe(false);
  });

  it('feed gathers the colour into lines by the food: a match of it, every koi kept, none lost', () => {
    const board = boardFrom(ROWS);
    const before = kindsOf(board);
    const change = applyBooster(board, { type: 'feed', at: { col: 2, row: 2 }, lines: 2 });
    expect(change?.moved.length).toBeGreaterThan(0);
    expect(kindsOf(board)).toEqual(before);
    const matches = findMatches(board).filter((m) => m.kind === 4); // (2, 2) is a 4
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const cell of board.cells()) expect(board.get(cell)).not.toBeNull();
  });

  it('feed needs at least three koi of the colour', () => {
    const board = boardFrom(['012', '120', '201', '345']);
    expect(canTarget(board, 'feed', { col: 0, row: 3 })).toBe(false); // only one 3
    expect(canTarget(board, 'feed', { col: 0, row: 0 })).toBe(true); // three 0s
  });
});
