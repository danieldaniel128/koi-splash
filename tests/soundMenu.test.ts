import { describe, expect, it } from 'vitest';
import { storedSetting } from '../src/core/storedSetting';
import { placeSoundMenu } from '../src/layout/soundMenu';

describe('placeSoundMenu', () => {
  it('puts the button at the bar end, level with its orbs, and the menu above the bar, clear of it', () => {
    const look = { button: 36, barOrb: 58, width: 176, row: 44, padding: 4, gap: 20 };
    const { button, menu } = placeSoundMenu({ x: 8, y: 700, width: 374, height: 76 }, 3, look);
    expect(button).toEqual({ x: 346, y: 711, width: 36, height: 36 });
    expect(menu).toEqual({ x: 206, y: 700 - 20 - 140, width: 176, height: 140 });
  });
});

describe('storedSetting', () => {
  it('is on until turned off, and keeps the choice', () => {
    const kept = new Map<string, string>();
    const storage = {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => void kept.set(key, value),
    } as unknown as Storage;
    const setting = storedSetting('k', () => storage);
    expect(setting.load()).toBe(true);
    setting.save(false);
    expect(setting.load()).toBe(false);
  });

  it('is just on when the browser refuses storage', () => {
    const setting = storedSetting('k', () => {
      throw new Error('blocked');
    });
    expect(setting.load()).toBe(true);
    expect(() => {
      setting.save(false);
    }).not.toThrow();
  });
});
