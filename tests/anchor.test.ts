import { describe, expect, it } from 'vitest';
import { placeOn } from '../src/layout/anchor';

const POND = { x: -7, y: 100, width: 374, height: 460 };

describe('placeOn', () => {
  it('pins a spot to the corner it names', () => {
    expect(placeOn(POND, { corner: 'top-left', offset: [3, 4] })).toEqual([-4, 104]);
    expect(placeOn(POND, { corner: 'top-right', offset: [-23, 8] })).toEqual([344, 108]);
    expect(placeOn(POND, { corner: 'bottom-left', offset: [55, -22] })).toEqual([48, 538]);
    expect(placeOn(POND, { corner: 'bottom-right', offset: [-15, 8] })).toEqual([352, 568]);
  });

  it('moves with its corner when the rectangle grows', () => {
    const taller = { ...POND, height: POND.height + 60 };
    const spot = { corner: 'bottom-right', offset: [-105, -30] } as const;
    expect(placeOn(taller, spot)[1] - placeOn(POND, spot)[1]).toBe(60);
  });
});
