/** The end-of-level card: a panel in the HUD's style over the dimmed pond. */
export const RESULT = {
  dimColor: '#040c18',
  dimAlpha: 0.72,
  /** The dim reaches this many stage sizes past the stage, so tall and wide screens are dimmed edge to edge. */
  dimReach: 1.5,
  cardWidth: 270,
  cardHeight: 168,
  /** The card's corner radius and opacity, and the thin rim inside it (radius, opacity). */
  cardRadius: 22,
  cardAlpha: 0.95,
  rimRadius: 17,
  rimAlpha: 0.15,
  titleSize: 30,
  detailSize: 17,
  hintSize: 13,
  lineGap: 40,
  fadeIn: 0.3,
  popIn: 0.45,
} as const;
