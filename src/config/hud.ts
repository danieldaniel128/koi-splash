/** HUD look, in stage units. It sits on the bank above the pond (see BOARD_LAYOUT.top). */
export const HUD = {
  top: 26,
  /** Moonlight white for text and rims, gold for the score and the goal bar. */
  ink: '#eef4f2',
  muted: '#9fb6c4',
  gold: '#ffd76a',
  /** Panels: deep indigo, a little see-through, with a thin moonlit rim like the pond's foam lines. */
  panel: '#0b1a33',
  panelAlpha: 0.9,
  rim: '#d4e8ee',
  rimAlpha: 0.4,
  /** The moves counter is a water drop this wide (px); the score sits in a pill this tall. */
  dropRadius: 22,
  pillHeight: 50,
  pillLeft: 62,
  barHeight: 6,
  barBack: '#1a3150',
  /** A print-like serif with lining figures (Georgia's old-style figures make a 0 look like an o). */
  numberFont: '"Palatino Linotype", Palatino, "Book Antiqua", "Noto Serif", serif',
  labelFont: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  /** How long the score takes to count up to a new value, and how much it swells while it does (s, scale). */
  countUp: 0.55,
  bump: 1.18,
} as const;

/** The end-of-level card: a panel in the HUD's style over the dimmed pond. */
export const RESULT = {
  dimColor: '#040c18',
  dimAlpha: 0.72,
  /** The dim reaches this many stage sizes past the stage, so tall and wide screens are dimmed edge to edge. */
  dimReach: 1.5,
  cardWidth: 270,
  cardHeight: 168,
  titleSize: 30,
  detailSize: 17,
  hintSize: 13,
  lineGap: 40,
  fadeIn: 0.3,
  popIn: 0.45,
} as const;
