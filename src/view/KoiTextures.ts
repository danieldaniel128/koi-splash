import { Texture } from 'pixi.js';
import { drawBlurred } from '../art/blur';
import { blank, context } from '../art/canvas';
import { bakeKoi, getVariety } from '../art/koiBank';
import type { BakeOptions } from '../art/koiBank';
import { bakeInkedKoi, bakeKoiContact } from '../art/koiInk';
import type { Dressing, KoiContactShape, KoiInk } from '../art/koiInk';
import type { PieceColor } from '../model/types';

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
   * Where the koi meets the water, for the foam at the waterline (see bakeKoiContact), and the pixel density of that
   * mask (it's soft, so it's baked coarser than the koi).
   */
  readonly contact: KoiContactShape;
  readonly contactResolution: number;
  /** Contact shapes in one tail beat: soft, so fewer than the poses. */
  readonly contactFrames: number;
}

/**
 * Textures per koi color, painted once at startup and shared by every sprite of that color: one tail beat of inked
 * poses (the koi swim in place by stepping through them), a soft shadow for the pond bottom and the shape where the
 * koi meets the water (for the foam at the waterline). Painting is expensive canvas work, so it must never happen
 * during play.
 */
export class KoiTextures {
  /**
   * A contact shape's pixels against its koi's (they are baked coarser, on a padded canvas): a contact sprite takes
   * its koi's scale times this.
   */
  readonly contactScale: number;
  private readonly poses: Texture[][];
  private readonly shadows: Texture[];
  private readonly contacts: Texture[][];

  /**
   * O(colors x frames) canvas paints: every other pose of the tail beat (a whole beat on its own, the poses between
   * come later: see inBetweenJobs), their blurred contact masks and one shadow per color, then GPU uploads. Done once
   * while the game loads, with the GPU's drawing of the canvases on top, when they're first uploaded.
   */
  constructor(
    private readonly varietyIds: readonly string[],
    private readonly bake: KoiBake,
  ) {
    this.contactScale = bake.resolution / bake.contactResolution;
    this.poses = varietyIds.map((id) =>
      Array.from({ length: bake.frames / 2 }, (_, i) => Texture.from(bakePose(id, bake, i * 2))),
    );
    this.contacts = varietyIds.map((id) => bakeContacts(id, bake));
    this.shadows = varietyIds.map((id) => bakeShadow(bakeKoi(getVariety(id), stillPose(bake)), bake));
  }

  /**
   * The tail beat's poses between the ones baked with the koi, one job per pose, for the loading screen's last steps:
   * once a color's are all baked its beat grows in place to all its poses, and every koi swimming with it picks them
   * up on its next frame.
   */
  inBetweenJobs(): (() => void)[] {
    const count = this.bake.frames / 2;
    return this.varietyIds.flatMap((id, color) => {
      const between: Texture[] = [];
      return Array.from({ length: count }, (_, k) => () => {
        between.push(Texture.from(bakePose(id, this.bake, k * 2 + 1)));
        if (between.length === count) this.interleave(color, between);
      });
    });
  }

  /** One tail beat of poses for a color, in order (every other one until the in-between poses are baked). */
  swim(color: PieceColor): readonly Texture[] {
    const poses = this.poses[color];
    if (!poses) throw new RangeError(`no koi textures for color ${color}`);
    return poses;
  }

  shadow(color: PieceColor): Texture {
    const texture = this.shadows[color];
    if (!texture) throw new RangeError(`no koi shadow for color ${color}`);
    return texture;
  }

  /** Where a koi of this color meets the water through its tail beat (see bakeKoiContact), at contactResolution. */
  contact(color: PieceColor): readonly Texture[] {
    const shapes = this.contacts[color];
    if (!shapes) throw new RangeError(`no koi contact for color ${color}`);
    return shapes;
  }

  /** A color's beat, every other pose, with the poses between them put in their places. */
  private interleave(color: PieceColor, between: readonly Texture[]): void {
    const poses = this.poses[color];
    if (!poses || poses.length >= this.bake.frames) return;
    const all = poses.flatMap((pose, k) => [pose, between[k]]);
    poses.splice(0, poses.length, ...all.filter((pose) => pose !== undefined));
  }
}

/**
 * Pose `pose` of a tail beat, on its own canvas: pose i swings the tail by sin(2 PI i / frames), so the poses loop
 * smoothly. `dress` gives a special koi its look (see specialKoi).
 */
export function bakePose(
  varietyId: string,
  bake: KoiBake,
  pose: number,
  dress?: Dressing,
): HTMLCanvasElement {
  return bakeInkedKoi(
    getVariety(varietyId),
    { ...stillPose(bake), tailWag: tailWag(pose / bake.frames, bake) },
    bake.ink,
    dress,
  );
}

/** Contact shapes through the tail beat, so the foam follows the body as it bends. */
function bakeContacts(varietyId: string, bake: KoiBake): Texture[] {
  return Array.from({ length: bake.contactFrames }, (_, i) =>
    Texture.from(bakeContact(varietyId, bake, tailWag(i / bake.contactFrames, bake))),
  );
}

/** The contact shape of one pose (see bakeKoiContact), at the contact's own resolution. */
export function bakeContact(varietyId: string, bake: KoiBake, wag: number): HTMLCanvasElement {
  const pose = { ...stillPose(bake), resolution: bake.contactResolution, tailWag: wag };
  return bakeKoiContact(getVariety(varietyId), pose, bake.contact);
}

/** How far the tail swings (koiBank's tailWag) at a place in the beat (0..1). */
export function tailWag(beat: number, bake: KoiBake): number {
  return Math.sin(beat * Math.PI * 2) * bake.tailSwing;
}

/** The straight pose, with no shadow: the shadow is its own sprite on the pond bottom. */
export function stillPose(bake: KoiBake): BakeOptions {
  return { size: bake.size, resolution: bake.resolution, build: bake.build, shadow: false };
}

/**
 * A painted koi's silhouette in white, blurred, on a canvas padded so the blur isn't cut off: its shadow on the pond
 * bottom, tinted by the sprite.
 */
export function bakeShadow(koi: HTMLCanvasElement, bake: KoiBake): Texture {
  const blurPx = bake.shadowBlur * bake.resolution;
  const pad = blurPx * 2;
  const canvas = blank(koi.width + pad * 2, koi.height + pad * 2);
  drawBlurred(context(canvas), koi, [pad, pad], blurPx, '#fff');
  return Texture.from(canvas);
}
