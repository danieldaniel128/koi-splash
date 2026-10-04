/**
 * Moonlit garden: an ink print by moonlight. Deep indigo, pale ink lines, a touch of gold. Every colour, font, size
 * and timing the UI uses, and the look of the scene around the pond (the bank, the moon, the fireflies).
 * Sizes are in stage px (the UI layer is scaled with the stage).
 */
export const MOONLIT_GARDEN = {
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
  /** The scene around the pond: the ground it is dug into, the moon over it and the fireflies. */
  scene: {
    /** The bank: indigo with a faint seigaiha (overlapping waves) pattern; one circle is this wide (px). */
    bank: '#0b1830',
    bankPattern: '#1a335c',
    patternSize: 34,
    /**
     * The bank darkens toward the screen edges: an oval of half the stage stretched by `stretch` (x, y), darkening
     * by up to `strength` from `from` to `to` (distance from the centre, in those half sizes).
     */
    vignette: { stretch: [1.2, 1.1], strength: 0.4, from: 0.7, to: 1.5 },
    /** The moon's colour, and its reflection's radius on the water (px). */
    moon: '#f7ecc8',
    moonReflection: 19,
    /** The fireflies' glow. */
    firefly: '#f3f7b0',
  },
} as const;
