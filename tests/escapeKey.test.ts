import { describe, expect, it } from 'vitest';
import { closeOnEscape } from '../src/ui/escapeKey';

/** A key going down on the page. */
const press = (page: EventTarget, key: string): void => {
  page.dispatchEvent(Object.assign(new Event('keydown'), { key }));
};

describe('closeOnEscape', () => {
  it('closes only the top thing that is open', () => {
    const page = new EventTarget();
    const open = { menu: true, booster: true };
    const closed: string[] = [];
    const closer = (name: keyof typeof open) => (): boolean => {
      if (!open[name]) return false;
      open[name] = false;
      closed.push(name);
      return true;
    };
    closeOnEscape(page, [closer('menu'), closer('booster')]);
    press(page, 'Enter');
    expect(closed).toEqual([]);
    press(page, 'Escape');
    expect(closed).toEqual(['menu']);
    press(page, 'Escape');
    press(page, 'Escape');
    expect(closed).toEqual(['menu', 'booster']);
  });
});
