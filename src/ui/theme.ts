/**
 * The style library: every colour, font, size, radius, shadow and timing the UI uses, in one place. The HTML UI
 * reads them as CSS variables (applyTheme writes them onto the page), and Pixi code reads the same objects, so the
 * two never drift apart. Sizes are in stage px (the UI layer is scaled with the stage).
 */
export const THEME = {
  color: {
    /** Moonlight white for text and rims, muted for labels, gold for the score and goals. */
    ink: '#eef4f2',
    muted: '#9fb6c4',
    gold: '#ffd76a',
    lotus: '#f3a6c0',
    /** Panels: deep indigo, a little see-through, with a thin moonlit rim like the pond's foam lines. */
    panel: 'rgba(11, 26, 51, 0.9)',
    panelSolid: '#0b1a33',
    rim: 'rgba(212, 232, 238, 0.4)',
    track: '#1a3150',
    dim: 'rgba(4, 12, 24, 0.72)',
    outline: '#0a1a2e',
  },
  font: {
    /** A print-like serif with lining figures (Georgia's old-style figures make a 0 look like an o). */
    number: '"Palatino Linotype", Palatino, "Book Antiqua", "Noto Serif", serif',
    label: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  /** Type scale (px). */
  text: { xs: 8, sm: 11, md: 14, lg: 21, xl: 26, title: 30 },
  /** Spacing scale (px). */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 8, md: 16, lg: 22, round: 999 },
  /** Rim width and the soft shadow under panels. */
  line: 1.5,
  shadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
  /** Motion (s). */
  time: { fast: 0.15, normal: 0.3, slow: 0.55 },
} as const;

/** Writes the theme onto the page as CSS variables (--color-ink, --text-lg, --space-md, ...). */
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
