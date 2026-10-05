import { describe, expect, it } from 'vitest';
import { BOARD } from '../src/config/board';
import { KOI_COLORS, KOI_SET } from '../src/config/koi';
import { LEVEL, SCORE } from '../src/config/level';
import { BOOSTERS } from '../src/config/ui';
import { Random } from '../src/core/Random';
import { checkGoals } from '../src/model/goals';
import { PadField } from '../src/model/pads';
import { createBoard, findMatches, hasAnyMove } from '../src/model/rules';
import { parseShape } from '../src/model/shape';
import type { BoardSpec } from '../src/model/types';

/** The level's board, read the way the game reads it while booting (see measureScreen). */
const SPEC: BoardSpec = { ...parseShape(LEVEL.shape), kinds: BOARD.kinds };

/** The level as shipped: these catch a slip in the config before a player meets it. */
describe('the shipped level', () => {
  it('has a shape that reads, with water in every row and every column', () => {
    expect([SPEC.cols, SPEC.rows]).toEqual([LEVEL.shape[0].length, LEVEL.shape.length]);
    const isHole = (col: number, row: number): boolean =>
      (SPEC.holes ?? []).some((hole) => hole.col === col && hole.row === row);
    for (let row = 0; row < SPEC.rows; row++)
      expect(Array.from({ length: SPEC.cols }, (_, col) => isHole(col, row))).toContain(false);
    for (let col = 0; col < SPEC.cols; col++)
      expect(Array.from({ length: SPEC.rows }, (_, row) => isHole(col, row))).toContain(false);
  });

  it('plays every koi colour with a koi of its own, each with its special colours', () => {
    expect(BOARD.kinds).toBeGreaterThanOrEqual(3);
    expect(BOARD.kinds).toBeLessThanOrEqual(KOI_SET.length);
    expect(KOI_COLORS).toHaveLength(KOI_SET.length);
  });

  it('has goals the board can meet: no more lotuses than buds, koi of a colour in play, nothing zero', () => {
    expect(() => {
      checkGoals(LEVEL.goals, { buds: LEVEL.pads.buds, kinds: BOARD.kinds });
    }).not.toThrow();
    for (const goal of LEVEL.goals) {
      if (goal.type === 'lotus') expect(goal.count).toBeLessThanOrEqual(LEVEL.pads.buds);
      if (goal.type === 'koi') expect(goal.kind).toBeLessThan(BOARD.kinds);
      expect(goal.type === 'score' ? goal.target : goal.count).toBeGreaterThan(0);
    }
  });

  it('deals a playable board for any seed: the pads fit their spacing, no ready-made match, a move to make', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new Random(seed);
      const pads = PadField.scatter(LEVEL.pads, SPEC, rng);
      expect(pads.pads).toHaveLength(LEVEL.pads.buds + LEVEL.pads.emptyPads);
      const board = createBoard(SPEC, rng, pads.cells);
      expect(findMatches(board)).toEqual([]);
      expect(hasAnyMove(board)).toBe(true);
    }
  });

  it('has moves, points and pad hits that are positive whole numbers', () => {
    const counts = [
      LEVEL.moves,
      LEVEL.pads.hitsToBloom,
      LEVEL.pads.hitsToDrift,
      SCORE.pointsPerPiece,
      SCORE.goalBonus,
    ];
    for (const count of counts) {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
    }
  });

  it('warns of the low moves before the last ones, both before the moves run out', () => {
    const { low, last } = LEVEL.movesWarning;
    expect(last).toBeGreaterThan(0);
    expect(low).toBeGreaterThan(last);
    expect(LEVEL.moves).toBeGreaterThan(low);
  });

  it('rates with star scores that climb, so each star is harder than the last', () => {
    const [first, second, third] = LEVEL.stars.scores;
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it('gives at least one of each booster', () => {
    for (const slot of BOOSTERS) expect(slot.count).toBeGreaterThan(0);
    expect(new Set(BOOSTERS.map((slot) => slot.type)).size).toBe(BOOSTERS.length);
  });
});
