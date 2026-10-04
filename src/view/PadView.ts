import { gsap } from 'gsap';
import { Container, Sprite, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { bakeLotusPad, bakeProp } from '../art/pondProps';
import { BOARD_PADS } from '../config/pond';
import type { Pad, PadEvent } from '../model/pads';
import type { WaterSurface } from './water/PondWater';

/** Where the view sits and where a bloomed lotus flies to, in the view's own space. */
export interface PadViewLayout {
  readonly cellSize: number;
  readonly goalTarget: PointData;
  /** Turns a point in this view's space into a stage point, for pushing the water. */
  readonly toStage: (point: PointData) => PointData;
}

/**
 * The lily pads on the board, each centred on the cell it takes (no koi can be there). Plays what the model reports:
 * a hit opens a bud one stage, a bloom lifts the lotus and flies it to the goal, an empty pad drifts away.
 */
export class PadView extends Container {
  private readonly sprites = new Map<number, Sprite>();
  private readonly budStages: Texture[];
  private readonly emptyPad: Texture;
  /** The pad textures are baked at the screen's resolution; this scales them back to stage px. */
  private readonly scaleOf: number;
  private time = 0;

  constructor(
    private readonly layout: PadViewLayout,
    private readonly water: WaterSurface,
    resolution: number,
  ) {
    super();
    const radius = layout.cellSize * BOARD_PADS.radius;
    // O(stages) canvas paints, once at startup
    this.budStages = Array.from({ length: BOARD_PADS.stages }, (_, i) =>
      Texture.from(bakeLotusPad(radius, i / (BOARD_PADS.stages - 1), 7, resolution)),
    );
    this.emptyPad = Texture.from(bakeProp({ kind: 'pad', radius: [radius, radius], seed: 11 }, resolution));
    this.scaleOf = 1 / resolution;
  }

  /** Puts the level's pads on the board, replacing any from a previous game. */
  reset(pads: readonly Pad[]): void {
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    for (const pad of pads) {
      const sprite = new Sprite(pad.kind === 'bud' ? this.stageFor(pad) : this.emptyPad);
      sprite.anchor.set(0.5);
      sprite.scale.set(this.scaleOf);
      const { cellSize } = this.layout;
      sprite.position.set((pad.at.col + 0.5) * cellSize, (pad.at.row + 0.5) * cellSize); // centred on its cell
      sprite.rotation = Math.random() * Math.PI * 2;
      this.sprites.set(pad.id, sprite);
      this.addChild(sprite);
    }
  }

  /** Plays one cascade round's pad events together; resolves when the last one has finished. */
  async play(events: readonly PadEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.playEvent(event)));
  }

  /** The pads rock gently on the water. Call once per frame. O(P), P = pads. */
  tick(deltaSeconds: number): void {
    this.time += deltaSeconds;
    let i = 0;
    for (const sprite of this.sprites.values()) {
      sprite.skew.set(Math.sin(this.time * BOARD_PADS.rockSpeed + i) * BOARD_PADS.rock, 0);
      i++;
    }
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
    this.push(sprite, BOARD_PADS.bloomPush);
    const lifted = this.scaleOf * BOARD_PADS.bloomLift;
    await gsap.to(sprite.scale, {
      x: lifted,
      y: lifted,
      duration: BOARD_PADS.bloomRise,
      ease: 'back.out(2)',
    });
    const { x, y } = this.layout.goalTarget;
    await gsap.to(sprite, {
      x,
      y,
      alpha: 0.6,
      delay: BOARD_PADS.bloomHold,
      duration: BOARD_PADS.flyTime,
      ease: 'power2.in',
    });
    sprite.destroy();
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
    sprite.destroy();
  }

  /** The baked stage that matches how far a bud has opened (hits taken / hits needed). */
  private stageFor(pad: Pad): Texture {
    const opened = (pad.hitsNeeded - pad.hitsLeft) / pad.hitsNeeded;
    const stage = Math.round(opened * (this.budStages.length - 1));
    const texture = this.budStages[stage];
    if (!texture) throw new RangeError(`no bud stage ${stage}`);
    return texture;
  }

  private push(sprite: Sprite, strength: number): void {
    this.water.push(this.layout.toStage(sprite.position), strength, BOARD_PADS.pushRadius);
  }
}
