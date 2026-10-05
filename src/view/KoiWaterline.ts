import { Container, Point, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { WATER } from '../config/water';
import type { Koi } from './Koi';
import type { KoiTextures } from './KoiTextures';

/** What one koi casts into the water around it. */
interface Marks {
  readonly shadow: Sprite;
  readonly contact: Sprite;
  /** The contact shapes, one per pose. */
  readonly contactPoses: readonly Texture[];
  /** Where the koi was last frame, to tell how fast it moves. */
  readonly last: Point;
}

/**
 * Sets the koi in the water: what each koi casts around it, following it every frame.
 * - `shadows`: a soft shadow on the pond bottom, offset away from the moon
 * - `contacts`: where the koi breaks the surface, never shown; the pond draws them into a mask each frame and puts
 *   foam along that waterline (see KoiContact)
 * The shadows go under the koi on the board, the contacts to the pond.
 */
export class KoiWaterline {
  readonly shadows = new Container();
  readonly contacts = new Container();
  private readonly marks = new Map<Koi, Marks>();
  constructor(private readonly textures: KoiTextures) {}

  /** Starts casting a koi's marks into the water. */
  add(koi: Koi): void {
    const shadow = centred(this.textures.shadow(koi.kind));
    shadow.tint = WATER.shadowColor;
    const contactPoses = this.textures.contact(koi.kind);
    const contact = new Sprite(contactPoses[0]);
    contact.anchor.set(0.5);
    this.marks.set(koi, { shadow, contact, contactPoses, last: new Point(NaN, NaN) });
    this.shadows.addChild(shadow);
    this.contacts.addChild(contact);
  }

  remove(koi: Koi): void {
    const marks = this.marks.get(koi);
    if (!marks) return;
    for (const sprite of [marks.shadow, marks.contact]) sprite.destroy();
    this.marks.delete(koi);
  }

  /** Every mark follows its koi. Call once per frame after the koi have moved, before the pond draws. O(K). */
  follow(deltaSeconds: number): void {
    for (const [koi, marks] of this.marks) {
      const lift = Math.max(1, koi.scale.x / koi.restScale);
      this.followShadow(koi, marks.shadow, lift);
      this.followContact(koi, marks, deltaSeconds, lift);
    }
  }

  /** Same turn, scale and fade as its koi, offset away from the moon: further for a koi lifted toward the surface. */
  private followShadow(koi: Koi, shadow: Sprite, lift: number): void {
    const [offsetX, offsetY] = WATER.shadowOffset;
    const reach = 1 + (lift - 1) * WATER.shadowLiftReach;
    shadow.position.set(koi.x + offsetX * reach, koi.y + offsetY * reach);
    shadow.scale.copyFrom(koi.scale); // same pixel density as the koi texture, the extra canvas is blur room
    shadow.rotation = koi.rotation;
    shadow.alpha = koi.alpha * WATER.shadowAlpha;
  }

  /**
   * The contact shape takes the koi's pose, place and turn, and carries in its tint how much foam the koi makes:
   * red, the koi is at the surface (it fades as the koi dives); blue, the koi stirs the water (moving, or lifted
   * while swapping).
   */
  private followContact(koi: Koi, marks: Marks, deltaSeconds: number, lift: number): void {
    const { contact, last } = marks;
    const moved = Number.isNaN(last.x) ? 0 : Math.hypot(koi.x - last.x, koi.y - last.y);
    last.copyFrom(koi.position);
    const stir = Math.max(
      moved / Math.max(deltaSeconds, 1e-3) / WATER.contactStirSpeed,
      (lift - 1) * WATER.contactLiftStir,
    );
    contact.texture = marks.contactPoses[koi.pose] ?? contact.texture;
    contact.position.copyFrom(koi.position);
    const coarse = this.textures.contactScale;
    contact.scale.set(koi.scale.x * coarse, koi.scale.y * coarse);
    contact.rotation = koi.rotation;
    contact.tint = contactTint(koi.alpha * koi.alpha, stir);
  }
}

function centred(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

/** A contact shape's tint: red = how much the koi is at the surface, blue = how much it stirs the water (0..1). */
function contactTint(atSurface: number, stir: number): number {
  const byte = (share: number): number => Math.round(Math.min(Math.max(share, 0), 1) * 255);
  return (byte(atSurface) << 16) | (0xff << 8) | byte(stir);
}
