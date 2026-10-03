import type { Cell } from '../model/types';

/**
 * The neighbour a swipe points at, or null while the finger hasn't moved far enough.
 * The bigger axis wins, so a slightly diagonal swipe still counts as left/right or up/down.
 */
export function swipeTarget(from: Cell, dx: number, dy: number, threshold: number): Cell | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return { col: from.col + Math.sign(dx), row: from.row };
  return { col: from.col, row: from.row + Math.sign(dy) };
}
