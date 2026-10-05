import type { Anchor } from '../config/pond';
import type { Rect } from './gameLayout';

/** Where an anchored spot lands on this rectangle, in stage px. O(1). */
export function placeOn(rect: Rect, { corner, offset }: Anchor): [number, number] {
  const x = corner.endsWith('left') ? rect.x : rect.x + rect.width;
  const y = corner.startsWith('top') ? rect.y : rect.y + rect.height;
  return [x + offset[0], y + offset[1]];
}
