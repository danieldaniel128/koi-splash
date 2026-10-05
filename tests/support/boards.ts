import { Board } from '../../src/model/Board';
import type { Cell, Piece, Special } from '../../src/model/types';

/**
 * A board drawn row by row from the top: a digit is a koi of that color, '*' a lily pad (a blocked cell) and '.' a
 * hole (no cell, the bank). Every row must be as wide as the first.
 */
export function boardFrom(rows: readonly string[]): Board {
  const holes: Cell[] = [];
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) if (line.charAt(col) === '.') holes.push({ col, row });
  });
  const board = new Board(rows[0]?.length ?? 0, rows.length, holes);
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const mark = line.charAt(col);
      if (mark === '*') board.setBlocked({ col, row }, true);
      else if (mark !== '.') board.set({ col, row }, board.createPiece(Number(mark)));
    }
  });
  return board;
}

/** Turns the koi at `at` into a special, keeping its color and id, and returns it. */
export function makeSpecial(board: Board, at: Cell, special: Special): Piece {
  const koi = board.get(at);
  if (!koi) throw new Error(`no koi at ${at.col},${at.row}`);
  const piece = { ...koi, special };
  board.set(at, piece);
  return piece;
}

/** The board drawn back as rows: each koi's color, '-' for an empty cell (a pad, a hole or a cleared koi). */
export function drawBoard(board: Board): string[] {
  const rows: string[] = [];
  for (let row = 0; row < board.rows; row++) {
    let line = '';
    for (let col = 0; col < board.cols; col++) line += String(board.get({ col, row })?.color ?? '-');
    rows.push(line);
  }
  return rows;
}

/** Every cell of one row, left to right, or of one column, top to bottom. */
export function lineOf(board: Board, along: 'row' | 'col', index: number): Cell[] {
  return along === 'row'
    ? Array.from({ length: board.cols }, (_, col) => ({ col, row: index }))
    : Array.from({ length: board.rows }, (_, row) => ({ col: index, row }));
}

/** Cells as 'col,row' strings, sorted: compares sets of cells regardless of order. */
export function cellKeys(cells: readonly Cell[]): string[] {
  return cells.map((cell) => `${cell.col},${cell.row}`).sort();
}
