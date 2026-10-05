import { StateMachine } from '../core/StateMachine';
import type { Transition } from '../core/StateMachine';
import { runDetached } from '../core/detached';
import type { BoosterSlot, BoosterType, BoosterUse } from '../model/boosters';
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
  /** `line` is the way a striped koi made here would sweep, already tossed, so its petal can show it. */
  pick(at: Cell, line: LineAlong): Promise<Special['type'] | null>;
  close(): void;
}

/** The way a striped koi's line sweeps: along its row or its column. */
type LineAlong = Extract<Special, { type: 'line' }>['along'];

/** What the player hears as they use the boosters. */
export interface BoosterSounds {
  arm(type: BoosterType): void;
  cancel(): void;
  wrong(): void;
  lift(): void;
  petals(): void;
}

/** The states of using a booster. */
export type BoosterState = 'idle' | 'armed' | 'picked' | 'choosing' | 'playing';

/** What the transitions' guards read: the armed booster, and the koi a swap picked first. */
export interface Arming {
  type: BoosterType | null;
  picked: Cell | null;
}

/** A guard that passes only while this booster is armed. */
const armedWith =
  (type: BoosterType) =>
  (arming: Arming): boolean =>
    arming.type === type;

/**
 * The flow of using a booster: armed / picking / choosing / playing, with guarded transitions. Each booster takes
 * only the transitions of its own flow: a swap picks its first koi and plays with the second, a special opens the petals
 * and plays the one chosen, a feed plays straight from its tap.
 */
export const BOOSTER_TRANSITIONS: readonly Transition<BoosterState, Arming>[] = [
  { from: 'idle', to: 'armed' },
  { from: 'armed', to: 'armed' }, // another booster's button: it takes over
  { from: 'armed', to: 'idle' },
  { from: 'armed', to: 'picked', when: armedWith('swap') },
  { from: 'armed', to: 'choosing', when: armedWith('special') },
  { from: 'armed', to: 'playing', when: armedWith('feed') },
  { from: 'picked', to: 'armed' }, // the picked koi tapped again (it settles back), or another booster's button
  { from: 'picked', to: 'idle' },
  { from: 'picked', to: 'playing', when: armedWith('swap') },
  { from: 'choosing', to: 'armed' }, // tapped away from the petals (still armed), or another booster's button
  { from: 'choosing', to: 'idle' },
  { from: 'choosing', to: 'playing', when: armedWith('special') },
  { from: 'playing', to: 'idle' },
];

/**
 * The boosters' presenter, after the prototype: a button arms its booster (again, or the pill's X, cancels it at no
 * cost), the pond shows what it can take, and the board's taps and drags go to it instead of the swap. Swap picks
 * two koi, near or far; Feed takes a colour; Special opens petals to choose what the koi becomes. Each is free and
 * limited per level; none costs a move. Views and sounds are injected; the rules stay in the model (via BoosterGame).
 */
export class BoosterControl {
  private readonly left = new Map<BoosterType, number>();
  private readonly tips = new Map<BoosterType, string>();
  private readonly arming: Arming = { type: null, picked: null };
  private readonly state: StateMachine<BoosterState, Arming>;
  /** What each booster does with the koi it takes (one per type: a new booster asks for its flow here). */
  private readonly takes: Readonly<Record<BoosterType, (cell: Cell) => void>> = {
    swap: (cell) => {
      this.swapPick(cell);
    },
    special: (cell) => {
      this.play(this.choose(cell));
    },
    feed: (cell) => {
      this.play(this.use({ type: 'feed', at: cell, lines: this.deps.feedLines }));
    },
  };

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
    // however the choosing ends (a petal, a tap away, a cancel, another booster), the petals close with it
    this.state = new StateMachine<BoosterState, Arming>('idle', BOOSTER_TRANSITIONS, this.arming, {
      choosing: {
        onExit: () => {
          this.deps.picker.close();
        },
      },
    });
    this.reset();
  }

  /** True while a booster is armed: the board's taps and drags go here. */
  get armed(): boolean {
    return !this.state.is('idle') && !this.state.is('playing');
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
    if ((this.left.get(type) ?? 0) <= 0 || !this.deps.game.canBoost || this.state.is('playing')) {
      this.deps.buttons.nope(type);
      this.deps.sounds.wrong();
      return;
    }
    this.arming.type = type;
    this.arming.picked = null;
    this.state.transition('armed');
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

  /**
   * One step back (Escape): open petals close, and the booster stays armed as after a tap away; otherwise the armed
   * booster is cancelled. False when no booster was armed.
   */
  back(): boolean {
    if (!this.armed) return false;
    if (this.state.is('choosing')) this.deps.picker.close();
    else this.cancel();
    return true;
  }

  /** A tap on the board while a booster is armed. */
  tap(cell: Cell): void {
    const type = this.arming.type;
    if (!type || !(this.state.is('armed') || this.state.is('picked'))) return;
    if (this.isPicked(cell)) {
      this.arming.picked = null; // the picked koi again: it settles back
      this.state.transition('armed');
      this.deps.marks.lift(null);
      return;
    }
    if (!this.deps.game.canTarget(type, cell)) {
      this.deps.marks.shake(cell);
      this.deps.pill.nope();
      this.deps.sounds.wrong();
      return;
    }
    this.takes[type](cell);
  }

  /**
   * A drag on the board while a booster is armed counts as a tap on the koi it started on, so it always gets an
   * answer. A swap's drag from a koi to its neighbour picks both.
   */
  swipe(from: Cell, to: Cell): void {
    if (!this.isPicked(from)) this.tap(from);
    if (this.arming.type === 'swap' && this.isPicked(from)) this.tap(to);
  }

  /** Swap: the first koi lifts; the second leaps with it. */
  private swapPick(cell: Cell): void {
    const first = this.arming.picked;
    if (!first) {
      this.arming.picked = cell;
      this.state.transition('picked');
      this.deps.marks.lift(cell);
      this.deps.sounds.lift();
      return;
    }
    this.play(this.use({ type: 'swap', a: first, b: cell }));
  }

  /** Runs a booster's flow without holding up the tap; if it fails, the booster is put away rather than left armed. */
  private play(flow: Promise<void>): void {
    runDetached(flow, 'a booster', () => {
      if (this.armed) this.disarm();
    });
  }

  /** Special: petals open round the koi; the one chosen is what it becomes. */
  private async choose(cell: Cell): Promise<void> {
    this.state.transition('choosing');
    this.deps.marks.lift(cell);
    this.deps.sounds.petals();
    // as in the prototype a striped koi's line is a toss, made before the petals open so the striped one shows it
    const along: LineAlong = this.deps.random() < 0.5 ? 'row' : 'col';
    const choice = await this.deps.picker.pick(cell, along);
    if (!this.state.is('choosing')) return; // cancelled while the petals were open
    if (!choice) {
      this.state.transition('armed'); // tapped away: still armed, pick another koi
      this.deps.marks.lift(null);
      this.deps.sounds.cancel();
      return;
    }
    const special: Special = choice === 'line' ? { type: 'line', along } : { type: choice };
    await this.use({ type: 'special', at: cell, special });
  }

  /**
   * Spends the armed booster: the marks go, the board plays it, then it's ready for the next. However the play ends,
   * the bar is free again afterwards; the booster is spent only if the board took it.
   */
  private async use(use: BoosterUse): Promise<void> {
    this.state.transition('playing');
    this.hideArming();
    try {
      if (await this.deps.game.useBooster(use)) this.spend(use.type);
    } finally {
      this.clearArming();
      this.state.transition('idle');
    }
  }

  private spend(type: BoosterType): void {
    const left = (this.left.get(type) ?? 1) - 1;
    this.left.set(type, left);
    this.deps.buttons.setLeft(type, left);
  }

  private disarm(): void {
    this.clearArming();
    this.state.transition('idle');
    this.hideArming();
  }

  private clearArming(): void {
    this.arming.type = null;
    this.arming.picked = null;
  }

  /** The bar, the pill and the board's marks stop showing an armed booster. */
  private hideArming(): void {
    this.deps.buttons.setArmed(null);
    this.deps.pill.hide();
    this.deps.marks.show(null);
  }

  private isPicked(cell: Cell): boolean {
    return !!this.arming.picked && sameCell(this.arming.picked, cell);
  }
}
