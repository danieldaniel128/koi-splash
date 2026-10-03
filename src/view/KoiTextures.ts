import { Texture } from 'pixi.js';
import { bakeKoi, getVariety } from '../art/koiBank';
import type { Kind } from '../model/types';

/**
 * Textures per koi kind, painted once at startup and shared by every sprite of that kind: the koi itself and its
 * soft shadow on the pond bottom. Painting is expensive canvas work, so it must never happen during play.
 */
export class KoiTextures {
  private readonly koi: Texture[];
  private readonly shadows: Texture[];

  /** O(kinds), but each one is a full canvas paint plus a GPU upload: the heavy part of boot, done once. */
  constructor(varietyIds: readonly string[], size: number, resolution: number, shadowBlur: number) {
    const canvases = varietyIds.map((id) => bakeKoi(getVariety(id), { size, resolution }));
    const blurPx = shadowBlur * resolution;
    this.koi = canvases.map((canvas) => Texture.from(canvas));
    this.shadows = canvases.map((canvas) => Texture.from(bakeShadow(canvas, blurPx)));
  }

  get(kind: Kind): Texture {
    return pick(this.koi, kind);
  }

  shadow(kind: Kind): Texture {
    return pick(this.shadows, kind);
  }

  destroy(): void {
    for (const texture of [...this.koi, ...this.shadows]) texture.destroy(true);
    this.koi.length = 0;
    this.shadows.length = 0;
  }
}

function pick(textures: readonly Texture[], kind: Kind): Texture {
  const texture = textures[kind];
  if (!texture) throw new RangeError(`no koi texture for kind ${kind}`);
  return texture;
}

/** The koi's silhouette in black, blurred, on a canvas padded so the blur isn't cut off. */
function bakeShadow(koi: HTMLCanvasElement, blurPx: number): HTMLCanvasElement {
  const pad = blurPx * 2;
  const canvas = document.createElement('canvas');
  canvas.width = koi.width + pad * 2;
  canvas.height = koi.height + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(koi, pad, pad);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
