import { BANNER } from '../config/ui';
import type { Special } from '../model/types';

/** One banner: its line, the smaller line under it ('' for none), its colour (a CSS colour) and its size. */
export interface Banner {
  readonly text: string;
  readonly sub: string;
  readonly color: string;
  readonly scale: number;
}

/** A cascade's colours, round by round, as the theme's CSS variables (see THEME.color.combo1..4). */
const COMBO_COLORS = [1, 2, 3, 4].map((n) => `var(--color-combo${n})`);
const GOLD = COMBO_COLORS[0] ?? 'var(--color-gold)';

/**
 * The banner for a cascade round (0 = the swap's own), after the prototype: from the second round on 'Combo x{n}' in
 * that round's colour, a little bigger each round, with the special it made under it; on the first round only a
 * special made gets one (its name). Null for none. Pure.
 */
export function comboBanner(roundIndex: number, made?: Special['type']): Banner | null {
  const name = made ? BANNER.text.made[made] : '';
  const n = roundIndex + 1;
  if (n < 2) return made ? plainBanner(name) : null;
  return {
    text: `${BANNER.text.combo}${n}`,
    sub: name,
    color: COMBO_COLORS[Math.min(COMBO_COLORS.length - 1, n - 2)] ?? GOLD,
    scale: 1 + Math.min(BANNER.maxGrowth, n - 2) * BANNER.growPerRound,
  };
}

/** A gold banner with one line (and an optional smaller one under it). */
export function plainBanner(text: string, sub = ''): Banner {
  return { text, sub, color: GOLD, scale: 1 };
}
