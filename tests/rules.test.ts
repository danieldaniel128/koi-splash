import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { Board } from '../src/model/Board';
import {
  createBoard,
  findMatches,
  findMove,
  hasAnyMove,
  resetBoard,
  swapMakesMatch,
  trySwap,
} from '../src/model/rules';
import type { BoardSpec } from '../src/model/types';
import { parseShape } from '../src/model/shape';

const SPEC: BoardSpec = { cols: 7, rows: 9, kinds: 5 };

/** Builds a board from rows of digits (each digit is a kind), e.g. ['012', '120']. */
function boardFrom(rows: string[]): Board {
  const first = rows[0] ?? '';
  const board = new Board(first.length, rows.length);
  rows.forEach((line, row) => {
    line.split('').forEach((ch, col) => {
      board.set({ col, row }, board.createPiece(Number(ch)));
    });
  });
  return board;
}

function kindsOf(board: Board): string[] {
  const rows: string[] = [];
  for (let row = 0; row < board.rows; row++) {
    let line = '';
    for (let col = 0; col < board.cols; col++) line += String(board.kindAt({ col, row }) ?? '.');
    rows.push(line);
  }
  return rows;
}

describe('createBoard', () => {
  it('fills every cell, has no ready-made match and has a move', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const board = createBoard(SPEC, new Random(seed));
      for (const cell of board.cells()) expect(board.get(cell)).not.toBeNull();
      expect(findMatches(board)).toEqual([]);
      expect(findMove(board)).not.toBeNull();
    }
  });

  it('is reproducible from a seed', () => {
    expect(kindsOf(createBoard(SPEC, new Random(42)))).toEqual(kindsOf(createBoard(SPEC, new Random(42))));
  });
});

describe('resetBoard', () => {
  it('gives a fresh playable layout with new piece ids', () => {
    const rng = new Random(5);
    const board = createBoard(SPEC, rng);
    const oldIds = new Set([...board.cells()].map((cell) => board.get(cell)?.id));
    resetBoard(board, SPEC, rng);
    expect(findMatches(board)).toEqual([]);
    expect(findMove(board)).not.toBeNull();
    for (const cell of board.cells()) expect(oldIds.has(board.get(cell)?.id)).toBe(false);
  });
});

describe('findMatches', () => {
  it('finds row and column runs of 3 or more', () => {
    const board = boardFrom(['1112', '3243', '3214', '3241']);
    const matches = findMatches(board);
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => [m.direction, m.kind, m.cells.length])).toEqual([
      ['row', 1, 3],
      ['col', 3, 3],
      ['col', 2, 3],
    ]);
  });

  it('reports a T shape as one row and one column match', () => {
    const board = boardFrom(['111', '010', '010']);
    const matches = findMatches(board);
    expect(matches.map((m) => m.direction)).toEqual(['row', 'col']);
  });
});

describe('Board.swap', () => {
  it('trades two pieces, and throws without changing either cell when one cannot take the other', () => {
    const board = boardFrom(['12']);
    const [left, right] = [board.get({ col: 0, row: 0 }), board.get({ col: 1, row: 0 })];
    board.swap({ col: 0, row: 0 }, { col: 1, row: 0 });
    expect(board.get({ col: 0, row: 0 })).toBe(right);
    board.setBlocked({ col: 0, row: 0 }, true);
    expect(() => {
      board.swap({ col: 1, row: 0 }, { col: 0, row: 0 });
    }).toThrow(RangeError);
    expect(board.get({ col: 1, row: 0 })).toBe(left);
  });
});

describe('swapMakesMatch', () => {
  const board = boardFrom(['1121', '2334', '4312']);

  it('accepts a swap that makes a run', () => {
    expect(swapMakesMatch(board, { col: 2, row: 0 }, { col: 3, row: 0 })).toBe(true);
  });

  it('rejects a swap that makes nothing, and diagonal or far swaps', () => {
    expect(swapMakesMatch(board, { col: 0, row: 1 }, { col: 0, row: 2 })).toBe(false);
    expect(swapMakesMatch(board, { col: 0, row: 0 }, { col: 1, row: 1 })).toBe(false);
    expect(swapMakesMatch(board, { col: 0, row: 0 }, { col: 2, row: 0 })).toBe(false);
  });

  it('leaves the board as it was', () => {
    const before = kindsOf(board);
    swapMakesMatch(board, { col: 2, row: 0 }, { col: 3, row: 0 });
    expect(kindsOf(board)).toEqual(before);
  });
});

describe('hasAnyMove', () => {
  it('counts a special as a move only when a koi beside it can be swapped with it', () => {
    // a special between a pad and the bank, with a koi under it on the second board
    const special = (board: Board): void => {
      board.setBlocked({ col: 0, row: 0 }, true);
      board.set({ col: 1, row: 0 }, { ...board.createPiece(1), special: { type: 'whirl' } });
    };
    const boxedIn = new Board(3, 1, [{ col: 2, row: 0 }]);
    special(boxedIn);
    expect(hasAnyMove(boxedIn)).toBe(false);

    const withKoi = new Board(3, 2, [{ col: 2, row: 0 }]);
    special(withKoi);
    withKoi.set({ col: 1, row: 1 }, withKoi.createPiece(2));
    expect(hasAnyMove(withKoi)).toBe(true);
  });
});

describe('trySwap', () => {
  it('refuses an invalid swap and changes nothing', () => {
    const board = createBoard(SPEC, new Random(7));
    const before = kindsOf(board);
    const result = trySwap(board, { col: 0, row: 0 }, { col: 3, row: 3 }, SPEC, new Random(1));
    expect(result).toEqual({ valid: false, reason: 'not-adjacent' });
    expect(kindsOf(board)).toEqual(before);
  });

  it('refuses a swap into a lily pad or the bank, even a special, and changes nothing', () => {
    const board = new Board(3, 1, [{ col: 2, row: 0 }]);
    board.setBlocked({ col: 0, row: 0 }, true); // a pad on the left, the bank on the right
    const special = { ...board.createPiece(1), special: { type: 'whirl' as const } };
    board.set({ col: 1, row: 0 }, special);
    const spec = { cols: 3, rows: 1, kinds: 5 };
    for (const into of [
      { col: 0, row: 0 },
      { col: 2, row: 0 },
    ]) {
      expect(trySwap(board, { col: 1, row: 0 }, into, spec, new Random(1))).toEqual({
        valid: false,
        reason: 'blocked',
      });
      expect(board.get({ col: 1, row: 0 })).toBe(special);
    }
  });

  it('clears, drops and refills until the board settles', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = new Random(seed);
      const board = createBoard(SPEC, rng);
      const move = findMove(board);
      if (!move) throw new Error('createBoard gave a stuck board');

      const result = trySwap(board, move[0], move[1], SPEC, rng);
      if (!result.valid) throw new Error('a found move was refused');

      expect(result.steps.length).toBeGreaterThan(0);
      for (const cell of board.cells()) expect(board.get(cell)).not.toBeNull();
      expect(findMatches(board)).toEqual([]);
      expect(findMove(board)).not.toBeNull();

      for (const step of result.steps) {
        // every cleared cell is refilled: the piece count stays the same
        expect(step.spawns.length).toBe(step.cleared.length);
        for (const fall of step.falls) expect(fall.to.row).toBeGreaterThan(fall.from.row);
        for (const spawn of step.spawns) expect(spawn.order).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('drops the pieces above a cleared run', () => {
    const board = boardFrom(['2342', '1314', '4123']);
    // swap (1,1)<->(1,2): the 1 at (1,2) moves up and makes 1 1 1 in row 1 (cols 0-2)
    const result = trySwap(
      board,
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { cols: 4, rows: 3, kinds: 5 },
      new Random(3),
    );
    if (!result.valid) throw new Error('expected a valid swap');
    const first = result.steps[0];
    expect(first?.cleared.map((c) => c.at)).toEqual([
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ]);
    // the pieces in row 0 above the cleared cells fall one row
    expect(first?.falls.map((f) => [f.from, f.to])).toEqual([
      [
        { col: 0, row: 0 },
        { col: 0, row: 1 },
      ],
      [
        { col: 1, row: 0 },
        { col: 1, row: 1 },
      ],
      [
        { col: 2, row: 0 },
        { col: 2, row: 1 },
      ],
    ]);
  });
});

describe('blocked cells (lily pads)', () => {
  const pads = [
    { col: 2, row: 3 },
    { col: 5, row: 6 },
  ];

  it('places the pads first: no koi on a pad, every other cell filled', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const board = createBoard(SPEC, new Random(seed), pads);
      for (const cell of board.cells()) {
        if (pads.some((p) => p.col === cell.col && p.row === cell.row)) expect(board.get(cell)).toBeNull();
        else expect(board.get(cell)).not.toBeNull();
      }
      expect(findMatches(board)).toEqual([]);
    }
  });

  it('keeps cascades off the pads: koi fall past them and never land on them', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = new Random(seed);
      const board = createBoard(SPEC, rng, pads);
      const move = findMove(board);
      if (!move) throw new Error('no move');
      const result = trySwap(board, move[0], move[1], SPEC, rng);
      if (!result.valid) throw new Error('a found move was refused');
      for (const pad of pads) expect(board.get(pad)).toBeNull();
      for (const step of result.steps) {
        for (const move of [...step.falls, ...step.spawns]) {
          expect(pads.some((p) => p.col === move.to.col && p.row === move.to.row)).toBe(false);
        }
      }
    }
  });
});

describe('a shaped board (holes)', () => {
  // a notch at the top, a bay on the right that splits column 6, the bottom corners cut off
  const shaped: BoardSpec = {
    ...parseShape(['##...##', '#######', '#######', '######.', '######.', '#######', '#######', '.#####.']),
    kinds: 5,
  };
  const holes = shaped.holes ?? [];
  const isHole = (cell: { col: number; row: number }): boolean =>
    holes.some((h) => h.col === cell.col && h.row === cell.row);

  it('fills every cell of the shape and none of the holes', () => {
    const board = createBoard(shaped, new Random(2));
    for (const cell of board.cells()) expect(board.get(cell) === null).toBe(isHole(cell));
  });

  it('never moves a koi across a hole: each falls within its own stretch of water', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = new Random(seed);
      const board = createBoard(shaped, rng);
      const move = findMove(board);
      if (!move) throw new Error('no move');
      const result = trySwap(board, move[0], move[1], shaped, rng);
      if (!result.valid) throw new Error('a found move was refused');
      for (const step of result.steps) {
        for (const fall of step.falls) {
          for (let row = fall.from.row; row <= fall.to.row; row++)
            expect(isHole({ col: fall.to.col, row })).toBe(false);
        }
        for (const spawn of step.spawns) expect(isHole(spawn.to)).toBe(false);
      }
      for (const cell of board.cells()) expect(board.get(cell) === null).toBe(isHole(cell));
    }
  });

  it('does not count a run across a hole as a match', () => {
    const board = new Board(5, 1, [{ col: 2, row: 0 }]);
    for (const col of [0, 1, 3, 4]) board.set({ col, row: 0 }, board.createPiece(1));
    expect(findMatches(board)).toEqual([]);
  });
});
