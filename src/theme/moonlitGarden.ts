import type { BackdropLook } from '../art/backdrop';

/** The typeface bundled with the game (see main.ts), first in both font stacks. */
const TYPEFACE = 'Nunito';

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
    /** A thin moonlit rim round every glass piece, like the pond's foam lines; the dark track under fills. */
    rim: 'rgba(212, 232, 238, 0.4)',
    track: '#1a3150',
    dim: 'rgba(4, 12, 24, 0.72)',
    outline: '#0a1a2e',
    /** The light and the shadow every piece is lit with: highlights on glass, drop shadows under it. */
    shine: '#ffffff',
    shade: '#000000',
    /** Frosted glass for panels and round buttons (the prototype's), lit from the top left. */
    glass: 'linear-gradient(180deg, rgba(30, 62, 104, 0.94), rgba(9, 22, 46, 0.96))',
    glassRound:
      'radial-gradient(circle at 34% 26%, rgba(190, 225, 255, 0.36), rgba(22, 52, 96, 0.92) 55%, rgba(6, 16, 36, 0.96))',
    /** Deep indigo under round glass that lies over a panel, so the panel's edge doesn't show through it. */
    glassBase: '#0b1a33',
    /** Gold for badges and fills, from light to deep, and the dark brown printed on it; coral when moves run low. */
    goldLight: '#ffeaa8',
    goldDeep: '#f5b54e',
    goldInk: '#3a1a00',
    coral: '#ff8f9e',
    /** A star not earned yet. */
    starOff: '#33415e',
    /** The pink glow of an armed booster, and the pale ice of small icons on glass. */
    glowPink: '#ff96c8',
    ice: '#dff2ff',
    /**
     * The night sky (the garden's), from its darkest at the top to the horizon, and the moon and its glow: the page
     * behind everything, the browser's bar, the loading screen and the rotate notice. The night is also the ink of
     * the UI's shadows: under chips and labels, and the petals' dim.
     */
    night: '#050b20',
    horizon: '#1d3862',
    moon: '#f7ecc8',
    moonGlow: 'rgba(247, 236, 200, 0.3)',
    /** A cascade's colours, round by round (the banner and the points): gold, blossom, wisteria, then moonlight. */
    combo1: '#ffe07a',
    combo2: '#ffb0d8',
    combo3: '#d8c2ff',
    combo4: '#ffffff',
  },
  /** The boosters' own colors: their icons on the bar, and the pink arcs round a picked koi on the board. */
  booster: { pink: '#ffb3d1', cream: '#ffe6a6', amber: '#ffd27a', water: '#9fdcff' },
  /** The bundled typeface: loaded before the game draws its first label, in the weights below. */
  typeface: TYPEFACE,
  font: {
    /**
     * Chunky rounded figures and titles, like the HUDs of casual mobile games: the bundled typeface, so it looks the
     * same on every device, then the system's own rounded faces.
     */
    number: `${TYPEFACE}, ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif`,
    label: `${TYPEFACE}, system-ui, -apple-system, "Segoe UI", sans-serif`,
  },
  /** The two weights of the bundled typeface: bold for labels and names, black for numbers and titles. */
  weight: { bold: 700, black: 900 },
  /** Type scale (px): `sm` is the smallest a phone shows readably (captions), `display` the big numbers. */
  text: { sm: 11, md: 14, lg: 21, xl: 26, title: 30, display: 34 },
  /** Spacing scale (px). */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 8, lg: 22, round: 999 },
  /**
   * Sizes (px): the booster bar's round buttons (the layout lines the sound button up with them), a goal chip's icon
   * (its baked picture is shown in proportion to it) and a finger.
   */
  size: { boosterOrb: 58, goalIcon: 28, touch: 44 },
  /** Rim widths (px): fine for the small goal chips, normal for every other piece, bold for a warning. */
  line: { fine: 1, normal: 1.5, bold: 2 },
  /** The soft shadow under panels and buttons. */
  shadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
  /** How far a pressed control squashes, and how small something starts as it pops in. */
  scale: { press: 0.92, reveal: 0.92 },
  /**
   * Motion (s): transitions, and the loops (a pulse on the last moves, the armed booster breathing, the rotate
   * notice's phone tipping upright).
   */
  time: { fast: 0.15, normal: 0.3, slow: 0.55, pulse: 0.9, breathe: 1.5, tip: 2 },
  /**
   * Easings: `spring` overshoots a little and settles (presses, pop-ins, the switch knob); `back` swells past and
   * eases back (counters, cards and petals popping in).
   */
  ease: { spring: 'cubic-bezier(0.2, 1.5, 0.4, 1)', back: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
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
