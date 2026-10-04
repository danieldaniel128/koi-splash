import type { Cell } from './types';

/** A board's shape: its size, and the cells it doesn't have (holes, where the bank comes into the pond). */
export interface BoardShape {
  readonly cols: number;
  readonly rows: number;
  readonly holes: readonly Cell[];
}

const CELL = '#';
const HOLE = '.';

/**
 * Reads a shape drawn as text, one string per row from the top: '#' is a cell, '.' is a hole. Every row must be
 * as wide as the first, and there must be at least one cell, so a typo in a level fails at startup, not mid-game.
 * O(cols * rows).
 */
export function parseShape(drawing: readonly string[]): BoardShape {
  const cols = drawing[0]?.length ?? 0;
  if (cols === 0) throw new RangeError('board shape: draw at least one row');
  const holes: Cell[] = [];
  drawing.forEach((line, row) => {
    if (line.length !== cols)
      throw new RangeError(`board shape: row ${row} is ${line.length} wide, not ${cols}`);
    for (let col = 0; col < cols; col++) {
      const mark = line.charAt(col);
      if (mark === HOLE) holes.push({ col, row });
      else if (mark !== CELL)
        throw new RangeError(`board shape: '${mark}' at ${col},${row} (use ${CELL} or ${HOLE})`);
    }
  });
  if (holes.length === cols * drawing.length) throw new RangeError('board shape: it has no cells');
  return { cols, rows: drawing.length, holes };
}
