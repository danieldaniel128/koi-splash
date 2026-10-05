import { describe, expect, it } from 'vitest';
import { SwipeTracker } from '../src/view/SwipeTracker';
import type { PointerPress } from '../src/view/SwipeTracker';

/** Cells 10 px square; a swipe counts after 4 px. */
function setup(): { tracker: SwipeTracker; heard: string[] } {
  const heard: string[] = [];
  const tracker = new SwipeTracker(
    (point) =>
      point.x >= 0 && point.y >= 0 ? { col: Math.floor(point.x / 10), row: Math.floor(point.y / 10) } : null,
    4,
    {
      swipe: (from, to) => heard.push(`swipe ${from.col},${from.row} > ${to.col},${to.row}`),
      tap: (cell) => heard.push(`tap ${cell.col},${cell.row}`),
    },
  );
  return { tracker, heard };
}

/** The first finger (or the left button) going down at x, y. */
const press = (id: number, x: number, y: number, more: Partial<PointerPress> = {}): PointerPress => ({
  id,
  point: { x, y },
  primary: true,
  button: 0,
  ...more,
});

describe('SwipeTracker', () => {
  it('reports one swipe as the drag passes the threshold, and a tap for a finger that lifts before', () => {
    const { tracker, heard } = setup();
    tracker.down(press(1, 15, 15));
    tracker.move(1, { x: 17, y: 15 });
    tracker.move(1, { x: 21, y: 15 });
    tracker.move(1, { x: 30, y: 15 }); // the rest of the drag
    tracker.up(1);
    tracker.down(press(1, 25, 5));
    tracker.move(1, { x: 26, y: 6 });
    tracker.up(1);
    expect(heard).toEqual(['swipe 1,1 > 2,1', 'tap 2,0']);
  });

  it('ignores a second finger: it neither takes over nor swipes', () => {
    const { tracker, heard } = setup();
    tracker.down(press(1, 15, 15));
    tracker.down(press(2, 45, 45, { primary: false }));
    tracker.move(2, { x: 60, y: 45 });
    tracker.up(2);
    expect(heard).toEqual([]);
    tracker.up(1);
    expect(heard).toEqual(['tap 1,1']);
  });

  it('ignores a right click', () => {
    const { tracker, heard } = setup();
    tracker.down(press(1, 15, 15, { button: 2 }));
    tracker.move(1, { x: 30, y: 15 });
    tracker.up(1);
    expect(heard).toEqual([]);
  });

  it('forgets a finger that lifted off the board', () => {
    const { tracker, heard } = setup();
    tracker.down(press(1, 15, 15));
    tracker.cancel(1);
    tracker.move(1, { x: 30, y: 15 });
    tracker.up(1);
    expect(heard).toEqual([]);
  });
});
