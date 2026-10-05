import { MOONLIT_GARDEN } from './moonlitGarden';

/**
 * The game's theme: one object holds the whole look, the UI's tokens and the scene around the pond. The HTML UI reads
 * the tokens as CSS variables (see pageTheme) and the Pixi code reads the same object, so the two never drift
 * apart. A new look is a new theme file picked here, not changes to components.
 */
export const THEME = MOONLIT_GARDEN;

/** What the page itself takes from the theme: the style sheet of its tokens, and the browser's colour for it. */
export interface PageTheme {
  readonly styleSheet: string;
  readonly themeColor: string;
}

/**
 * The theme for the page: vite.config.ts writes it into index.html, so the page is themed from its first paint,
 * before any script has run.
 */
export function pageTheme(): PageTheme {
  return { styleSheet: tokenStyleSheet(), themeColor: THEME.color.night };
}

/** The theme's tokens as CSS variables on the page's root (--color-ink, --text-lg, --space-md, ...). */
function tokenStyleSheet(): string {
  const tokens: string[] = [];
  const set = (name: string, value: string): void => {
    tokens.push(`--${name}: ${value};`);
  };
  for (const [key, value] of Object.entries(THEME.color)) set(`color-${key}`, value);
  for (const [key, value] of Object.entries(THEME.font)) set(`font-${key}`, value);
  for (const [key, value] of Object.entries(THEME.text)) set(`text-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.space)) set(`space-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.radius)) set(`radius-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(THEME.time)) set(`time-${key}`, `${value}s`);
  set('line', `${THEME.line}px`);
  set('shadow', THEME.shadow);
  return `:root { ${tokens.join(' ')} }`;
}
