import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { PadField } from '../src/model/pads';
import type { Pad } from '../src/model/pads';

function bud(id: number, col: number, row: number, hits = 2): Pad {
  return { id, at: { col, row }, kind: 'bud', hitsLeft: hits, hitsNeeded: hits };
}

describe('PadField', () => {
  it('opens a bud on the first hit and blooms it on the second', () => {
    const field = new PadField([bud(1, 3, 3)]);
    expect(field.hit([{ col: 4, row: 3 }]).map((e) => e.type)).toEqual(['hit']);
    expect(field.hit([{ col: 3, row: 2 }]).map((e) => e.type)).toEqual(['bloom']);
    expect(field.pads).toEqual([]);
  });

  it('ignores clears that are not on or next to the pad', () => {
    const field = new PadField([bud(1, 3, 3)]);
    expect(
      field.hit([
        { col: 4, row: 4 },
        { col: 5, row: 3 },
      ]),
    ).toEqual([]);
  });

  it('takes one hit per round however many koi clear around it', () => {
    const field = new PadField([bud(1, 3, 3)]);
    field.hit([
      { col: 2, row: 3 },
      { col: 4, row: 3 },
      { col: 3, row: 4 },
    ]);
    expect(field.pads[0]?.hitsLeft).toBe(1);
  });

  it('respects a configured number of hits', () => {
    const field = new PadField([bud(1, 0, 0, 15)]);
    for (let i = 0; i < 14; i++) field.hit([{ col: 0, row: 0 }]);
    expect(field.hit([{ col: 0, row: 0 }]).map((e) => e.type)).toEqual(['bloom']);
  });

  it('scatters the configured pads on distinct cells', () => {
    const field = PadField.scatter(
      { buds: 3, emptyPads: 2, hitsToBloom: 2, hitsToDrift: 1 },
      { cols: 7, rows: 9, kinds: 5 },
      new Random(4),
    );
    const cells = new Set(field.pads.map((p) => `${p.at.col},${p.at.row}`));
    expect(cells.size).toBe(5);
    expect(field.pads.filter((p) => p.kind === 'bud')).toHaveLength(3);
  });
});
