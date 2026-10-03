import { describe, expect, it } from 'vitest';
import { swipeTarget } from '../src/view/swipeTarget';

const from = { col: 3, row: 4 };

describe('swipeTarget', () => {
  it('waits until the finger passes the threshold', () => {
    expect(swipeTarget(from, 5, 3, 16)).toBeNull();
  });

  it('picks the neighbour in the swipe direction', () => {
    expect(swipeTarget(from, 20, 0, 16)).toEqual({ col: 4, row: 4 });
    expect(swipeTarget(from, -20, 0, 16)).toEqual({ col: 2, row: 4 });
    expect(swipeTarget(from, 0, 20, 16)).toEqual({ col: 3, row: 5 });
    expect(swipeTarget(from, 0, -20, 16)).toEqual({ col: 3, row: 3 });
  });

  it('lets the bigger axis win on a diagonal swipe', () => {
    expect(swipeTarget(from, 20, 12, 16)).toEqual({ col: 4, row: 4 });
  });
});
