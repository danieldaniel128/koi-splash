import { describe, expect, it } from 'vitest';
import type { Board } from '../src/model/Board';
import { applyBooster, canTarget } from '../src/model/boosters';
import type { BoosterType } from '../src/model/boosters';
import { findMatches } from '../src/model/rules';
import type { Cell } from '../src/model/types';
import { boardFrom, drawBoard, makeSpecial } from './support/boards';

// shifted diagonals: no matches, every color spread out
const ROWS = ['012340', '123401', '234012', '340123', '401234', '012340'];
const TYPES: readonly BoosterType[] = ['swap', 'special', 'feed'];

const cell = (col: number, row: number): Cell => ({ col, row });
const idsOf = (board: Board): number[] =>
  [...board.cells()].flatMap((c) => board.get(c)?.id ?? []).sort((a, b) => a - b);

describe('canTarget', () => {
  it('turns every booster away from a lily pad and the bank', () => {
    const board = boardFrom(['.012', '1*20', '2012']);
    for (const type of TYPES) {
      expect(canTarget(board, type, cell(0, 0))).toBe(false);
      expect(canTarget(board, type, cell(1, 1))).toBe(false);
    }
  });

  it('lets the swap take a special, but not the special booster or the feed a rainbow koi', () => {
    const board = boardFrom(ROWS);
    makeSpecial(board, cell(2, 2), { type: 'rainbow' });
    expect(canTarget(board, 'swap', cell(2, 2))).toBe(true);
    expect(canTarget(board, 'special', cell(2, 2))).toBe(false);
    expect(canTarget(board, 'feed', cell(2, 2))).toBe(false); // it has no colour to feed
  });
});

describe('applyBooster with nothing to do', () => {
  it('does nothing for a swap of a koi with itself, or with a pad', () => {
    const board = boardFrom(['012', '1*0']);
    const before = drawBoard(board);
    expect(applyBooster(board, { type: 'swap', a: cell(0, 0), b: cell(0, 0) })).toBeNull();
    expect(applyBooster(board, { type: 'swap', a: cell(0, 1), b: cell(1, 1) })).toBeNull();
    expect(drawBoard(board)).toEqual(before);
  });

  it('does nothing when the special booster is used on a special, and keeps that special', () => {
    const board = boardFrom(ROWS);
    const whirl = makeSpecial(board, cell(1, 1), { type: 'whirl' });
    const use = { type: 'special', at: cell(1, 1), special: { type: 'rainbow' } } as const;
    expect(applyBooster(board, use)).toBeNull();
    expect(board.get(cell(1, 1))).toBe(whirl);
  });

  it('does nothing when the colour fed has fewer than three koi', () => {
    const board = boardFrom(['012', '120', '201', '345']);
    const before = drawBoard(board);
    expect(applyBooster(board, { type: 'feed', at: cell(0, 3), lines: 2 })).toBeNull();
    expect(drawBoard(board)).toEqual(before);
  });
});

describe('the feed', () => {
  it('makes no more lines than the colour has koi for, and leaves the koi over where they were', () => {
    // five 0s: enough for one line of 3, not the two asked for
    const board = boardFrom(['012341', '123012', '234120', '301234', '412303']);
    const zeros = [...board.cells()].filter((c) => board.colorAt(c) === 0);
    const where = new Map(zeros.map((c) => [board.get(c)?.id, c]));
    const change = applyBooster(board, { type: 'feed', at: cell(0, 0), lines: 2 });
    expect(change?.fedColor).toBe(0);
    const lines = findMatches(board).filter((m) => m.color === 0);
    expect(lines).toHaveLength(1);
    const inLine = (c: Cell): boolean =>
      lines[0]?.cells.some((l) => l.col === c.col && l.row === c.row) ?? false;
    const leftOver = [...board.cells()].filter((c) => board.colorAt(c) === 0 && !inLine(c));
    expect(leftOver).toHaveLength(zeros.length - 3);
    for (const c of leftOver) expect(where.get(board.get(c)?.id)).toEqual(c);
  });

  it('keeps every koi, moves none onto a pad, and reports each move from where the koi was to where it is', () => {
    const board = boardFrom(['012340', '12*401', '234012', '340*23', '401234', '012340']);
    const ids = idsOf(board);
    const before = new Map([...board.cells()].map((c) => [board.get(c)?.id, c]));
    const change = applyBooster(board, { type: 'feed', at: cell(2, 2), lines: 2 });
    expect(idsOf(board)).toEqual(ids);
    expect(board.get(cell(2, 1))).toBeNull();
    expect(board.get(cell(3, 3))).toBeNull();
    for (const move of change?.moved ?? []) {
      expect(before.get(move.piece.id)).toEqual(move.from);
      expect(board.get(move.to)).toBe(move.piece);
    }
  });

  it('lays its lines a cell apart, so each is a school of its own', () => {
    const board = boardFrom(ROWS);
    applyBooster(board, { type: 'feed', at: cell(2, 2), lines: 2 });
    const lines = findMatches(board).filter((m) => m.color === 4);
    expect(lines).toHaveLength(2);
    const [first, second] = lines;
    for (const a of first?.cells ?? [])
      for (const b of second?.cells ?? [])
        expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBeGreaterThan(1);
  });
});
