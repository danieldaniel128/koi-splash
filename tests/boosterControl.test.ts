import { describe, expect, it } from 'vitest';
import { BoosterControl } from '../src/game/BoosterControl';
import type { BoosterGame } from '../src/game/BoosterControl';
import type { BoosterType, BoosterUse } from '../src/model/boosters';
import type { Cell, Special } from '../src/model/types';

/** What a test sees: the control, what it told its views (in order), the boosters used, and a way to let it finish. */
interface Rig {
  control: BoosterControl;
  log: string[];
  used: BoosterUse[];
  settle: () => Promise<void>;
}

/** A control wired to fakes that record what it did. */
function setup(
  options: { canTarget?: (type: BoosterType, cell: Cell) => boolean; choice?: Special['type'] | null } = {},
): Rig {
  const log: string[] = [];
  const used: BoosterUse[] = [];
  let closePicker: (() => void) | null = null;
  const game: BoosterGame = {
    canBoost: true,
    canTarget: options.canTarget ?? (() => true),
    useBooster: (use) => {
      used.push(use);
      return Promise.resolve(true);
    },
  };
  const control = new BoosterControl({
    game,
    buttons: {
      setArmed: (type) => log.push(`armed:${type ?? 'none'}`),
      setLeft: (type, left) => log.push(`left:${type}=${left}`),
      nope: (type) => log.push(`nope:${type}`),
    },
    pill: {
      show: (tip) => log.push(`pill:${tip}`),
      hide: () => log.push('pill:hide'),
      nope: () => log.push('pill:nope'),
    },
    marks: {
      show: () => undefined,
      lift: (cell) => log.push(`lift:${cell ? `${cell.col},${cell.row}` : 'none'}`),
      shake: () => log.push('shake'),
    },
    picker: {
      pick: () =>
        options.choice === undefined
          ? new Promise((resolve) => {
              closePicker = () => {
                resolve(null);
              };
            })
          : Promise.resolve(options.choice),
      close: () => closePicker?.(),
    },
    sounds: {
      arm: () => undefined,
      cancel: () => log.push('sound:cancel'),
      wrong: () => log.push('sound:wrong'),
      lift: () => undefined,
    },
    slots: [
      { type: 'swap', count: 1, tip: 'Pick two koi to swap' },
      { type: 'special', count: 1, tip: 'Pick a koi to power up' },
      { type: 'feed', count: 1, tip: 'Tap a colour to feed' },
    ],
    feedLines: 3,
    random: () => 0.2,
  });
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
  return { control, log, used, settle };
}

describe('BoosterControl', () => {
  it('a swap picks two koi, near or far, then spends the booster', async () => {
    const { control, used, log, settle } = setup();
    control.press('swap');
    expect(control.armed).toBe(true);
    expect(log).toContain('pill:Pick two koi to swap');
    control.tap({ col: 0, row: 0 });
    expect(log).toContain('lift:0,0');
    control.tap({ col: 6, row: 8 });
    await settle();
    expect(used).toEqual([{ type: 'swap', a: { col: 0, row: 0 }, b: { col: 6, row: 8 } }]);
    expect(log).toContain('left:swap=0');
    expect(control.armed).toBe(false);
  });

  it('pressing its button again cancels at no cost; a spent booster says no', async () => {
    const { control, log, used, settle } = setup();
    control.press('feed');
    control.press('feed');
    expect(control.armed).toBe(false);
    expect(log).toContain('sound:cancel');
    control.press('feed');
    control.tap({ col: 2, row: 2 });
    await settle();
    expect(used).toEqual([{ type: 'feed', at: { col: 2, row: 2 }, lines: 3 }]);
    control.press('feed');
    expect(log.at(-2)).toBe('nope:feed');
  });

  it('a tap the booster cannot take shakes that koi and the pill, and keeps it armed', () => {
    const { control, log } = setup({ canTarget: () => false });
    control.press('special');
    control.tap({ col: 1, row: 1 });
    expect(log.slice(-3)).toEqual(['shake', 'pill:nope', 'sound:wrong']);
    expect(control.armed).toBe(true);
  });

  it('the special booster turns the koi into the petal chosen; tapping away keeps it armed', async () => {
    const chosen = setup({ choice: 'line' });
    chosen.control.press('special');
    chosen.control.tap({ col: 3, row: 3 });
    await chosen.settle();
    expect(chosen.used).toEqual([
      { type: 'special', at: { col: 3, row: 3 }, special: { type: 'line', along: 'row' } },
    ]);

    const away = setup({ choice: null });
    away.control.press('special');
    away.control.tap({ col: 3, row: 3 });
    await away.settle();
    expect(away.used).toEqual([]);
    expect(away.control.armed).toBe(true);
  });

  it('cancelling while the petals are open closes them and spends nothing', async () => {
    const { control, used, settle } = setup();
    control.press('special');
    control.tap({ col: 3, row: 3 });
    control.press('special'); // its button again
    await settle();
    expect(used).toEqual([]);
    expect(control.armed).toBe(false);
  });
});
