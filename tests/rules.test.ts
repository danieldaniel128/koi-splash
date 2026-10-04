import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { Board } from '../src/model/Board';
import { createBoard, findMatches, findMove, resetBoard, swapMakesMatch, trySwap } from '../src/model/rules';
import type { BoardSpec } from '../src/model/rules';

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

describe('trySwap', () => {
  it('refuses an invalid swap and changes nothing', () => {
    const board = createBoard(SPEC, new Random(7));
    const before = kindsOf(board);
    const result = trySwap(board, { col: 0, row: 0 }, { col: 3, row: 3 }, SPEC, new Random(1));
    expect(result).toEqual({ valid: false, reason: 'not-adjacent' });
    expect(kindsOf(board)).toEqual(before);
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
        for (const spawn of step.spawns) expect(spawn.from.row).toBeLessThan(0);
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
