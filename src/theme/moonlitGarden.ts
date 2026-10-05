import type { BackdropLook } from '../art/backdrop';

/**
 * Moonlit garden: an ink print by moonlight. Deep indigo, pale ink lines, a touch of gold. Every colour, font, size
 * and timing the UI uses, and the look of the scene around the pond (the mossy ground, the moon, the fireflies).
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
    /** Frosted glass for panels and round buttons (the prototype's), lit from the top left. */
    glass: 'linear-gradient(180deg, rgba(30, 62, 104, 0.94), rgba(9, 22, 46, 0.96))',
    glassRound:
      'radial-gradient(circle at 34% 26%, rgba(190, 225, 255, 0.36), rgba(22, 52, 96, 0.92) 55%, rgba(6, 16, 36, 0.96))',
    /** Gold for badges and fills, from light to deep; coral when moves run low. */
    goldLight: '#ffeaa8',
    goldDeep: '#f5b54e',
    coral: '#ff8f9e',
    /**
     * The night sky (the garden's), from its darkest at the top to the horizon, and the moon and its glow: the page
     * behind everything, the browser's bar and the loading screen.
     */
    night: '#050b20',
    horizon: '#1d3862',
    moon: '#f7ecc8',
    moonGlow: 'rgba(247, 236, 200, 0.3)',
  },
  font: {
    /**
     * Chunky rounded figures and titles, like the HUDs of casual mobile games: Nunito, bundled with the game (see
     * main.ts) so it looks the same on every device, then the system's own rounded faces.
     */
    number: 'Nunito, ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif',
    label: 'Nunito, system-ui, -apple-system, "Segoe UI", sans-serif',
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
    /**
     * The ground: a soft moss lawn by moonlight, in the UI's indigo, low in contrast so it never competes with the
     * board. Its base and its lighter patches; the pond's light spilling onto it (colour, strength, how far in px);
     * and a few fallen petals (lotus pink, lantern gold): the share of spots that get one, their size and opacity.
     */
    bank: '#0f2038',
    moss: '#163252',
    spill: { color: '#4fb6d0', strength: 0.22, reach: 26 },
    petals: { petal: '#e89ab4', leaf: '#d9a54a', share: 0.22, size: 4.2, opacity: 0.55 },
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
    /** The garden above the pond (see art/backdrop): night sky, moon, misty hills, a pagoda, a maple and a lantern. */
    backdrop: {
      sky: { top: '#050b20', horizon: '#1d3862' },
      stars: { color: '#e3ecff', density: 7 },
      moon: { color: '#f7ecc8', glow: 'rgba(247, 236, 200, 0.3)', radius: 22, at: [0.78, 0.3] },
      hills: [
        { color: '#22406c', height: 84, roll: 12 },
        { color: '#132a4c', height: 40, roll: 7 },
      ],
      rim: 'rgba(200, 222, 250, 0.4)',
      trees: '#0c1c38',
      grass: '#2a4f72',
      mist: 'rgba(170, 200, 240, 0.14)',
      ink: '#060d1d',
      window: '#ffcf73',
      leaves: '#6a2140',
      leavesLight: '#9a3358',
      crown: '#34122b',
      lantern: { paper: '#ffd38a', glow: 'rgba(255, 190, 90, 0.5)' },
    } satisfies BackdropLook,
  },
} as const;
