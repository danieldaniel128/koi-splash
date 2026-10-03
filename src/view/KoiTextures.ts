import { Texture } from 'pixi.js';
import { bakeKoi, getVariety } from '../art/koiBank';
import type { Kind } from '../model/types';

/** How the koi textures are baked. */
export interface KoiBake {
  /** Edge of the square each koi is painted in (stage px), and the pixel density of the bake. */
  readonly size: number;
  readonly resolution: number;
  /** Body width (see koiBank's build). */
  readonly build: number;
  /** Poses in one tail beat, and how far the tail swings (koiBank's tailWag at the widest pose). */
  readonly frames: number;
  readonly tailSwing: number;
  /** Blur of the shadow on the pond bottom (stage px). */
  readonly shadowBlur: number;
}

/**
 * Textures per koi kind, painted once at startup and shared by every sprite of that kind: one tail beat of poses
 * (the koi swim in place by stepping through them) and a soft shadow for the pond bottom. Painting is expensive
 * canvas work, so it must never happen during play.
 */
export class KoiTextures {
  private readonly poses: Texture[][];
  private readonly shadows: Texture[];

  /**
   * O(kinds x frames) canvas paints plus GPU uploads: the heavy part of boot, done once (5 kinds x 12 poses take
   * a few tens of ms on a phone).
   */
  constructor(varietyIds: readonly string[], bake: KoiBake) {
    this.poses = varietyIds.map((id) => bakePoses(id, bake));
    this.shadows = varietyIds.map((id) => {
      const still = bakeKoi(getVariety(id), {
        size: bake.size,
        resolution: bake.resolution,
        build: bake.build,
        shadow: false,
      });
      return Texture.from(bakeShadow(still, bake.shadowBlur * bake.resolution));
    });
  }

  /** One tail beat of poses for a kind, in order. */
  swim(kind: Kind): readonly Texture[] {
    const poses = this.poses[kind];
    if (!poses) throw new RangeError(`no koi textures for kind ${kind}`);
    return poses;
  }

  shadow(kind: Kind): Texture {
    const texture = this.shadows[kind];
    if (!texture) throw new RangeError(`no koi shadow for kind ${kind}`);
    return texture;
  }

  destroy(): void {
    for (const texture of [...this.poses.flat(), ...this.shadows]) texture.destroy(true);
    this.poses.length = 0;
    this.shadows.length = 0;
  }
}

/** One full tail beat: pose i swings the tail by sin(2 PI i / frames), so the poses loop smoothly. */
function bakePoses(varietyId: string, bake: KoiBake): Texture[] {
  const variety = getVariety(varietyId);
  return Array.from({ length: bake.frames }, (_, i) => {
    const tailWag = Math.sin((i / bake.frames) * Math.PI * 2) * bake.tailSwing;
    const canvas = bakeKoi(variety, {
      size: bake.size,
      resolution: bake.resolution,
      build: bake.build,
      shadow: false, // the shadow is its own sprite on the pond bottom
      tailWag,
    });
    return Texture.from(canvas);
  });
}

/** The koi's silhouette in white, blurred, on a canvas padded so the blur isn't cut off. Tinted by the sprite. */
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
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
