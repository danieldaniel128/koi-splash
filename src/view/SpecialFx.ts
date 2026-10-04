import { gsap } from 'gsap';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { PointData } from 'pixi.js';
import { paintBeam, SPECTRUM } from '../art/specialKoi';
import { SPECIAL_FX } from '../config/specials';
import { TIMING } from '../config/timing';
import type { Cell, Fired, Kind } from '../model/types';
import type { BlastPlan } from './specialTiming';
import type { SpecialTextures } from './SpecialTextures';
import { hitStop } from './hitStop';
import type { WaterSurface } from './water/PondWater';

/** What the effects need from the board: where its cells are, and how big it is (board space). */
export interface FxBoard {
  readonly x: number;
  readonly y: number;
  cellToPoint(cell: Cell): PointData;
}

/**
 * The specials' light, over the koi in the board's space (after the prototype's): a striped koi's beam racing along
 * its line, a whirlpool's vortex spinning up, a rainbow koi's prism beams arcing to every koi it takes, a flash when
 * a special is born. Each also moves the water (ripples along the sweep, the eddy's pull and pop, splashes where the
 * beams land) and the big moments slow the game's clock for an instant (hit-stop). Fire and forget: every effect
 * removes itself when done.
 */
export class SpecialFx extends Container {
  private readonly beamTexture = Texture.from(paintBeam(128, 32));

  constructor(
    private readonly board: FxBoard,
    private readonly textures: SpecialTextures,
    private readonly water: WaterSurface,
    private readonly cell: number,
    private readonly length: number,
  ) {
    super();
  }

  /** A special was born at `at`: a flash of its glow and a ring in the water, `delay` s from now. */
  birth(at: Cell, kind: Kind, delay: number): void {
    const look = SPECIAL_FX.birth;
    const flash = this.additive(this.textures.glow, this.textures.color(kind).glow);
    flash.position.copyFrom(this.board.cellToPoint(at));
    flash.alpha = 0;
    gsap
      .timeline({
        delay,
        onComplete: () => {
          flash.destroy();
        },
      })
      .call(() => {
        this.splash(at, look.push, look.pushRadius);
      })
      .fromTo(flash, { alpha: 1 }, { alpha: 0, duration: look.life, ease: 'power2.out' }, 0)
      .fromTo(
        flash,
        { width: this.cell * 0.4, height: this.cell * 0.4 },
        { width: this.cell * look.flash, height: this.cell * look.flash, duration: look.life },
        0,
      );
  }

  /** A special fires (see planRound): its own effect, at its own time. */
  fire(blast: BlastPlan): void {
    const type = blast.fired.piece.special?.type;
    if (type === 'line') this.beam(blast);
    else if (type === 'whirl') this.vortex(blast);
    else if (type === 'rainbow') this.prism(blast);
  }

  /** A beam of the koi's colour races along its row or column, and the water ripples as the sweep passes. */
  private beam({ fired, at }: BlastPlan): void {
    const look = SPECIAL_FX.beam;
    const beam = this.additive(this.beamTexture, this.textures.color(fired.piece.kind).glow);
    beam.position.copyFrom(this.board.cellToPoint(fired.at));
    beam.rotation =
      fired.piece.special?.type === 'line' && fired.piece.special.along === 'col' ? Math.PI / 2 : 0;
    beam.alpha = 0;
    const grow = { k: 0 };
    gsap.to(grow, {
      k: 1,
      delay: at,
      duration: look.life,
      ease: 'none',
      onUpdate: () => {
        const reach = Math.min(1, 2.2 * grow.k);
        beam.width = this.length * look.length * (1 - Math.pow(1 - reach, 3)) + this.cell;
        beam.height = this.cell * look.width * (1 - 0.6 * grow.k);
        beam.alpha = 1 - grow.k;
      },
      onComplete: () => {
        beam.destroy();
      },
    });
    for (const cell of fired.reach) {
      const steps = Math.abs(cell.col - fired.at.col) + Math.abs(cell.row - fired.at.row);
      gsap.delayedCall(at + steps * TIMING.specials.sweep, () => {
        this.splash(cell, look.push, look.pushRadius);
      });
    }
  }

  /** The whirlpool's eddy grows and spins up, pulling at the water, then pops with a big ring and a hit-stop. */
  private vortex({ fired, at }: BlastPlan): void {
    const look = SPECIAL_FX.vortex;
    const { whirlSpin, whirlPull, whirlCorner } = TIMING.specials;
    const stay = whirlSpin + whirlCorner + whirlPull;
    const eddy = new Sprite(this.textures.eddy(fired.piece.kind));
    eddy.anchor.set(0.5);
    eddy.position.copyFrom(this.board.cellToPoint(fired.at));
    eddy.alpha = 0;
    this.addChild(eddy);
    const time = { t: 0 };
    gsap.to(time, {
      t: stay + look.fade,
      delay: at,
      duration: stay + look.fade,
      ease: 'none',
      onStart: () => {
        this.splash(fired.at, look.pull, look.popRadius);
      },
      onUpdate: () => {
        const grow = easeOutBack(Math.min(1, time.t / whirlSpin));
        const out = Math.max(0, (time.t - stay) / look.fade);
        eddy.setSize(this.cell * (look.from + (look.to - look.from) * grow) * (1 + 0.2 * out));
        eddy.rotation = spinAngle(time.t, whirlSpin, look.spin0, look.spinMax);
        eddy.alpha = 1 - out * out;
      },
      onComplete: () => {
        eddy.destroy();
      },
    });
    gsap.delayedCall(at + stay, () => {
      this.splash(fired.at, look.pop, look.popRadius);
      hitStop(SPECIAL_FX.hitStop.time, SPECIAL_FX.hitStop.scale);
    });
  }

  /** Prism beams arc from the rainbow koi to every koi it takes, nearest first, each in a colour of the spectrum. */
  private prism({ fired, at }: BlastPlan): void {
    const { rainbowRise, rainbowStep } = TIMING.specials;
    gsap.delayedCall(at + rainbowRise, () => {
      hitStop(SPECIAL_FX.hitStop.time, SPECIAL_FX.hitStop.scale);
    });
    fired.reach.forEach((cell, n) => {
      this.arc(fired, cell, n, at + rainbowRise + n * rainbowStep);
    });
  }

  /** One prism beam: a bowed curve whose head shoots to the target, then whose tail draws in after it. */
  private arc(fired: Fired, target: Cell, n: number, delay: number): void {
    const look = SPECIAL_FX.prism;
    const travel = TIMING.specials.rainbowTravel;
    const from = this.board.cellToPoint(fired.at);
    const to = this.board.cellToPoint(target);
    const side = n % 2 === 0 ? 1 : -1;
    const bow = look.bend * Math.hypot(to.x - from.x, to.y - from.y) * side * (0.6 + 0.4 * ((n * 0.37) % 1));
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const control = {
      x: mid.x - ((to.y - from.y) / length) * bow,
      y: mid.y + ((to.x - from.x) / length) * bow,
    };
    const colour = SPECTRUM[n % SPECTRUM.length] ?? '#ffffff';
    const line = new Graphics();
    line.blendMode = 'add';
    this.addChild(line);
    const life = { t: 0 };
    gsap.to(life, {
      t: look.life,
      delay,
      duration: look.life,
      ease: 'none',
      onUpdate: () => {
        const head = 1 - Math.pow(1 - Math.min(1, life.t / travel), 3);
        const tail = easeInOut(Math.max(0, (life.t - travel) / (look.life - travel)));
        drawArc(line, { from, control, to }, tail, head, colour);
      },
      onComplete: () => {
        line.destroy();
      },
    });
    gsap.delayedCall(delay + travel, () => {
      this.splash(target, look.push, look.pushRadius);
    });
  }

  private splash(at: Cell, strength: number, radius: number): void {
    const point = this.board.cellToPoint(at);
    this.water.push({ x: this.board.x + point.x, y: this.board.y + point.y }, strength, radius);
  }

  private additive(texture: Texture, tint: string): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.tint = tint;
    this.addChild(sprite);
    return sprite;
  }
}

/** The part of a quadratic curve between t0 and t1, stroked three times: a wide soft glow, a colour core, a white heart. */
function drawArc(line: Graphics, curve: Curve, t0: number, t1: number, colour: string): void {
  const look = SPECIAL_FX.prism;
  const fade = 1 - 0.5 * t0;
  const samples = 14;
  line.clear();
  look.widths.forEach((width, i) => {
    for (let s = 0; s <= samples; s++) {
      const { x, y } = pointOn(curve, t0 + ((t1 - t0) * s) / samples);
      if (s === 0) line.moveTo(x, y);
      else line.lineTo(x, y);
    }
    const color = i === look.widths.length - 1 ? '#ffffff' : colour;
    line.stroke({ width, color, alpha: (look.alphas[i] ?? 1) * fade, cap: 'round', join: 'round' });
  });
}

/** A quadratic curve: start, control and end. */
interface Curve {
  readonly from: PointData;
  readonly control: PointData;
  readonly to: PointData;
}

function pointOn({ from, control, to }: Curve, t: number): PointData {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/** The vortex's turn at time t: it spins up from spin0 to spinMax over `rampUp`, then keeps turning at spinMax. */
function spinAngle(t: number, rampUp: number, spin0: number, spinMax: number): number {
  const extra = spinMax - spin0;
  return spin0 * t + (t < rampUp ? (extra * t * t) / (2 * rampUp) : extra * (t - rampUp / 2));
}

function easeOutBack(t: number): number {
  const c = 1.9;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
