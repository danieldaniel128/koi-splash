import { describe, expect, it } from 'vitest';
import { int, pick, seeded } from '../src/core/Random';
import { Board } from '../src/model/Board';
import { createBoard, findMove, trySwap } from '../src/model/rules';
import { scoreRound } from '../src/model/score';
import type { Cell, Special } from '../src/model/types';
import { splitPoints } from '../src/view/splitPoints';

const SPEC = { cols: 7, rows: 9, kinds: 5 };
const SPECIALS: Special[] = [{ type: 'line', along: 'row' }, { type: 'whirl' }, { type: 'rainbow' }];

/** A swap that does something on this board: a match, or else a special swapped with the koi beside it. */
function playableSwap(board: Board): [Cell, Cell] | null {
  const move = findMove(board);
  if (move) return move;
  for (const cell of board.cells()) {
    const right = { col: cell.col + 1, row: cell.row };
    if (board.get(cell)?.special && board.get(right)) return [cell, right];
  }
  return null;
}

describe('splitPoints', () => {
  it('puts a 4-match and the striped koi it makes in one popup worth the whole round', () => {
    const board = new Board(4, 2);
    ['1101', '2312'].forEach((line, row) => {
      for (let col = 0; col < 4; col++) board.set({ col, row }, board.createPiece(Number(line.charAt(col))));
    });
    const result = trySwap(
      board,
      { col: 2, row: 1 },
      { col: 2, row: 0 },
      { ...SPEC, cols: 4, rows: 2 },
      seeded(1),
    );
    if (!result.valid) throw new Error('refused');
    const [first] = result.rounds;
    if (!first) throw new Error('no round');
    const points = scoreRound(first, 0, 10); // 3 koi cleared and a striped koi's bonus
    expect(splitPoints(first, points)).toEqual([{ over: first.matches[0]?.cells, amount: points, size: 4 }]);
  });

  it('adds up to the points the scene scored, for every round of every cascade, specials and all', () => {
    let rounds = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const rng = seeded(seed);
      const board = createBoard(SPEC, rng);
      for (let k = 0; k < 4; k++) {
        const at = { col: int(rng, 0, SPEC.cols - 1), row: int(rng, 0, SPEC.rows - 1) };
        const koi = board.get(at);
        if (koi) board.set(at, { ...koi, special: pick(rng, SPECIALS) });
      }
      const swap = playableSwap(board);
      if (!swap) continue;
      const result = trySwap(board, swap[0], swap[1], SPEC, rng);
      if (!result.valid) continue;
      result.rounds.forEach((round, roundIndex) => {
        const points = scoreRound(round, roundIndex, 10);
        const shares = splitPoints(round, points);
        expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(points);
        for (const share of shares) expect(share.amount).toBeGreaterThan(0);
        rounds++;
      });
    }
    expect(rounds).toBeGreaterThan(150);
  });
});
