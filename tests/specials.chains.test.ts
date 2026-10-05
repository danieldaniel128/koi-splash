import { describe, expect, it } from 'vitest';
import { seeded } from '../src/core/Random';
import { PadField } from '../src/model/pads';
import { findMatches, findMove, settle, trySwap } from '../src/model/rules';
import { resolveRound } from '../src/model/specials';
import type { BoardSpec, Cell, Cleared, Fired } from '../src/model/types';
import { boardFrom, cellKeys, lineOf, makeSpecial } from './support/boards';

const SPEC: BoardSpec = { cols: 6, rows: 6, colorCount: 5 };

/**
 * No match and no swap that makes one, so a swap on it does only what its specials do (a special keeps the color of
 * the koi it was made on, and a koi never matches into a rainbow koi's cell).
 */
const STUCK = ['012301', '230123', '012301', '230123', '012301', '230123'];

const cell = (col: number, row: number): Cell => ({ col, row });

/** The type of each special that fired in a round, in firing order. */
const types = (round: { readonly fired: readonly Fired[] }): string[] =>
  round.fired.map((f) => f.piece.special?.type ?? 'none');

/** The cells one blast of a round cleared, in the order it reached them. */
const clearedBy = (round: { readonly cleared: readonly Cleared[] }, blast: number): Cell[] =>
  round.cleared.filter((c) => c.blast === blast).map((c) => c.at);

describe('the fixture', () => {
  it('has no match and no move of its own', () => {
    const board = boardFrom(STUCK);
    expect(findMatches(board)).toEqual([]);
    expect(findMove(board)).toBeNull();
  });
});

describe('what each special reaches', () => {
  it('a striped koi: its whole row or column outward from itself, nearest first, never the bank', () => {
    const board = boardFrom(['.0123.', '123012']);
    makeSpecial(board, cell(2, 0), { type: 'striped', along: 'row' });
    const [row] = resolveRound(board, [], [], [{ at: cell(2, 0) }]).fired;
    expect(row?.reach).toEqual([cell(1, 0), cell(3, 0), cell(4, 0)]);

    const tall = boardFrom(STUCK);
    makeSpecial(tall, cell(4, 1), { type: 'striped', along: 'col' });
    const [column] = resolveRound(tall, [], [], [{ at: cell(4, 1) }]).fired;
    expect(column?.reach).toEqual([cell(4, 0), cell(4, 2), cell(4, 3), cell(4, 4), cell(4, 5)]);
  });

  it('a whirlpool: the eight cells round it, fewer at an edge, never the bank', () => {
    const corner = boardFrom(STUCK);
    makeSpecial(corner, cell(0, 0), { type: 'whirlpool' });
    const [atCorner] = resolveRound(corner, [], [], [{ at: cell(0, 0) }]).fired;
    expect(cellKeys(atCorner?.reach ?? [])).toEqual(cellKeys([cell(1, 0), cell(0, 1), cell(1, 1)]));

    const byTheBank = boardFrom(['.123', '0123', '0123']);
    makeSpecial(byTheBank, cell(1, 1), { type: 'whirlpool' });
    const [nearBank] = resolveRound(byTheBank, [], [], [{ at: cell(1, 1) }]).fired;
    expect(nearBank?.reach).toHaveLength(7);
    expect(cellKeys(nearBank?.reach ?? [])).not.toContain('0,0');
  });

  it('a rainbow koi: every koi of its colour but another rainbow koi, nearest first', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(0, 0), { type: 'rainbow' });
    const otherRainbow = makeSpecial(board, cell(1, 0), { type: 'rainbow' }); // on a color-1 koi
    const ones = [...board.cells()].filter((c) => board.get(c)?.color === 1 && !board.get(c)?.special);
    const [blast] = resolveRound(board, [], [], [{ at: cell(0, 0), target: 1 }]).fired;
    expect(otherRainbow.color).toBe(1);
    expect(ones).toHaveLength(8); // the board's nine 1s but the rainbow koi
    expect(blast?.target).toBe(1);
    expect(cellKeys(blast?.reach ?? [])).toEqual(cellKeys(ones));
    const distances = (blast?.reach ?? []).map((c) => c.col ** 2 + c.row ** 2);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });
});

describe('chains', () => {
  it('a special caught in a blast fires too, from the cell it was caught in', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(2, 2), { type: 'whirlpool' });
    makeSpecial(board, cell(3, 3), { type: 'striped', along: 'col' }); // inside the whirlpool's eight
    const round = resolveRound(board, [], [], [{ at: cell(2, 2) }]);
    expect(types(round)).toEqual(['whirlpool', 'striped']);
    expect(round.fired[1]?.at).toEqual(cell(3, 3));
    expect(cellKeys(round.fired[1]?.reach ?? [])).toEqual(
      cellKeys(lineOf(board, 'col', 3).filter((c) => c.row !== 3)),
    );
    // the whirlpool took column 3's rows 1 to 3; the striped koi sweeps the rest, nearest first
    expect(clearedBy(round, 1)).toEqual([cell(3, 4), cell(3, 5), cell(3, 0)]);
  });

  it('fires the specials a blast catches in the order it caught them, before any they catch in turn', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(2, 2), { type: 'striped', along: 'row' });
    makeSpecial(board, cell(1, 2), { type: 'striped', along: 'col' }); // caught first (1 cell away)
    makeSpecial(board, cell(4, 2), { type: 'whirlpool' }); // caught second (2 cells away)
    makeSpecial(board, cell(1, 5), { type: 'rainbow' }); // caught by the column sweep
    const round = resolveRound(board, [], [], [{ at: cell(2, 2) }]);
    expect(types(round)).toEqual(['striped', 'striped', 'whirlpool', 'rainbow']);
    expect(round.fired.map((f) => f.at)).toEqual([cell(2, 2), cell(1, 2), cell(4, 2), cell(1, 5)]);
  });

  it('fires a special once, though two blasts pass over its cell', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(0, 2), { type: 'striped', along: 'row' });
    makeSpecial(board, cell(3, 0), { type: 'striped', along: 'col' });
    const crossing = makeSpecial(board, cell(3, 2), { type: 'whirlpool' }); // where the two sweeps cross
    const round = resolveRound(board, [], [], [{ at: cell(0, 2) }, { at: cell(3, 0) }]);
    expect(types(round)).toEqual(['striped', 'striped', 'whirlpool']);
    expect(round.fired.filter((f) => f.piece.id === crossing.id)).toHaveLength(1);
    expect(round.cleared.filter((c) => c.piece.id === crossing.id)).toHaveLength(1);
  });

  it('fires a swapped special once, though its partner caught it first', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(2, 2), { type: 'whirlpool' });
    makeSpecial(board, cell(3, 2), { type: 'striped', along: 'row' });
    const result = trySwap(board, cell(2, 2), cell(3, 2), SPEC, seeded(1));
    if (!result.valid) throw new Error('refused');
    const first = result.rounds[0];
    if (!first) throw new Error('no round');
    expect(first.matches).toEqual([]);
    expect(types(first)).toEqual(['whirlpool', 'striped']); // the whirlpool, moved to (3, 2), caught the striped koi
    expect(new Set(first.fired.map((f) => f.piece.id)).size).toBe(2);
  });

  it('a rainbow koi caught in a blast takes the colour most koi have', () => {
    // 3s outnumber 1s two to one, and stay ahead after the sweep
    const board = boardFrom(['331331', '133133', '313313', '331331']);
    makeSpecial(board, cell(0, 0), { type: 'striped', along: 'row' });
    makeSpecial(board, cell(5, 0), { type: 'rainbow' });
    const round = resolveRound(board, [], [], [{ at: cell(0, 0) }]);
    expect(types(round)).toEqual(['striped', 'rainbow']);
    expect(round.fired[1]?.target).toBe(3);
    const taken = round.cleared.filter((c) => c.blast === 1);
    expect(taken).toHaveLength(12); // the 16 threes but the 4 on the swept row
    expect(taken.every((c) => c.piece.color === 3)).toBe(true);
  });

  it('a striped koi sweeping over a lily pad hits it, though no koi beside the pad cleared', () => {
    const board = boardFrom(['012301', '2301**', '012301', '230123']);
    makeSpecial(board, cell(0, 1), { type: 'striped', along: 'row' });
    const pads = new PadField([
      { id: 1, at: cell(4, 1), kind: 'empty', hitsLeft: 2, hitsNeeded: 2 },
      { id: 2, at: cell(5, 1), kind: 'bud', hitsLeft: 2, hitsNeeded: 2 }, // next to the other pad and the bank
    ]);
    const { rounds } = settle(board, { ...SPEC, rows: 4 }, seeded(1), {
      pads,
      firing: [{ at: cell(0, 1) }],
    });
    const first = rounds[0];
    expect(first?.padEvents.map((e) => [e.type, e.pad.id])).toEqual([
      ['hit', 1],
      ['hit', 2],
    ]);
    expect(first?.cleared.map((c) => c.at)).toEqual([cell(0, 1), cell(1, 1), cell(2, 1), cell(3, 1)]);
  });
});

describe('two specials swapped together', () => {
  it('two rainbow koi take every koi on the board', () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(2, 2), { type: 'rainbow' });
    makeSpecial(board, cell(2, 3), { type: 'rainbow' });
    const result = trySwap(board, cell(2, 2), cell(2, 3), SPEC, seeded(1));
    if (!result.valid) throw new Error('refused');
    const first = result.rounds[0];
    expect(first?.fired.map((f) => f.target)).toEqual(['all', 'all']);
    expect(cellKeys(first?.cleared.map((c) => c.at) ?? [])).toEqual(cellKeys([...board.cells()]));
  });

  it("a rainbow koi swapped with a striped koi takes the striped koi's colour, and the striped koi fires", () => {
    const board = boardFrom(STUCK);
    makeSpecial(board, cell(2, 2), { type: 'rainbow' });
    const striped = makeSpecial(board, cell(3, 2), { type: 'striped', along: 'col' }); // on a color-3 koi
    const threes = [...board.cells()].filter((c) => board.get(c)?.color === 3);
    const result = trySwap(board, cell(2, 2), cell(3, 2), SPEC, seeded(1));
    if (!result.valid) throw new Error('refused');
    const first = result.rounds[0];
    if (!first) throw new Error('no round');
    expect(first.matches).toEqual([]);
    expect(types(first)).toEqual(['rainbow', 'striped']);
    expect(first.fired[0]?.target).toBe(striped.color);
    // every 3, the striped koi too (it moved to (2, 2) in the swap), then the striped koi's column
    expect(cellKeys(clearedBy(first, 0))).toEqual(
      cellKeys(threes.map((c) => (c.col === 3 && c.row === 2 ? cell(2, 2) : c))),
    );
    expect(first.fired[1]?.at).toEqual(cell(2, 2));
  });
});
