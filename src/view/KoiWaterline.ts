import { Container, Point, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { WATER } from '../config/water';
import type { Koi } from './Koi';
import type { KoiTextures } from './KoiTextures';

/** What one koi casts into the water around it. */
interface Marks {
  readonly shadow: Sprite;
  readonly ripple: Sprite;
  readonly contact: Sprite;
  /** The contact shapes, one per pose. */
  readonly contactPoses: readonly Texture[];
  /** Where the koi was last frame (to tell how fast it moves), the tail beats seen, the ripple's age (s). */
  readonly last: Point;
  beats: number;
  rippleAge: number;
}

/**
 * Sets the koi in the water: what each koi casts around it, following it every frame.
 * - `shadows`: a soft shadow on the pond bottom, offset away from the moon
 * - `ripples`: each beat of a koi's tail sends a small ring of moonlight out from its shape, spreading and fading
 * - `contacts`: where the koi breaks the surface, never shown; the pond draws them into a mask each frame and puts
 *   foam along that waterline (see KoiContact)
 * The shadows and ripples go under the koi on the board, the contacts to the pond.
 */
export class KoiWaterline {
  readonly shadows = new Container();
  readonly ripples = new Container();
  readonly contacts = new Container();
  private readonly marks = new Map<Koi, Marks>();
  /** Contact and ripple shapes are baked coarser than the koi: their scale against the koi's. */
  private readonly coarse: number;

  constructor(private readonly textures: KoiTextures) {
    const [pose] = textures.swim(0);
    const [shape] = textures.contact(0);
    this.coarse = pose && shape ? pose.width / shape.width : 1;
  }

  /** Starts casting a koi's marks into the water. */
  add(koi: Koi): void {
    const shadow = centred(this.textures.shadow(koi.kind));
    shadow.tint = WATER.shadowColor;
    const ripple = centred(this.textures.ripple(koi.kind));
    ripple.tint = WATER.ripple;
    ripple.visible = false;
    const contactPoses = this.textures.contact(koi.kind);
    const contact = centred(contactPoses[0] ?? this.textures.ripple(koi.kind));
    this.marks.set(koi, {
      shadow,
      ripple,
      contact,
      contactPoses,
      last: new Point(NaN, NaN),
      beats: koi.beats,
      rippleAge: WATER.rippleLife,
    });
    this.shadows.addChild(shadow);
    this.ripples.addChild(ripple);
    this.contacts.addChild(contact);
  }

  remove(koi: Koi): void {
    const marks = this.marks.get(koi);
    if (!marks) return;
    for (const sprite of [marks.shadow, marks.ripple, marks.contact]) sprite.destroy();
    this.marks.delete(koi);
  }

  /** Every mark follows its koi. Call once per frame after the koi have moved, before the pond draws. O(K). */
  follow(deltaSeconds: number): void {
    for (const [koi, marks] of this.marks) {
      const lift = Math.max(1, koi.scale.x / koi.restScale);
      this.followShadow(koi, marks.shadow, lift);
      this.followRipple(koi, marks, deltaSeconds);
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
   * A new ripple on each tail beat (once the last one has mostly spread, so a fast-beating koi doesn't cut its own
   * rings short): it grows out from the koi's shape and fades.
   */
  private followRipple(koi: Koi, marks: Marks, deltaSeconds: number): void {
    marks.rippleAge += deltaSeconds;
    if (koi.beats !== marks.beats && marks.rippleAge > WATER.rippleLife * WATER.rippleRestart) {
      marks.rippleAge = 0;
    }
    marks.beats = koi.beats;
    const life = marks.rippleAge / WATER.rippleLife;
    const { ripple } = marks;
    ripple.visible = life < 1 && koi.alpha > 0.5;
    if (!ripple.visible) return;
    const grow = this.coarse * (1 + (WATER.rippleGrow - 1) * Math.sqrt(life));
    ripple.position.copyFrom(koi.position);
    ripple.scale.set(koi.scale.x * grow, koi.scale.y * grow);
    ripple.rotation = koi.rotation;
    ripple.alpha =
      WATER.rippleStrength * Math.min(life * WATER.rippleFadeIn, 1) * (1 - life) * (1 - life) * koi.alpha;
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
    contact.scale.set(koi.scale.x * this.coarse, koi.scale.y * this.coarse);
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
