import { describe, expect, it } from 'vitest';
import { SwapControl } from '../src/game/SwapControl';
import type { Cell } from '../src/model/types';

const at = (cell: Cell): string => `${cell.col},${cell.row}`;

/** A swap control on a board whose bottom row has no koi, recording the swaps and the marks it asked for. */
function setup(options: { busy?: boolean } = {}): { swaps: SwapControl; log: string[] } {
  const log: string[] = [];
  const swaps = new SwapControl(
    {
      canSwap: !options.busy,
      hasKoi: (cell) => cell.row < 8,
      handleSwipe: (from, to) => log.push(`swap ${at(from)} > ${at(to)}`),
    },
    { lift: (cell) => log.push(cell ? `lift ${at(cell)}` : 'drop') },
  );
  return { swaps, log };
}

describe('SwapControl', () => {
  it('a tap picks a koi, and a tap on its neighbour swaps the two', () => {
    const { swaps, log } = setup();
    swaps.tap({ col: 2, row: 2 });
    swaps.tap({ col: 3, row: 2 });
    expect(log).toEqual(['lift 2,2', 'drop', 'swap 2,2 > 3,2']);
  });

  it('the picked koi tapped again goes back; a koi further away is picked instead', () => {
    const { swaps, log } = setup();
    swaps.tap({ col: 2, row: 2 });
    swaps.tap({ col: 2, row: 2 });
    swaps.tap({ col: 2, row: 2 });
    swaps.tap({ col: 5, row: 5 });
    expect(log).toEqual(['lift 2,2', 'drop', 'lift 2,2', 'drop', 'lift 5,5']);
  });

  it('a swipe drops the pick and swaps as usual', () => {
    const { swaps, log } = setup();
    swaps.tap({ col: 2, row: 2 });
    swaps.swipe({ col: 4, row: 4 }, { col: 4, row: 5 });
    expect(log).toEqual(['lift 2,2', 'drop', 'swap 4,4 > 4,5']);
  });

  it('picks nothing while a turn plays, nor where there is no koi', () => {
    const busy = setup({ busy: true });
    busy.swaps.tap({ col: 2, row: 2 });
    expect(busy.log).toEqual([]);

    const { swaps, log } = setup();
    swaps.tap({ col: 2, row: 8 });
    swaps.drop();
    expect(log).toEqual([]);
  });
});
