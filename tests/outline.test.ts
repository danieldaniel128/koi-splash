import { describe, expect, it } from 'vitest';
import { toPolygon, traceShore } from '../src/layout/outline';
import type { Outline } from '../src/layout/outline';
import { parseShape } from '../src/model/shape';

const CELL = 40;
const BOARD = { x: 0, y: 0, cellSize: CELL };
const SPEC = { margin: { left: 10, right: 10, top: 10, bottom: 10 }, cornerRadius: 12 };
const trace = (drawing: string[]): Outline[] =>
  traceShore(parseShape(drawing), { ...BOARD, width: 0, height: 0 }, SPEC);

/** Even-odd: is the point inside the polygon? */
function inside([x, y]: readonly [number, number], polygon: readonly (readonly [number, number])[]): boolean {
  let hit = false;
  polygon.forEach(([ax, ay], i) => {
    const [bx, by] = polygon[(i + 1) % polygon.length] ?? [ax, ay];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
  });
  return hit;
}

describe('traceShore', () => {
  it('gives a plain board one rounded rectangle, the margin out from its cells', () => {
    const [loop, ...rest] = trace(['###', '###']);
    expect(rest).toHaveLength(0);
    if (!loop) throw new Error('no loop');
    const width = 3 * CELL + 20;
    const height = 2 * CELL + 20;
    expect(loop.length).toBeCloseTo(2 * (width + height) - (8 - 2 * Math.PI) * SPEC.cornerRadius, 6);
    const top = loop.at(30);
    expect(top.y).toBeCloseTo(-10);
    expect(top.normal).toEqual([0, -1]);
  });

  it('follows a notch: the bank comes in, with rounded inner corners', () => {
    const [loop] = trace(['#..#', '####']);
    if (!loop) throw new Error('no loop');
    const polygon = toPolygon(loop);
    expect(inside([20, 20], polygon)).toBe(true); // a cell
    expect(inside([80, 20], polygon)).toBe(false); // in the notch, past the margin
    expect(inside([80, 60], polygon)).toBe(true); // the row under the notch
    expect(loop.parts.filter((part) => part.length > 0 && !part.at(0.5).corner).length).toBeGreaterThan(4);
  });

  it('rings an island of bank inside the pond with its own loop', () => {
    const loops = trace(['#####', '##.##', '#####']);
    expect(loops).toHaveLength(2);
    const polygons = loops.map(toPolygon);
    const inWater = (p: readonly [number, number]): boolean =>
      polygons.filter((poly) => inside(p, poly)).length % 2 === 1;
    expect(inWater([100, 60])).toBe(false); // the island's middle
    expect(inWater([20, 20])).toBe(true);
  });

  it('closes every loop: walking its whole length comes back to the start', () => {
    for (const loop of trace(['##..##', '######', '#.####', '######'])) {
      const start = loop.at(0);
      const end = loop.at(loop.length - 1e-9);
      expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(1e-6);
    }
  });
});
