import { blank, centerOn, context } from './canvas';
import { pieceSize } from './pondProps';

/** A rectangle in the atlas, in canvas pixels. */
export interface AtlasSlot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One piece to paint into the atlas: its half size (px) and a painter that draws it centred on the origin. */
export interface AtlasPiece {
  readonly radius: readonly [number, number];
  readonly paint: (ctx: CanvasRenderingContext2D) => void;
}

export interface Atlas {
  readonly canvas: HTMLCanvasElement;
  /** Where each piece is, in the order they were given. */
  readonly slots: readonly AtlasSlot[];
  /** Canvas pixels per px it was painted at (lower than asked if the pieces wouldn't fit). */
  readonly resolution: number;
}

/** Empty pixels around every slot, so texture filtering never pulls in a neighbour's edge. */
const PADDING = 2;
/** Every WebGL device takes a texture this big (px). */
export const MAX_TEXTURE_SIZE = 2048;

/**
 * Paints many small pieces into one canvas: one texture upload and, since every sprite then shares the texture,
 * one draw call for all of them. If they don't fit at `resolution`, it steps the resolution down until they do.
 * O(pieces) paints, once.
 */
export function bakeAtlas(
  pieces: readonly AtlasPiece[],
  resolution: number,
  maxSize = MAX_TEXTURE_SIZE,
): Atlas {
  let scale = resolution;
  let packed = packShelves(sizesAt(pieces, scale), maxSize);
  while (packed.height > maxSize) {
    scale *= 0.85;
    packed = packShelves(sizesAt(pieces, scale), maxSize);
  }
  const canvas = blank(packed.width, packed.height);
  const ctx = context(canvas);
  pieces.forEach((piece, i) => {
    const slot = packed.slots[i];
    if (!slot) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.width, slot.height);
    ctx.clip(); // a piece's shadow never spills into its neighbour
    centerOn(ctx, slot.x + slot.width / 2, slot.y + slot.height / 2, scale);
    piece.paint(ctx);
    ctx.restore();
  });
  return { canvas, slots: packed.slots, resolution: scale };
}

/**
 * Shelf packing: the tallest pieces first, left to right along a shelf, a new shelf when one is full. Slots come
 * back in the input order. O(n log n).
 */
export function packShelves(
  sizes: readonly { width: number; height: number }[],
  maxWidth: number,
): { slots: AtlasSlot[]; width: number; height: number } {
  const order = sizes.map((_, i) => i).sort((a, b) => (sizes[b]?.height ?? 0) - (sizes[a]?.height ?? 0));
  const slots: AtlasSlot[] = new Array<AtlasSlot>(sizes.length);
  let x = PADDING;
  let y = PADDING;
  let shelf = 0;
  let width = 0;
  for (const i of order) {
    const size = sizes[i];
    if (!size) continue;
    if (x + size.width + PADDING > maxWidth && x > PADDING) {
      x = PADDING;
      y += shelf + PADDING;
      shelf = 0;
    }
    slots[i] = { x, y, width: size.width, height: size.height };
    x += size.width + PADDING;
    shelf = Math.max(shelf, size.height);
    width = Math.max(width, x);
  }
  return { slots, width, height: y + shelf + PADDING };
}

function sizesAt(pieces: readonly AtlasPiece[], scale: number): { width: number; height: number }[] {
  return pieces.map((piece) => {
    const { width, height } = pieceSize(piece.radius);
    return { width: Math.ceil(width * scale), height: Math.ceil(height * scale) };
  });
}
