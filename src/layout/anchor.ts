import type { Rect } from './gameLayout';

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** A spot pinned to a corner of a rectangle (the pond, the stage), so it moves with that corner on any screen. */
export interface Anchor {
  readonly corner: Corner;
  /** px from the corner: +x is right, +y is down. */
  readonly offset: readonly [number, number];
}

/** Where an anchored spot lands on this rectangle, in stage px. O(1). */
export function placeOn(rect: Rect, { corner, offset }: Anchor): [number, number] {
  const x = corner.endsWith('left') ? rect.x : rect.x + rect.width;
  const y = corner.startsWith('top') ? rect.y : rect.y + rect.height;
  return [x + offset[0], y + offset[1]];
}
