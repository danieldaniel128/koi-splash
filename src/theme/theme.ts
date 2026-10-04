import { MOONLIT_GARDEN } from './moonlitGarden';

/**
 * The game's theme: one object holds the whole look, the UI's tokens and the scene around the pond. The HTML UI reads
 * the tokens as CSS variables (applyTheme writes them onto the page) and the Pixi code reads the same object, so the
 * two never drift apart. A new look is a new theme file picked here, not changes to components.
 */
export const THEME = MOONLIT_GARDEN;

/** Writes the theme's tokens onto the page as CSS variables (--color-ink, --text-lg, --space-md, ...). */
export function applyTheme(root: HTMLElement): void {
  const set = (name: string, value: string): void => {
    root.style.setProperty(`--${name}`, value);
  };
  for (const [key, value] of Object.entries(THEME.color)) set(`color-${key}`, value);
  for (const [key, value] of Object.entries(THEME.font)) set(`font-${key}`, value);
  for (const [key, value] of Object.entries(THEME.text)) set(`text-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.space)) set(`space-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.radius)) set(`radius-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.time)) set(`time-${key}`, `${value}s`);
  set('line', `${THEME.line}px`);
  set('shadow', THEME.shadow);
}
