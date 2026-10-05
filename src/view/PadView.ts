import { gsap } from 'gsap';
import { Container, Sprite, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { bakeLotusPad, bakeProp } from '../art/pondProps';
import type { PropLook } from '../art/pondProps';
import { BOARD_PADS } from '../config/pond';
import type { PadDisplay } from '../game/GameScene';
import type { Cell, Pad, PadEvent } from '../model/types';
import type { Circle, WaterSurface } from './water/PondWater';

/** The water the pads float on: they push it, and it outlines them with foam (see PondWater.float). */
export interface PadWater extends WaterSurface {
  float(circles: readonly Circle[]): void;
}

/** Where the view sits and where a bloomed lotus flies to, in the view's own space. */
export interface PadViewLayout {
  readonly cellSize: number;
  /** The lotus goal's chip, asked as each lotus takes off (the HUD may have changed since the game started). */
  readonly goalTarget: () => PointData;
  /** Turns a point in this view's space into a stage point, for pushing the water. */
  readonly toStage: (point: PointData) => PointData;
}

/**
 * The lily pads on the board, each centred on the cell it takes (no koi can be there). Plays what the model reports:
 * a hit opens a bud one stage, a bloom lifts the lotus and flies it to the goal, an empty pad drifts away. Every
 * frame it tells the water where the pads float, so the pond's shore foam outlines them like its own pads.
 */
export class PadView extends Container implements PadDisplay {
  private readonly sprites = new Map<number, Sprite>();
  /** Every pad sprite still on the water, including ones blooming or drifting away (until they are gone). */
  private readonly floating = new Set<Sprite>();
  /** The lotuses lifting out of the water to bloom: only they let go of the foam as they grow (not a hit's pop). */
  private readonly blooming = new Set<Sprite>();
  private readonly looks: readonly PadLook[];
  /** Each pad's look, by pad id. */
  private readonly lookOf = new Map<number, PadLook>();
  /** The pad textures are baked at the screen's resolution; this scales them back to stage px. */
  private readonly scaleOf: number;
  private time = 0;

  constructor(
    private readonly layout: PadViewLayout,
    private readonly water: PadWater,
    paint: { readonly resolution: number; readonly look: PropLook },
  ) {
    super();
    const { resolution, look } = paint;
    this.looks = Array.from({ length: BOARD_PADS.looks }, (_, k) =>
      bakePadLook(layout.cellSize * BOARD_PADS.radius, k, resolution, look),
    );
    this.scaleOf = 1 / resolution;
  }

  /** Puts the level's pads on the board, replacing any from a previous game. */
  reset(pads: readonly Pad[]): void {
    for (const sprite of this.floating) this.remove(sprite);
    this.sprites.clear();
    this.lookOf.clear();
    for (const pad of pads) {
      // a look of its own (its leaf and lotus turned): the sprite itself never turns, so its light stays the moon's
      const look = this.looks[Math.floor(Math.random() * this.looks.length)];
      if (look) this.lookOf.set(pad.id, look);
      const sprite = new Sprite(pad.kind === 'bud' ? this.stageFor(pad) : (look ?? this.anyLook()).empty);
      sprite.anchor.set(0.5);
      sprite.scale.set(this.scaleOf);
      const { cellSize } = this.layout;
      sprite.position.set((pad.at.col + 0.5) * cellSize, (pad.at.row + 0.5) * cellSize); // centred on its cell
      this.sprites.set(pad.id, sprite);
      this.floating.add(sprite);
      this.addChild(sprite);
    }
  }

  /** Plays one cascade round's pad events together; resolves when the last one has finished. */
  async play(events: readonly PadEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.playEvent(event)));
  }

  /** A koi bumped into the pad on this cell: it rocks and settles. */
  async nudge(cell: Cell): Promise<void> {
    const sprite = this.spriteAt(cell);
    if (!sprite) return;
    const rest = sprite.rotation;
    await gsap
      .timeline()
      .to(sprite, {
        rotation: rest + BOARD_PADS.nudgeTurn,
        duration: BOARD_PADS.nudgeTime * 0.2,
        ease: 'power2.out',
      })
      .to(sprite, { rotation: rest, duration: BOARD_PADS.nudgeTime * 0.8, ease: 'elastic.out(1, 0.4)' });
  }

  /** The pads rock gently on the water, and the foam follows them. Call once per frame. O(P), P = pads. */
  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    let i = 0;
    for (const sprite of this.sprites.values()) {
      sprite.skew.set(Math.sin(this.time * BOARD_PADS.rockSpeed + i) * BOARD_PADS.rock, 0);
      i++;
    }
    this.water.float([...this.floating].map((sprite) => this.waterline(sprite)));
  }

  private async playEvent(event: PadEvent): Promise<void> {
    const sprite = this.sprites.get(event.pad.id);
    if (!sprite) return;
    if (event.type === 'hit') await this.hit(sprite, event.pad);
    else if (event.type === 'bloom') await this.bloom(sprite, event.pad);
    else await this.drift(sprite, event.pad);
  }

  private async hit(sprite: Sprite, pad: Pad): Promise<void> {
    if (pad.kind === 'bud') sprite.texture = this.stageFor(pad);
    this.push(sprite, BOARD_PADS.hitPush);
    const base = this.scaleOf;
    await gsap.fromTo(
      sprite.scale,
      { x: base * BOARD_PADS.hitPop, y: base * BOARD_PADS.hitPop },
      { x: base, y: base, duration: BOARD_PADS.hitTime, ease: 'back.out(3)' },
    );
  }

  /** The signature moment: the lotus opens fully, rises out of the water, holds, then flies to the goal. */
  private async bloom(sprite: Sprite, pad: Pad): Promise<void> {
    sprite.texture = this.stageFor(pad);
    this.sprites.delete(pad.id);
    this.blooming.add(sprite);
    this.push(sprite, BOARD_PADS.bloomPush);
    const lifted = this.scaleOf * BOARD_PADS.bloomLift;
    await gsap.to(sprite.scale, {
      x: lifted,
      y: lifted,
      duration: BOARD_PADS.bloomRise,
      ease: 'back.out(2)',
    });
    const { x, y } = this.layout.goalTarget();
    await gsap.to(sprite, {
      x,
      y,
      alpha: 0.6,
      delay: BOARD_PADS.bloomHold,
      duration: BOARD_PADS.flyTime,
      ease: 'power2.in',
    });
    this.remove(sprite);
  }

  private async drift(sprite: Sprite, pad: Pad): Promise<void> {
    this.sprites.delete(pad.id);
    this.push(sprite, BOARD_PADS.hitPush);
    const away = Math.random() * Math.PI * 2;
    await gsap.to(sprite, {
      x: sprite.x + Math.cos(away) * BOARD_PADS.driftDistance,
      y: sprite.y + Math.sin(away) * BOARD_PADS.driftDistance,
      rotation: sprite.rotation + 0.8,
      alpha: 0,
      duration: BOARD_PADS.driftTime,
      ease: 'sine.out',
    });
    this.remove(sprite);
  }

  /**
   * Where a pad meets the water, in stage px. A blooming lotus lifts out (its scale grows past the resting one) and
   * a drifting pad fades, so the foam closes in on them and the shallows round them fade as they go; a hit's pop
   * leaves them as they are.
   */
  private waterline(sprite: Sprite): Circle {
    const lift = this.blooming.has(sprite) ? Math.max(0, sprite.scale.x / this.scaleOf - 1) : 0;
    const floats = Math.max(0, 1 - lift * BOARD_PADS.foamLetGo) * sprite.alpha;
    const { x, y } = this.layout.toStage(sprite.position);
    const radius = this.layout.cellSize * BOARD_PADS.radius * BOARD_PADS.foamFit * floats;
    return { x, y, radius, afloat: floats };
  }

  private remove(sprite: Sprite): void {
    this.floating.delete(sprite);
    this.blooming.delete(sprite);
    sprite.destroy();
  }

  private spriteAt(cell: Cell): Sprite | undefined {
    const { cellSize } = this.layout;
    for (const sprite of this.sprites.values()) {
      if (Math.floor(sprite.x / cellSize) === cell.col && Math.floor(sprite.y / cellSize) === cell.row)
        return sprite;
    }
    return undefined;
  }

  /** The baked stage of its look that matches how far a bud has opened (hits taken / hits needed). */
  private stageFor(pad: Pad): Texture {
    const { stages } = this.lookOf.get(pad.id) ?? this.anyLook();
    const opened = (pad.hitsNeeded - pad.hitsLeft) / pad.hitsNeeded;
    const stage = Math.round(opened * (stages.length - 1));
    const texture = stages[stage];
    if (!texture) throw new RangeError(`no bud stage ${stage}`);
    return texture;
  }

  private anyLook(): PadLook {
    const [look] = this.looks;
    if (!look) throw new Error('no lily pad looks (BOARD_PADS.looks)');
    return look;
  }

  private push(sprite: Sprite, strength: number): void {
    this.water.push(this.layout.toStage(sprite.position), strength, BOARD_PADS.pushRadius);
  }
}

/** One look of a lily pad: a bud's opening stages, closed to full bloom, and the pad on its own. */
interface PadLook {
  readonly stages: readonly Texture[];
  readonly empty: Texture;
}

/**
 * Look `k` of a lily pad of this radius: its own seed turns the leaf's notch and the lotus, while the shadow and the
 * moonlit rim stay where the moon puts them. O(stages) canvas paints, once at startup.
 */
function bakePadLook(radius: number, k: number, resolution: number, look: PropLook): PadLook {
  const { stages, lotusSeed, emptySeed } = BOARD_PADS;
  return {
    stages: Array.from({ length: stages }, (_, i) =>
      Texture.from(bakeLotusPad(radius, i / (stages - 1), lotusSeed + k, resolution, look)),
    ),
    empty: Texture.from(
      bakeProp({ kind: 'pad', radius: [radius, radius], seed: emptySeed + k }, resolution, look),
    ),
  };
}
