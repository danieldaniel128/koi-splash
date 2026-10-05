import type { SoundMenuLook } from '../config/ui';
import type { Rect } from './gameLayout';

/** The sound button's size, the bar's buttons it lines up with, and the menu's width, rows and padding (stage px). */

/**
 * Where the sound button and its menu go: the button at the bar's right end, level with the boosters' orbs, and the
 * menu just above it, right-aligned to it, one row per channel. Pure.
 */
export function placeSoundMenu(bar: Rect, rows: number, look: SoundMenuLook): { button: Rect; menu: Rect } {
  const button = {
    x: bar.x + bar.width - look.button,
    y: bar.y + (look.barOrb - look.button) / 2,
    width: look.button,
    height: look.button,
  };
  const height = rows * look.row + 2 * look.padding;
  const menu = {
    x: button.x + button.width - look.width,
    y: button.y - look.gap - height,
    width: look.width,
    height,
  };
  return { button, menu };
}
