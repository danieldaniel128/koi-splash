import { Texture } from 'pixi.js';
import { bakeKoi, getVariety } from '../art/koiBank';
import type { BakeOptions } from '../art/koiBank';
import { bakeInkedKoi, bakeKoiContact } from '../art/koiInk';
import type { KoiInk } from '../art/koiInk';
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
  /** The cartoon outline and how the fins and tail sit under the water. */
  readonly ink: KoiInk;
  /**
   * Where the koi meets the water: how far out from the body the foam sits, how soft its mask is (stage px), and
   * the mask's pixel density (it's soft, so it's baked coarser than the koi).
   */
  readonly contactGap: number;
  readonly contactBlur: number;
  readonly contactResolution: number;
}

/**
 * Textures per koi kind, painted once at startup and shared by every sprite of that kind: one tail beat of inked
 * poses (the koi swim in place by stepping through them), a soft shadow for the pond bottom and the shape where the
 * koi meets the water (for the foam at the waterline). Painting is expensive canvas work, so it must never happen
 * during play.
 */
export class KoiTextures {
  private readonly poses: Texture[][];
  private readonly shadows: Texture[];
  private readonly contacts: Texture[][];

  /**
   * O(kinds x frames) canvas paints plus GPU uploads: the heavy part of boot, done once (5 kinds x 12 poses, each
   * painted in two parts and outlined, take well under a hundred ms on a phone).
   */
  constructor(varietyIds: readonly string[], bake: KoiBake) {
    this.poses = varietyIds.map((id) => bakePoses(id, bake));
    this.contacts = varietyIds.map((id) => bakeContacts(id, bake));
    this.shadows = varietyIds.map((id) => {
      const still = bakeKoi(getVariety(id), stillPose(bake));
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

  /** Where a koi of this kind meets the water, one shape per pose (see bakeKoiContact), at contactResolution. */
  contact(kind: Kind): readonly Texture[] {
    const shapes = this.contacts[kind];
    if (!shapes) throw new RangeError(`no koi contact for kind ${kind}`);
    return shapes;
  }

  destroy(): void {
    for (const texture of [...this.poses.flat(), ...this.shadows, ...this.contacts.flat()]) texture.destroy(true);
    this.poses.length = 0;
    this.shadows.length = 0;
    this.contacts.length = 0;
  }
}

/** One full tail beat: pose i swings the tail by sin(2 PI i / frames), so the poses loop smoothly. */
function bakePoses(varietyId: string, bake: KoiBake): Texture[] {
  const variety = getVariety(varietyId);
  return Array.from({ length: bake.frames }, (_, i) =>
    Texture.from(bakeInkedKoi(variety, { ...stillPose(bake), tailWag: tailWag(i, bake) }, bake.ink)),
  );
}

/** The contact shape of every pose, so the foam follows the body as it bends. */
function bakeContacts(varietyId: string, bake: KoiBake): Texture[] {
  const variety = getVariety(varietyId);
  const pose = { ...stillPose(bake), resolution: bake.contactResolution };
  return Array.from({ length: bake.frames }, (_, i) =>
    Texture.from(bakeKoiContact(variety, { ...pose, tailWag: tailWag(i, bake) }, bake.contactGap, bake.contactBlur)),
  );
}

function tailWag(pose: number, bake: KoiBake): number {
  return Math.sin((pose / bake.frames) * Math.PI * 2) * bake.tailSwing;
}

/** The straight pose, with no shadow: the shadow is its own sprite on the pond bottom. */
function stillPose(bake: KoiBake): BakeOptions {
  return { size: bake.size, resolution: bake.resolution, build: bake.build, shadow: false };
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
