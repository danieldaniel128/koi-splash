import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import type { BoosterType, BoosterUse } from '../model/boosters';
import type { Cell, Special } from '../model/types';
import { sameCell } from '../model/types';

/** What the boosters need from the game: whether the board is still, what a booster can take, and to use one. */
export interface BoosterGame {
  readonly canBoost: boolean;
  canTarget(type: BoosterType, cell: Cell): boolean;
  useBooster(use: BoosterUse): Promise<boolean>;
}

/** The booster bar: which booster is armed, how many of each are left, and a shake for "not now". */
export interface BoosterButtons {
  setArmed(type: BoosterType | null): void;
  setLeft(type: BoosterType, left: number): void;
  nope(type: BoosterType): void;
}

/** The pill that says what to do while a booster is armed, with its own shake for a tap it can't take. */
export interface BoosterPill {
  show(tip: string): void;
  hide(): void;
  nope(): void;
}

/** The board's answer: which koi the armed booster can take, the picked koi lifting, a koi wobbling at a wrong tap. */
export interface BoosterMarks {
  show(test: ((cell: Cell) => boolean) | null): void;
  lift(cell: Cell | null): void;
  shake(cell: Cell): void;
}

/** The special the player picks for a koi: petals open round it; null when they tap away (or it's closed). */
export interface SpecialPicker {
  pick(at: Cell): Promise<Special['type'] | null>;
  close(): void;
}

/** What the player hears as they use the boosters. */
export interface BoosterSounds {
  arm(type: BoosterType): void;
  cancel(): void;
  wrong(): void;
  lift(): void;
}

/** One booster on the bar: how many the level gives, and the pill's tip. */
export interface BoosterSlot {
  readonly type: BoosterType;
  readonly count: number;
  readonly tip: string;
}

type Step = 'idle' | 'armed' | 'picked' | 'choosing' | 'playing';

/** What the steps' guards read. */
interface Arming {
  type: BoosterType | null;
  picked: Cell | null;
}

/**
 * The flow of using a booster: armed / picking / choosing / playing, with guarded transitions. A swap picks its
 * second koi after the first; a special opens the petal menu first.
 */
const STEPS: readonly Transition<Step, Arming>[] = [
  { from: 'idle', to: 'armed' },
  { from: 'armed', to: 'armed' }, // another booster's button: it takes over
  { from: 'armed', to: 'idle' },
  { from: 'armed', to: 'picked', when: (arming) => arming.type === 'swap' },
  { from: 'armed', to: 'choosing', when: (arming) => arming.type === 'special' },
  { from: 'armed', to: 'playing' },
  { from: 'picked', to: 'armed' }, // the picked koi tapped again: it settles back
  { from: 'picked', to: 'idle' },
  { from: 'picked', to: 'playing' },
  { from: 'choosing', to: 'armed' }, // tapped away from the petals: still armed
  { from: 'choosing', to: 'idle' },
  { from: 'choosing', to: 'playing' },
  { from: 'playing', to: 'idle' },
];

/**
 * The boosters' presenter, after the prototype: a button arms its booster (again, or the pill's X, cancels it at no
 * cost), the pond shows what it can take, and taps on the board go to it instead of the swipe. Swap picks two koi,
 * near or far; Feed takes a colour; Special opens petals to choose what the koi becomes. Each is free and limited per
 * level; none costs a move. Views and sounds are injected; the rules stay in the model (via BoosterGame).
 */
export class BoosterControl {
  private readonly left = new Map<BoosterType, number>();
  private readonly tips = new Map<BoosterType, string>();
  private readonly arming: Arming = { type: null, picked: null };
  private readonly step: StateMachine<Step, Arming>;

  constructor(
    private readonly deps: {
      readonly game: BoosterGame;
      readonly buttons: BoosterButtons;
      readonly pill: BoosterPill;
      readonly marks: BoosterMarks;
      readonly picker: SpecialPicker;
      readonly sounds: BoosterSounds;
      readonly slots: readonly BoosterSlot[];
      /** How far a feed reaches (lines of 3), and a coin toss for a striped koi's line. */
      readonly feedLines: number;
      readonly random: () => number;
    },
  ) {
    this.step = new StateMachine<Step, Arming>('idle', STEPS, this.arming);
    this.reset();
  }

  /** True while a booster is armed: board taps go here, and swipes are ignored. */
  get armed(): boolean {
    return !this.step.is('idle') && !this.step.is('playing');
  }

  /** A new level: every booster back to its count, nothing armed. */
  reset(): void {
    for (const slot of this.deps.slots) {
      this.left.set(slot.type, slot.count);
      this.tips.set(slot.type, slot.tip);
      this.deps.buttons.setLeft(slot.type, slot.count);
    }
    if (this.armed) this.disarm();
  }

  /** A booster's button: arms it, or cancels it when it's the one armed. */
  press(type: BoosterType): void {
    if (this.arming.type === type && this.armed) {
      this.cancel();
      return;
    }
    if ((this.left.get(type) ?? 0) <= 0 || !this.deps.game.canBoost || this.step.is('playing')) {
      this.deps.buttons.nope(type);
      this.deps.sounds.wrong();
      return;
    }
    this.arming.type = type;
    this.arming.picked = null;
    this.step.transition('armed');
    this.deps.buttons.setArmed(type);
    this.deps.pill.show(this.tips.get(type) ?? '');
    this.deps.marks.lift(null);
    this.deps.marks.show((cell) => this.deps.game.canTarget(type, cell) && !this.isPicked(cell));
    this.deps.sounds.arm(type);
  }

  /** Cancels the armed booster at no cost (its button again, the pill's X). */
  cancel(): void {
    if (!this.armed) return;
    this.disarm();
    this.deps.sounds.cancel();
  }

  /** A tap on the board while a booster is armed. */
  tap(cell: Cell): void {
    const type = this.arming.type;
    if (!type || !(this.step.is('armed') || this.step.is('picked'))) return;
    if (this.isPicked(cell)) {
      this.arming.picked = null; // the picked koi again: it settles back
      this.step.transition('armed');
      this.deps.marks.lift(null);
      return;
    }
    if (!this.deps.game.canTarget(type, cell)) {
      this.deps.marks.shake(cell);
      this.deps.pill.nope();
      this.deps.sounds.wrong();
      return;
    }
    if (type === 'swap') this.swapPick(cell);
    else if (type === 'feed') void this.use({ type: 'feed', at: cell, lines: this.deps.feedLines });
    else void this.choose(cell);
  }

  /** Swap: the first koi lifts; the second leaps with it. */
  private swapPick(cell: Cell): void {
    const first = this.arming.picked;
    if (!first) {
      this.arming.picked = cell;
      this.step.transition('picked');
      this.deps.marks.lift(cell);
      this.deps.sounds.lift();
      return;
    }
    void this.use({ type: 'swap', a: first, b: cell });
  }

  /** Special: petals open round the koi; the one chosen is what it becomes. */
  private async choose(cell: Cell): Promise<void> {
    this.step.transition('choosing');
    this.deps.marks.lift(cell);
    this.deps.sounds.lift();
    const choice = await this.deps.picker.pick(cell);
    if (!this.step.is('choosing')) return; // cancelled while the petals were open
    if (!choice) {
      this.step.transition('armed'); // tapped away: still armed, pick another koi
      this.deps.marks.lift(null);
      this.deps.sounds.cancel();
      return;
    }
    const along = this.deps.random() < 0.5 ? 'row' : 'col'; // as in the prototype, a striped koi's line is a toss
    const special: Special = choice === 'line' ? { type: 'line', along } : { type: choice };
    await this.use({ type: 'special', at: cell, special });
  }

  /** Spends the armed booster: the marks go, the board plays it, then it's ready for the next. */
  private async use(use: BoosterUse): Promise<void> {
    const type = use.type;
    this.step.transition('playing');
    this.deps.marks.show(null);
    this.deps.pill.hide();
    this.deps.buttons.setArmed(null);
    const used = await this.deps.game.useBooster(use);
    if (used) {
      const left = (this.left.get(type) ?? 1) - 1;
      this.left.set(type, left);
      this.deps.buttons.setLeft(type, left);
    }
    this.arming.type = null;
    this.arming.picked = null;
    this.step.transition('idle');
  }

  private disarm(): void {
    const choosing = this.step.is('choosing');
    this.arming.type = null;
    this.arming.picked = null;
    this.step.transition('idle');
    if (choosing) this.deps.picker.close();
    this.deps.buttons.setArmed(null);
    this.deps.pill.hide();
    this.deps.marks.show(null);
  }

  private isPicked(cell: Cell): boolean {
    return !!this.arming.picked && sameCell(this.arming.picked, cell);
  }
}
