import { describe, expect, it } from 'vitest';
import { parseShape } from '../src/model/shape';

describe('parseShape', () => {
  it('reads the size and the holes from the drawing', () => {
    const shape = parseShape(['##..##', '######', '.####.']);
    expect(shape.cols).toBe(6);
    expect(shape.rows).toBe(3);
    expect(shape.holes).toEqual([
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 0, row: 2 },
      { col: 5, row: 2 },
    ]);
  });

  it('refuses a ragged drawing, a stray mark or a board with no cells', () => {
    expect(() => parseShape(['###', '##'])).toThrow(RangeError);
    expect(() => parseShape(['#x#'])).toThrow(RangeError);
    expect(() => parseShape(['...'])).toThrow(RangeError);
    expect(() => parseShape([])).toThrow(RangeError);
  });
});
