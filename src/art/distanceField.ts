type Vec = readonly [number, number];

/** A stage rectangle. */
interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A signed distance field: RGBA8 texels over `area`, one every `texel` px. */
export interface DistanceField {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly area: Area;
}

/**
 * How far each channel reaches (px): red holds the distance out to ±128 in 1 px steps (for gradients across the
 * water), green the same out to ±16 in 1/8 px steps (for crisp lines near the shore). common.glsl decodes both.
 */
export const FIELD_REACH = { coarse: 128, fine: 16 } as const;

/**
 * Bakes the signed distance to the edge of some polygons (negative inside, by the even-odd rule, so islands work)
 * into a texture, once, so a shader can ask "how far am I from the shore" of any shape with one texture read.
 * O(texels * edges): a few milliseconds for a pond.
 */
export function bakeDistanceField(
  polygons: readonly (readonly Vec[])[],
  area: Area,
  texel: number,
): DistanceField {
  const width = Math.ceil(area.width / texel);
  const height = Math.ceil(area.height / texel);
  const edges = polygons.flatMap((polygon) =>
    polygon.map((a, i): [Vec, Vec] => [a, polygon[(i + 1) % polygon.length] ?? a]),
  );
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const p: Vec = [area.x + (col + 0.5) * texel, area.y + (row + 0.5) * texel];
      const distance = signedDistance(p, edges);
      const i = (row * width + col) * 4;
      data[i] = encode(distance, FIELD_REACH.coarse);
      data[i + 1] = encode(distance, FIELD_REACH.fine);
      data[i + 3] = 255;
    }
  }
  return {
    data,
    width,
    height,
    area: { x: area.x, y: area.y, width: width * texel, height: height * texel },
  };
}

/** Distance to the nearest edge, negative inside (even-odd). O(edges). */
export function signedDistance([px, py]: Vec, edges: readonly (readonly [Vec, Vec])[]): number {
  let nearest = Infinity;
  let inside = false;
  for (const [[ax, ay], [bx, by]] of edges) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
    nearest = Math.min(nearest, Math.hypot(px - (ax + dx * t), py - (ay + dy * t)));
    if (ay > py !== by > py && px < (dx * (py - ay)) / dy + ax) inside = !inside;
  }
  return inside ? -nearest : nearest;
}

/** A distance as a byte: -reach maps to 0, +reach to 255, clamped. */
function encode(distance: number, reach: number): number {
  return Math.round((Math.max(-1, Math.min(1, distance / reach)) * 0.5 + 0.5) * 255);
}
