import { describe, expect, it } from 'vitest';
import { seeded } from '../src/core/Random';
import type { Board } from '../src/model/Board';
import { findMatches, findMove, hasAnyMove, settle, trySwap } from '../src/model/rules';
import type { BoardSpec } from '../src/model/types';
import { boardFrom, drawBoard, makeSpecial } from './support/boards';

const SPEC: BoardSpec = { cols: 6, rows: 4, colorCount: 5 };

/** No match, and no swap that makes one: every color sits two cells from its nearest twin, with no third in reach. */
const STUCK = ['012301', '230123', '012301', '230123'];

/** Each cell's piece, so a check can tell the very same koi from a new one of the same color. */
const piecesOf = (board: Board): unknown[] => [...board.cells()].map((cell) => board.get(cell));

describe('a stuck board', () => {
  it('is stuck: no match and no move, so the tests below start where they mean to', () => {
    const board = boardFrom(STUCK);
    expect(findMatches(board)).toEqual([]);
    expect(findMove(board)).toBeNull();
    expect(hasAnyMove(board)).toBe(false);
  });

  it('is dealt again when it settles: full, with no ready-made match and at least one move', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const board = boardFrom(STUCK);
      const { rounds, reshuffled } = settle(board, SPEC, seeded(seed));
      expect(reshuffled).toBe(true);
      expect(rounds).toEqual([]);
      for (const cell of board.cells()) expect(board.get(cell)).not.toBeNull();
      expect(findMatches(board)).toEqual([]);
      expect(findMove(board)).not.toBeNull();
    }
  });

  it('is dealt again around its lily pads: the pads stay empty, every other cell is filled', () => {
    const pads = [
      { col: 1, row: 1 },
      { col: 4, row: 2 },
    ];
    for (let seed = 1; seed <= 50; seed++) {
      const board = boardFrom(['012301', '2*0123', '0123*1', '230123']);
      expect(settle(board, SPEC, seeded(seed)).reshuffled).toBe(true);
      for (const cell of board.cells()) {
        const isPad = pads.some((pad) => pad.col === cell.col && pad.row === cell.row);
        expect(board.get(cell) === null).toBe(isPad);
      }
      expect(findMatches(board)).toEqual([]);
      expect(findMove(board)).not.toBeNull();
    }
  });

  it('is not dealt again while it holds a special: swapping the special is a move', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, { col: 2, row: 1 }, { type: 'whirlpool' });
    expect(findMove(board)).toBeNull();
    expect(hasAnyMove(board)).toBe(true);
    const before = piecesOf(board);
    expect(settle(board, SPEC, seeded(1)).reshuffled).toBe(false);
    expect(piecesOf(board)).toEqual(before);
  });
});

describe('trySwap refusing a swap', () => {
  it("refuses two koi side by side that make no match, with 'no-match', and moves nothing", () => {
    const board = boardFrom(STUCK);
    const before = piecesOf(board);
    for (const [a, b] of [
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      [
        { col: 3, row: 2 },
        { col: 3, row: 3 },
      ],
    ] as const) {
      expect(trySwap(board, a, b, SPEC, seeded(1))).toEqual({ valid: false, reason: 'no-match' });
      expect(piecesOf(board)).toEqual(before);
    }
  });

  it('takes a swap with a special beside a koi, though it makes no match', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, { col: 2, row: 1 }, { type: 'striped', along: 'row' });
    const result = trySwap(board, { col: 2, row: 1 }, { col: 2, row: 2 }, SPEC, seeded(1));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.rounds[0]?.matches).toEqual([]);
  });
});

describe('the cascade cap', () => {
  it('stops a cascade that would never settle, instead of hanging the game', () => {
    // one koi colour: every new koi matches the ones beside it, round after round
    const oneColour: BoardSpec = { cols: 4, rows: 3, colorCount: 1 };
    const board = boardFrom(['0000', '0000', '0000']);
    expect(() => settle(board, oneColour, seeded(1))).toThrow('cascade did not settle');
  });

  it('lets a board that matches everywhere settle, however many rounds its new koi chain', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const board = boardFrom(['000111', '222333', '000111', '222333']);
      const { rounds } = settle(board, { ...SPEC, colorCount: 4 }, seeded(seed));
      expect(rounds.length).toBeGreaterThan(0);
      expect(findMatches(board)).toEqual([]);
      expect(drawBoard(board).join('')).not.toContain('-');
    }
  });
});
