/**
 * koiBank.ts - a data-driven library of koi varieties for Koi Splash.
 *
 * Every variety is plain data (a `KoiVariety`): colours, fins, scale net, seeded
 * patch layers and an optional Tancho head spot. One painter (`paintKoi`) turns
 * any variety into a top-down, softly shaded fish on a Canvas 2D context, so a
 * new variety never needs new drawing code - think of each entry as a prefab.
 *
 * Three collections: KOI_VARIETIES (real koi), MATCH3_SET (the five board
 * pieces) and DREAM_KOI (fantasy colours for extra pieces). getVariety finds all.
 *
 * The module has no dependencies and no framework code. For PixiJS (or any
 * WebGL engine), bake a canvas once with `bakeKoi` and upload it as a texture:
 *
 *   const tex = PIXI.Texture.from(bakeKoi(getVariety('kohaku'), { size: 96, resolution: 2 }));
 *
 * Painting is deterministic: the same variety + seed always gives the same
 * pattern, and the tail wag never changes the pattern, only the pose.
 */

// ============================================================================
// Types: the declarative look of a variety
// ============================================================================

/** A colour as a 6-digit hex string, e.g. '#dc2f1f'. */
export type Hex = string;

/** Where along the fish a patch layer gathers its blobs (head = snout end). */
export type Placement = 'head' | 'shoulder' | 'back' | 'tail' | 'body';

/** One layer of seeded, organic blobs (hi, sumi, ki...). Layers paint in order. */
export interface PatchLayer {
  color: Hex;
  /** How many blobs, picked in [min, max] (inclusive). */
  count: [number, number];
  /** Blob radius along the fish, in body lengths (0.1 = a tenth of the body). */
  size: [number, number];
  /** Where the blobs are spread along the fish. */
  placement: Placement;
  /** Sideways scatter of blob centres: 0 = on the spine, 1 = out to the flanks. Default 0.4. */
  lateral?: number;
  /** Width/length ratio range of a blob. Default [1, 1.5] (patches wrap across the back). */
  aspect?: [number, number];
  /** Edge raggedness: 0 = smooth oval, 1 = very ragged. Default 0.35. */
  wobble?: number;
  /** Edge blur: 0 = crisp kiwa (sharp edge), 1 = very soft. Default 0. */
  softness?: number;
  /** Opacity of the layer. Default 1. */
  alpha?: number;
  /** Optional scale net drawn only inside this layer (Goromo-style robing). */
  net?: Hex;
}

/** Scale pattern over the back. */
export type ScalePattern =
  | { kind: 'none' }
  /** Reticulated net: every scale edge is outlined (Asagi, Matsuba, Goshiki). */
  | { kind: 'net'; color: Hex; alpha?: number; scale?: number; span?: number }
  /** Doitsu: scaleless skin with one row of big mirror scales each side of the spine. */
  | { kind: 'doitsu'; color: Hex; size?: number };

/** Fin colouring. Fins are translucent and painted behind the body. */
export interface FinLook {
  color: Hex;
  /** Colour at the fin root (Motoguro = black fin base on Showa and Utsuri). */
  base?: Hex;
  /** A contrasting fin edge (Karasu white tips), `width` as a fraction of fin length. */
  edge?: { color: Hex; width: number };
  /** Fin opacity, 0..1. Default 0.8. */
  opacity?: number;
}

/** The full declarative appearance of a variety. No code, only data. */
export interface KoiLook {
  /** Body half-width as a fraction of body length (0.13 slim .. 0.2 chubby). Default 0.15. */
  build?: number;
  body: {
    /** Main skin colour. */
    color: Hex;
    /** Colour along the spine (seen from above the back is often darker or brighter). */
    back?: Hex;
    /** Colour showing along the flanks and cheeks. */
    belly?: Hex;
    /** How far in from the edge the belly colour reaches, 0..1 of the half-width. Default 0.3. */
    bellyReach?: number;
    /**
     * Two-tone body: the skin blends from its own colours at the head into `color` towards the tail,
     * between `from` and `to` along the spine (0 = snout, 1 = tail root). Defaults 0.3 .. 0.85.
     */
    fade?: { color: Hex; from?: number; to?: number };
  };
  fins: FinLook;
  /** Metallic (Ogon) lustre, 0 = matte .. 1 = mirror bright. */
  sheen: number;
  /** Scale pattern. */
  scales: ScalePattern;
  /** Seeded blob layers, painted in order over the body. */
  patches: PatchLayer[];
  /** Tancho: one round spot on the head and nowhere else. `size` = radius in body lengths. */
  headSpot?: { color: Hex; size: number };
  /** Gin Rin: density of glittering scales, 0..1. */
  ginRin?: number;
  /** Rim light hugging the outline (keeps dark koi readable on dark water). */
  rim?: { color: Hex; strength: number };
  /** Base seed of the pattern; the paint-time seed varies individuals. */
  seed: number;
}

export interface KoiVariety {
  /** Stable id used in code and save files, e.g. 'tancho-kohaku'. */
  id: string;
  /** Japanese name (romanised). */
  name: string;
  englishName: string;
  description: string;
  /** The one colour a match-3 board reads this koi as (swatches, glows, particles). Set on game pieces. */
  dominant?: Hex;
  look: KoiLook;
}

/** Direction the head points in the painted square. */
export type Facing = 'up' | 'right' | 'down' | 'left';

export interface PaintOptions {
  /** Edge of the square the fish is painted into, in canvas units (the fish fits inside). */
  size: number;
  /** Tail wag pose, -1..1. 0 = straight. Animate with e.g. Math.sin(time * 6). */
  tailWag?: number;
  /** Individual seed: same variety + same seed = same pattern. Default 0. */
  seed?: number;
  /** Head direction. Default 'up'. */
  facing?: Facing;
  /** Soft drop shadow under the fish. Default true. */
  shadow?: boolean;
  /** Body width override (0.12 slim .. 0.28 chubby); default: the variety's own build, else DEFAULT_BUILD. */
  build?: number;
  /**
   * Which parts to paint: the whole fish (default), only the fins and tail, or only the body (with the dorsal fin
   * and the head). Painting them apart lets a game outline each part or tint the fins as if under water.
   */
  parts?: 'all' | 'fins' | 'body';
}

export interface BakeOptions extends PaintOptions {
  /** Pixel density of the baked canvas (use window.devicePixelRatio). Default 1. */
  resolution?: number;
}

/** Any 2D context: on-screen canvas or OffscreenCanvas (for workers). */
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// ============================================================================
// Palette: shared colour names so the data reads like a koi keeper's notes
// ============================================================================

const C = {
  shiro: '#f8f5ee', // white skin
  shiroShade: '#e4ddd0',
  hi: '#dc2f1f', // red (hi)
  hiDeep: '#c42116',
  sumi: '#17181c', // black (sumi)
  ki: '#f0c63a', // yellow (ki)
  platinum: '#eef1f3',
  fin: '#f4f1ea',
} as const;

// ============================================================================
// Varieties
// ============================================================================

/** All varieties, in the chart's order (Gosanke first). */
export const KOI_VARIETIES: KoiVariety[] = [
  {
    id: 'kohaku',
    name: 'Kohaku',
    englishName: 'Red on white',
    description: 'Snow-white skin with bold red (hi) patches stepping down the back; a red crown on the head.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.hi, count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 3], size: [0.095, 0.13], placement: 'back', lateral: 0.2 },
      ],
      seed: 101,
    },
  },
  {
    id: 'taisho-sanke',
    name: 'Taishō Sanshoku',
    englishName: 'Sanke (tricolour on white)',
    description: 'A Kohaku with small black (sumi) spots over the back; never any black on the head.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.hi, count: [1, 1], size: [0.08, 0.1], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 3], size: [0.09, 0.12], placement: 'back', lateral: 0.35 },
        { color: C.sumi, count: [4, 6], size: [0.022, 0.042], placement: 'back', lateral: 0.75, wobble: 0.55 },
        { color: C.sumi, count: [1, 2], size: [0.02, 0.03], placement: 'tail', lateral: 0.6, wobble: 0.5 },
      ],
      seed: 202,
    },
  },
  {
    id: 'showa-sanshoku',
    name: 'Shōwa Sanshoku',
    englishName: 'Showa (tricolour on black)',
    description: 'Black base wrapped with red and white; black reaches the head and the pectoral fin roots (Motoguro).',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: C.fin, base: C.sumi },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.shiro, count: [3, 4], size: [0.07, 0.1], placement: 'body', lateral: 0.7, wobble: 0.5 },
        { color: C.hi, count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 2], size: [0.08, 0.11], placement: 'back', lateral: 0.3 },
        { color: C.sumi, count: [1, 1], size: [0.035, 0.05], placement: 'head', lateral: 0.3, aspect: [0.4, 0.6], wobble: 0.6 },
        { color: C.sumi, count: [2, 3], size: [0.035, 0.06], placement: 'back', lateral: 0.8, wobble: 0.6 },
      ],
      seed: 303,
    },
  },
  {
    id: 'tancho-kohaku',
    name: 'Tanchō Kohaku',
    englishName: 'Crane-crowned white',
    description: 'Pure white with a single round red spot on the head, like the Japanese red-crowned crane.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' }, patches: [],
      headSpot: { color: C.hi, size: 0.075 },
      seed: 404,
    },
  },
  {
    id: 'tancho-sanke',
    name: 'Tanchō Sanke',
    englishName: 'Crane-crowned Sanke',
    description: 'White with the round red head spot and small black spots on the back; no other red.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.sumi, count: [5, 7], size: [0.022, 0.04], placement: 'back', lateral: 0.8, wobble: 0.55 },
        { color: C.sumi, count: [1, 2], size: [0.02, 0.03], placement: 'tail', lateral: 0.6, wobble: 0.5 },
      ],
      headSpot: { color: C.hi, size: 0.07 },
      seed: 505,
    },
  },
  {
    id: 'tancho-showa',
    name: 'Tanchō Shōwa',
    englishName: 'Crane-crowned Showa',
    description: 'Black and white Showa with the round red spot as the only red on the fish.',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: C.fin, base: C.sumi },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.shiro, count: [4, 5], size: [0.07, 0.1], placement: 'body', lateral: 0.6, wobble: 0.5 },
        { color: C.shiro, count: [1, 1], size: [0.09, 0.1], placement: 'head', lateral: 0 },
        { color: C.sumi, count: [2, 3], size: [0.03, 0.05], placement: 'back', lateral: 0.8, wobble: 0.6 },
      ],
      headSpot: { color: C.hi, size: 0.065 },
      seed: 606,
    },
  },
  {
    id: 'shiro-utsuri',
    name: 'Shiro Utsuri',
    englishName: 'White reflection',
    description: 'Ink-black skin cut by white; black on the head and at the fin roots, like a brush painting.',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: C.fin, base: C.sumi },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.shiro, count: [4, 5], size: [0.07, 0.11], placement: 'body', lateral: 0.7, wobble: 0.55 },
        { color: C.sumi, count: [1, 1], size: [0.03, 0.045], placement: 'head', lateral: 0.3, aspect: [0.4, 0.6], wobble: 0.6 },
        { color: C.sumi, count: [3, 4], size: [0.03, 0.05], placement: 'body', lateral: 0.9, wobble: 0.7 },
      ],
      seed: 707,
    },
  },
  {
    id: 'hi-utsuri',
    name: 'Hi Utsuri',
    englishName: 'Red reflection',
    description: 'Black base with fiery red-orange patches; black fin roots.',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: '#e9512b', base: C.sumi },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: '#e2401f', count: [4, 5], size: [0.08, 0.12], placement: 'body', lateral: 0.6, wobble: 0.5 },
        { color: C.sumi, count: [3, 4], size: [0.03, 0.05], placement: 'body', lateral: 0.9, wobble: 0.7 },
      ],
      seed: 808,
    },
  },
  {
    id: 'ki-utsuri',
    name: 'Ki Utsuri',
    englishName: 'Yellow reflection',
    description: 'Black base with lemon-yellow patches; the rarest of the Utsuri.',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: '#f3d466', base: C.sumi },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.ki, count: [4, 5], size: [0.08, 0.12], placement: 'body', lateral: 0.6, wobble: 0.5 },
        { color: C.sumi, count: [3, 5], size: [0.025, 0.05], placement: 'body', lateral: 0.9, wobble: 0.7 },
      ],
      seed: 909,
    },
  },
  {
    id: 'shiro-bekko',
    name: 'Shiro Bekko',
    englishName: 'White tortoiseshell',
    description: 'White with small black stepping-stone spots on the back; a clean white head.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [{ color: C.sumi, count: [5, 7], size: [0.025, 0.045], placement: 'back', lateral: 0.7, wobble: 0.55 }],
      seed: 1010,
    },
  },
  {
    id: 'aka-bekko',
    name: 'Aka Bekko',
    englishName: 'Red tortoiseshell',
    description: 'Solid red body with black spots on the back.',
    look: {
      body: { color: C.hi, back: C.hiDeep, belly: '#e8573a' },
      fins: { color: '#f2eee6', base: '#e05a3c' },
      sheen: 0, scales: { kind: 'none' },
      patches: [{ color: C.sumi, count: [5, 7], size: [0.02, 0.04], placement: 'back', lateral: 0.6, wobble: 0.55 }],
      seed: 1111,
    },
  },
  {
    id: 'goshiki',
    name: 'Goshiki',
    englishName: 'Five colours',
    description: 'Dark blue-black net over grey-white skin, with red patches on top: five colours in one fish.',
    look: {
      body: { color: '#9aa4b0', back: '#6f7a88', belly: '#c9ced4' },
      fins: { color: '#e8e8ea', base: '#5a6270' },
      sheen: 0,
      scales: { kind: 'net', color: '#1c2430', alpha: 0.85, span: 1 },
      patches: [
        { color: C.hi, count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 3], size: [0.085, 0.12], placement: 'back', lateral: 0.35, alpha: 0.95 },
      ],
      seed: 1212,
    },
  },
  {
    id: 'asagi',
    name: 'Asagi',
    englishName: 'Pale indigo',
    description: 'Blue-grey back with a crisp net of scales, a pale head, and red-orange cheeks, flanks and fin roots.',
    look: {
      body: { color: '#b3c9dc', back: '#5a7ea3', belly: '#e25a2b', bellyReach: 0.2 },
      fins: { color: '#f4ece4', base: '#e25a2b' },
      sheen: 0,
      scales: { kind: 'net', color: '#233e62', alpha: 0.9, span: 0.72 },
      patches: [],
      seed: 1313,
    },
  },
  {
    id: 'shusui',
    name: 'Shūsui',
    englishName: 'Autumn water',
    description: 'The scaleless (Doitsu) Asagi: a row of dark blue mirror scales along the spine, red on the flanks.',
    look: {
      body: { color: '#c5d6e4', back: '#8eaac4', belly: '#e25a2b', bellyReach: 0.28 },
      fins: { color: '#f4ece4', base: '#e25a2b' },
      sheen: 0,
      scales: { kind: 'doitsu', color: '#1f3a66' },
      patches: [],
      seed: 1414,
    },
  },
  {
    id: 'ochiba-shigure',
    name: 'Ochiba Shigure',
    englishName: 'Autumn leaves on the water',
    description: 'Soft grey-blue with brown-orange patches, like fallen leaves drifting on a pond.',
    look: {
      body: { color: '#9aa6ae', back: '#7c8993', belly: '#b8c0c4' },
      fins: { color: '#c9b79a', base: '#8f7a5c' },
      sheen: 0,
      scales: { kind: 'net', color: '#59646e', alpha: 0.35, span: 0.9 },
      patches: [{ color: '#c47a36', count: [4, 5], size: [0.09, 0.13], placement: 'body', lateral: 0.45, softness: 0.3, wobble: 0.5 }],
      seed: 1515,
    },
  },
  {
    id: 'karasugoi',
    name: 'Karasugoi',
    englishName: 'Crow koi',
    description: 'Matte crow-black from nose to tail, with white-tipped fins.',
    look: {
      body: { color: '#141519', back: '#0c0d10', belly: '#23252b' },
      fins: { color: '#1a1b20', edge: { color: '#f4f4f2', width: 0.35 }, opacity: 0.9 },
      sheen: 0,
      scales: { kind: 'net', color: '#30343c', alpha: 0.55, span: 0.9 },
      patches: [],
      rim: { color: '#9fb4cc', strength: 0.45 },
      seed: 1616,
    },
  },
  {
    id: 'kumonryu',
    name: 'Kumonryū',
    englishName: 'Dragon of the clouds',
    description: 'Scaleless black koi with swirling white clouds and a white-flecked head.',
    look: {
      body: { color: '#141519', belly: '#26282e' },
      fins: { color: '#1c1d22', edge: { color: '#f4f4f2', width: 0.5 } },
      sheen: 0,
      scales: { kind: 'doitsu', color: '#08090b' },
      patches: [
        { color: C.shiro, count: [3, 4], size: [0.05, 0.08], placement: 'body', lateral: 0.8, wobble: 0.8 },
        { color: C.shiro, count: [1, 1], size: [0.05, 0.06], placement: 'head', lateral: 0.2, wobble: 0.7 },
      ],
      rim: { color: '#9fb4cc', strength: 0.4 },
      seed: 1717,
    },
  },
  {
    id: 'beni-kumonryu',
    name: 'Beni Kumonryū',
    englishName: 'Red cloud dragon',
    description: 'A Kumonryu with red patches over the black and white.',
    look: {
      body: { color: '#141519', belly: '#26282e' },
      fins: { color: C.fin, base: '#1c1d22' },
      sheen: 0,
      scales: { kind: 'doitsu', color: '#08090b' },
      patches: [
        { color: C.shiro, count: [3, 4], size: [0.06, 0.09], placement: 'body', lateral: 0.8, wobble: 0.7 },
        { color: '#e0462a', count: [2, 3], size: [0.07, 0.1], placement: 'back', lateral: 0.3, wobble: 0.5 },
      ],
      seed: 1818,
    },
  },
  {
    id: 'benigoi',
    name: 'Benigoi',
    englishName: 'Deep red koi',
    description: 'One solid, deep brick-red from nose to tail.',
    look: {
      body: { color: '#d02a1b', back: '#b51f14', belly: '#e24d31' },
      fins: { color: '#e04a30' },
      sheen: 0,
      scales: { kind: 'net', color: '#f07458', alpha: 0.25, scale: 0.065, span: 0.9 },
      patches: [],
      seed: 1919,
    },
  },
  {
    id: 'chagoi',
    name: 'Chagoi',
    englishName: 'Tea-coloured koi',
    description: 'Olive-bronze tea colour with a light net of scale edges; the friendliest koi in the pond.',
    look: {
      body: { color: '#a8894f', back: '#8a6f3c', belly: '#c6aa70' },
      fins: { color: '#b89a60' },
      sheen: 0.1,
      scales: { kind: 'net', color: '#d9c38f', alpha: 0.6, scale: 0.065, span: 0.95 },
      patches: [],
      seed: 2020,
    },
  },
  {
    id: 'kigoi',
    name: 'Kigoi',
    englishName: 'Yellow koi',
    description: 'Solid, non-metallic lemon yellow.',
    look: {
      body: { color: '#f2cf4a', back: '#e8bc2c', belly: '#f7df86' },
      fins: { color: '#f5dc7a' },
      sheen: 0,
      scales: { kind: 'net', color: '#fff0b0', alpha: 0.3, scale: 0.065, span: 0.9 },
      patches: [],
      seed: 2121,
    },
  },
  {
    id: 'yamabuki-ogon',
    name: 'Yamabuki Ōgon',
    englishName: 'Golden (kerria yellow)',
    description: 'Solid metallic gold, bright as the yamabuki flower; every scale catches the light.',
    look: {
      body: { color: '#f2bd2c', back: '#ffd966', belly: '#d8961a' },
      fins: { color: '#f7cf55' },
      sheen: 0.9, scales: { kind: 'none' }, patches: [],
      seed: 2222,
    },
  },
  {
    id: 'platinum-ogon',
    name: 'Purachina Ōgon',
    englishName: 'Platinum',
    description: 'Solid metallic white-silver with a mirror-bright back.',
    look: {
      body: { color: '#dfe4e8', back: '#f7f9fa', belly: '#bfc7ce' },
      fins: { color: '#eef1f3' },
      sheen: 1, scales: { kind: 'none' }, patches: [],
      seed: 2323,
    },
  },
  {
    id: 'orenji-ogon',
    name: 'Orenji Ōgon',
    englishName: 'Orange metallic',
    description: 'Solid metallic orange, glowing like a lantern under the water.',
    look: {
      body: { color: '#ef7f1a', back: '#ff9f3a', belly: '#cf5d10' },
      fins: { color: '#f79a3e' },
      sheen: 0.85, scales: { kind: 'none' }, patches: [],
      seed: 2424,
    },
  },
  {
    id: 'matsuba-ogon',
    name: 'Aka Matsuba Ōgon',
    englishName: 'Red pine-cone metallic',
    description: 'Metallic red-orange with a dark pine-cone net on every scale.',
    look: {
      body: { color: '#e04a1c', back: '#c93a12', belly: '#f07038' },
      fins: { color: '#f06a30' },
      sheen: 0.6,
      scales: { kind: 'net', color: '#5a1a0c', alpha: 0.6, span: 0.95 },
      patches: [],
      seed: 2525,
    },
  },
  {
    id: 'kujaku',
    name: 'Kujaku',
    englishName: 'Peacock',
    description: 'Metallic platinum with a dark pine-cone net and large orange-red patches netted too.',
    look: {
      body: { color: '#e3e7ea', back: '#f4f6f7', belly: '#c4ccd2' },
      fins: { color: '#eef1f3' },
      sheen: 0.7,
      scales: { kind: 'net', color: '#2e3136', alpha: 0.75, span: 0.8 },
      patches: [
        { color: '#e8561f', count: [1, 1], size: [0.07, 0.085], placement: 'head', lateral: 0.2, alpha: 0.95 },
        { color: '#e8561f', count: [3, 4], size: [0.08, 0.11], placement: 'body', lateral: 0.5, net: '#4a1c0c', alpha: 0.95 },
      ],
      seed: 2626,
    },
  },
  {
    id: 'hariwake',
    name: 'Hariwake',
    englishName: 'Two-tone metallic',
    description: 'Platinum with metallic gold-orange patches.',
    look: {
      body: { color: '#e6eaed', back: '#f7f8f9', belly: '#c8d0d6' },
      fins: { color: '#eef1f3' },
      sheen: 0.8, scales: { kind: 'none' },
      patches: [
        { color: '#f1a52a', count: [1, 1], size: [0.07, 0.09], placement: 'head', lateral: 0.2 },
        { color: '#f1a52a', count: [3, 4], size: [0.08, 0.11], placement: 'body', lateral: 0.45, wobble: 0.45 },
      ],
      seed: 2727,
    },
  },
  {
    id: 'kikusui',
    name: 'Kikusui',
    englishName: 'Chrysanthemum water',
    description: 'Scaleless Hariwake: platinum with wavy orange-yellow patterns along the flanks.',
    look: {
      body: { color: '#e8ecee', back: '#f7f8f9', belly: '#cdd4d9' },
      fins: { color: '#f1f2f3' },
      sheen: 0.75,
      scales: { kind: 'doitsu', color: '#c5ccd2', size: 0.05 },
      patches: [{ color: '#f0a030', count: [4, 5], size: [0.06, 0.09], placement: 'body', lateral: 0.9, wobble: 0.8, softness: 0.15 }],
      seed: 2828,
    },
  },
  {
    id: 'ai-goromo',
    name: 'Ai Goromo',
    englishName: 'Indigo-robed',
    description: 'A Kohaku whose red patches are "robed" in a fine indigo net; the white stays clean.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: C.hi, count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 3], size: [0.1, 0.13], placement: 'back', lateral: 0.35, net: '#1d2a55' },
      ],
      seed: 2929,
    },
  },
  {
    id: 'gin-rin-kohaku',
    name: 'Gin Rin Kohaku',
    englishName: 'Silver-scaled Kohaku',
    description: 'A Kohaku covered in sparkling, reflective (Gin Rin) scales.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0.15, scales: { kind: 'none' },
      patches: [
        { color: C.hi, count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 3], size: [0.095, 0.13], placement: 'back', lateral: 0.35 },
      ],
      ginRin: 0.9,
      seed: 3030,
    },
  },
  {
    id: 'gin-rin-showa',
    name: 'Gin Rin Shōwa',
    englishName: 'Silver-scaled Showa',
    description: 'A Showa with sparkling Gin Rin scales over the black, red and white.',
    look: {
      body: { color: C.sumi, belly: '#2a2b30' },
      fins: { color: C.fin, base: C.sumi },
      sheen: 0.15, scales: { kind: 'none' },
      patches: [
        { color: C.shiro, count: [3, 4], size: [0.07, 0.1], placement: 'body', lateral: 0.7, wobble: 0.5 },
        { color: C.hi, count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: C.hi, count: [2, 2], size: [0.08, 0.11], placement: 'back', lateral: 0.3 },
        { color: C.sumi, count: [2, 3], size: [0.035, 0.06], placement: 'back', lateral: 0.8, wobble: 0.6 },
      ],
      ginRin: 0.9,
      seed: 3131,
    },
  },
  {
    id: 'kin-showa',
    name: 'Kin Shōwa',
    englishName: 'Golden Showa',
    description: 'Metallic Showa: a golden lustre over black, red and white.',
    look: {
      body: { color: '#1d1a16', belly: '#35302a' },
      fins: { color: '#f3e7c8', base: '#1d1a16' },
      sheen: 0.65, scales: { kind: 'none' },
      patches: [
        { color: '#f4ecd6', count: [3, 4], size: [0.07, 0.1], placement: 'body', lateral: 0.7, wobble: 0.5 },
        { color: '#e8521e', count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: '#e8521e', count: [2, 2], size: [0.08, 0.11], placement: 'back', lateral: 0.3 },
        { color: '#1d1a16', count: [2, 3], size: [0.035, 0.06], placement: 'back', lateral: 0.8, wobble: 0.6 },
      ],
      seed: 3232,
    },
  },

  // ---- More colours: Goromo robes, rare solids, metallic Kawarimono and Hikari koi ----
  {
    id: 'doitsu-kohaku',
    name: 'Doitsu Kohaku',
    englishName: 'Scaleless Kohaku',
    description: 'A Kohaku with German (mirror) skin: no scales except one row along each side of the back; glossy, clean red.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0.12,
      scales: { kind: 'doitsu', color: '#dcc3b8', size: 0.052 },
      patches: [
        { color: '#e0301c', count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
        { color: '#e0301c', count: [2, 3], size: [0.095, 0.13], placement: 'back', lateral: 0.25 },
      ],
      seed: 3333,
    },
  },
  {
    id: 'beni-goromo',
    name: 'Beni Goromo',
    englishName: 'Crimson-robed',
    description: 'A Goromo whose red patches are robed in a deeper crimson net instead of indigo; clean white between them.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: '#d42a1c', count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1 },
        { color: '#d42a1c', count: [2, 3], size: [0.1, 0.13], placement: 'back', lateral: 0.35, net: '#7c0c0a' },
      ],
      seed: 3434,
    },
  },
  {
    id: 'budo-goromo',
    name: 'Budō Goromo',
    englishName: 'Grape-robed',
    description: 'White skin with clusters of wine-purple scales, bunched like grapes (budō), each scale edged darker.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: '#8a2c55', count: [1, 1], size: [0.075, 0.09], placement: 'head', lateral: 0.1, net: '#3a1030' },
        { color: '#7a2c5e', count: [3, 3], size: [0.06, 0.075], placement: 'back', lateral: 0.3, wobble: 0.45, alpha: 0.75 },
        { color: '#6b2056', count: [12, 15], size: [0.026, 0.036], placement: 'back', lateral: 0.45, wobble: 0.1, aspect: [0.9, 1.1], net: '#2a0c26' },
      ],
      seed: 3535,
    },
  },
  {
    id: 'sumi-goromo',
    name: 'Sumi Goromo',
    englishName: 'Ink-robed',
    description: 'A Goromo robed so heavily in sumi that the red patches read black, with only a glow of red beneath; white stays clean.',
    look: {
      body: { color: C.shiro, belly: C.shiroShade },
      fins: { color: C.fin },
      sheen: 0, scales: { kind: 'none' },
      patches: [
        { color: '#5e1b1c', count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1, net: '#0b0b0d' },
        { color: '#4c1719', count: [2, 3], size: [0.1, 0.13], placement: 'back', lateral: 0.35, net: '#0b0b0d' },
        { color: C.sumi, count: [2, 3], size: [0.035, 0.05], placement: 'back', lateral: 0.3, wobble: 0.5, alpha: 0.85 },
      ],
      seed: 3636,
    },
  },
  {
    id: 'soragoi',
    name: 'Soragoi',
    englishName: 'Sky koi',
    description: 'Solid slate grey-blue, the colour of a rain sky, with a pale net on every scale.',
    look: {
      body: { color: '#8595a6', back: '#687a8e', belly: '#a9b6c3' },
      fins: { color: '#a3b0bd', opacity: 0.75 },
      sheen: 0.05,
      scales: { kind: 'net', color: '#d4dee8', alpha: 0.5, scale: 0.065, span: 0.95 },
      patches: [],
      seed: 3737,
    },
  },
  {
    id: 'karashigoi',
    name: 'Karashigoi',
    englishName: 'Mustard koi',
    description: 'Solid, non-metallic mustard: deeper and browner than Kigoi, with a light net of scale edges.',
    look: {
      body: { color: '#cfa12c', back: '#b3861c', belly: '#dfbd5e' },
      fins: { color: '#d8b456', opacity: 0.8 },
      sheen: 0.05,
      scales: { kind: 'net', color: '#f1dc98', alpha: 0.5, scale: 0.065, span: 0.95 },
      patches: [],
      seed: 3838,
    },
  },
  {
    id: 'midorigoi',
    name: 'Midorigoi',
    englishName: 'Green koi',
    description: 'Translucent yellow-green Doitsu skin with a row of dark mirror scales each side of the back; the rarest colour in the pond.',
    look: {
      body: { color: '#a3b845', back: '#7f9a2e', belly: '#cfd98a', bellyReach: 0.35 },
      fins: { color: '#c3cf80', opacity: 0.6 },
      sheen: 0.3,
      scales: { kind: 'doitsu', color: '#3f5220' },
      patches: [],
      seed: 3939,
    },
  },
  {
    id: 'gin-rin-chagoi',
    name: 'Gin Rin Chagoi',
    englishName: 'Silver-scaled tea koi',
    description: 'A Chagoi covered in glittering Gin Rin scales.',
    look: {
      body: { color: '#a8894f', back: '#8a6f3c', belly: '#c6aa70' },
      fins: { color: '#b89a60' },
      sheen: 0.15,
      scales: { kind: 'net', color: '#d9c38f', alpha: 0.5, scale: 0.065, span: 0.95 },
      patches: [],
      ginRin: 0.6,
      seed: 4040,
    },
  },
  {
    id: 'gin-rin-ochiba',
    name: 'Gin Rin Ochiba',
    englishName: 'Silver-scaled autumn leaves',
    description: 'An Ochiba Shigure sprinkled with sparkling Gin Rin scales.',
    look: {
      body: { color: '#9aa6ae', back: '#7c8993', belly: '#b8c0c4' },
      fins: { color: '#c9b79a', base: '#8f7a5c' },
      sheen: 0.1,
      scales: { kind: 'net', color: '#59646e', alpha: 0.3, span: 0.9 },
      patches: [{ color: '#c47a36', count: [4, 5], size: [0.09, 0.13], placement: 'body', lateral: 0.45, softness: 0.3, wobble: 0.5 }],
      ginRin: 0.85,
      seed: 4141,
    },
  },
  {
    id: 'hajiro',
    name: 'Hajiro',
    englishName: 'White-tipped crow',
    description: 'A black Karasu whose pectoral fins and tail end in broad, crisp white tips.',
    look: {
      body: { color: '#141519', back: '#0c0d10', belly: '#23252b' },
      fins: { color: '#16171b', edge: { color: '#fbfbf8', width: 0.55 }, opacity: 0.95 },
      sheen: 0,
      scales: { kind: 'net', color: '#30343c', alpha: 0.55, span: 0.9 },
      patches: [],
      rim: { color: '#9fb4cc', strength: 0.45 },
      seed: 4242,
    },
  },
  {
    id: 'aka-hajiro',
    name: 'Aka Hajiro',
    englishName: 'White-tipped red',
    description: 'A solid red koi whose pectoral fins and tail end in white tips.',
    look: {
      body: { color: '#cf2a1c', back: '#b31f13', belly: '#e24d31' },
      fins: { color: '#d8412b', edge: { color: '#fbfaf6', width: 0.5 }, opacity: 0.9 },
      sheen: 0,
      scales: { kind: 'net', color: '#f07458', alpha: 0.25, scale: 0.065, span: 0.9 },
      patches: [],
      seed: 4343,
    },
  },
  {
    id: 'matsukawabake',
    name: 'Matsukawabake',
    englishName: 'Changing black and white',
    description: 'Black and white with soft, smoky edges and a grey net over the white; the black grows and fades with the seasons.',
    look: {
      body: { color: '#eceeee', belly: '#d2d6d9' },
      fins: { color: '#eef0f0', base: '#2a2c30' },
      sheen: 0,
      scales: { kind: 'net', color: '#4a4f58', alpha: 0.35, span: 0.9 },
      patches: [
        { color: '#1a1b1f', count: [3, 4], size: [0.07, 0.11], placement: 'body', lateral: 0.6, wobble: 0.6, softness: 0.5, alpha: 0.92 },
        { color: '#1a1b1f', count: [1, 1], size: [0.05, 0.065], placement: 'head', lateral: 0.3, wobble: 0.5, softness: 0.4, alpha: 0.85 },
      ],
      seed: 4444,
    },
  },
  {
    id: 'kikokuryu',
    name: 'Kikokuryū',
    englishName: 'Metallic cloud dragon',
    description: 'A metallic Kumonryu: scaleless platinum skin with swirling black clouds, black mirror scales along the back and a black-flecked head.',
    look: {
      body: { color: '#e4e9ed', back: '#f6f8fa', belly: '#c0c9d1' },
      fins: { color: '#eceff2', base: '#2c2f36' },
      sheen: 0.75,
      scales: { kind: 'doitsu', color: '#15171b' },
      patches: [
        { color: '#16181c', count: [5, 6], size: [0.06, 0.1], placement: 'body', lateral: 0.85, wobble: 0.85 },
        { color: '#16181c', count: [2, 2], size: [0.025, 0.04], placement: 'head', lateral: 0.5, wobble: 0.7 },
      ],
      seed: 4545,
    },
  },
  {
    id: 'kin-kikokuryu',
    name: 'Kin Kikokuryū',
    englishName: 'Golden cloud dragon',
    description: 'A Kikokuryu with a golden head and back: metallic gold skin with black clouds and black mirror scales.',
    look: {
      body: { color: '#f2bb2e', back: '#ffdc6a', belly: '#d99a22' },
      fins: { color: '#f5d372', base: '#2c2f36' },
      sheen: 0.85,
      scales: { kind: 'doitsu', color: '#15171b' },
      patches: [
        { color: '#16181c', count: [5, 6], size: [0.06, 0.1], placement: 'body', lateral: 0.85, wobble: 0.85 },
        { color: '#16181c', count: [2, 2], size: [0.025, 0.04], placement: 'head', lateral: 0.5, wobble: 0.7 },
      ],
      seed: 4646,
    },
  },
  {
    id: 'beni-kikokuryu',
    name: 'Beni Kikokuryū',
    englishName: 'Red metallic cloud dragon',
    description: 'A Kikokuryu with bright orange-red over the platinum and black: scaleless, metallic, three colours.',
    look: {
      body: { color: '#e4e9ed', back: '#f6f8fa', belly: '#c0c9d1' },
      fins: { color: '#eceff2', base: '#2c2f36' },
      sheen: 0.7,
      scales: { kind: 'doitsu', color: '#15171b' },
      patches: [
        { color: '#ec5a1e', count: [1, 1], size: [0.075, 0.09], placement: 'head', lateral: 0.15 },
        { color: '#ec5a1e', count: [3, 3], size: [0.1, 0.125], placement: 'back', lateral: 0.35, wobble: 0.5 },
        { color: '#16181c', count: [3, 4], size: [0.045, 0.075], placement: 'body', lateral: 0.9, wobble: 0.8 },
      ],
      seed: 4747,
    },
  },
  {
    id: 'kin-ki-utsuri',
    name: 'Kin Ki Utsuri',
    englishName: 'Golden yellow reflection',
    description: 'A metallic Ki Utsuri: black base with glowing gold-orange patches and black fin roots.',
    look: {
      body: { color: '#1d1a16', belly: '#35302a' },
      fins: { color: '#f4c35c', base: '#1d1a16' },
      sheen: 0.7, scales: { kind: 'none' },
      patches: [
        { color: '#f0a530', count: [4, 5], size: [0.08, 0.12], placement: 'body', lateral: 0.6, wobble: 0.5 },
        { color: '#1d1a16', count: [3, 4], size: [0.03, 0.05], placement: 'body', lateral: 0.9, wobble: 0.7 },
      ],
      seed: 4848,
    },
  },
  {
    id: 'hikari-utsuri',
    name: 'Hikari Utsuri',
    englishName: 'Metallic reflection (Gin Shiro)',
    description: 'A metallic Shiro Utsuri: silver-platinum over ink black, black on the head and at the fin roots.',
    look: {
      body: { color: '#1a1b1f', belly: '#2e3036' },
      fins: { color: '#eef1f3', base: '#1a1b1f' },
      sheen: 0.7, scales: { kind: 'none' },
      patches: [
        { color: '#e6eaee', count: [4, 5], size: [0.07, 0.11], placement: 'body', lateral: 0.7, wobble: 0.55 },
        { color: '#1a1b1f', count: [1, 1], size: [0.03, 0.045], placement: 'head', lateral: 0.3, aspect: [0.4, 0.6], wobble: 0.6 },
        { color: '#1a1b1f', count: [3, 4], size: [0.03, 0.05], placement: 'body', lateral: 0.9, wobble: 0.7 },
      ],
      seed: 4949,
    },
  },
  {
    id: 'yamato-nishiki',
    name: 'Yamato Nishiki',
    englishName: 'Metallic Sanke',
    description: 'A metallic Sanke: platinum skin with lustrous orange-red patches and small black spots; no black on the head.',
    look: {
      body: { color: '#e4e9ed', back: '#f6f8fa', belly: '#c3ccd3' },
      fins: { color: '#eef1f3' },
      sheen: 0.75, scales: { kind: 'none' },
      patches: [
        { color: '#e8521f', count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1 },
        { color: '#e8521f', count: [2, 3], size: [0.09, 0.12], placement: 'back', lateral: 0.35 },
        { color: '#1a1b1f', count: [4, 6], size: [0.022, 0.04], placement: 'back', lateral: 0.75, wobble: 0.55 },
        { color: '#1a1b1f', count: [1, 2], size: [0.02, 0.03], placement: 'tail', lateral: 0.6, wobble: 0.5 },
      ],
      seed: 5050,
    },
  },
  {
    id: 'heisei-nishiki',
    name: 'Heisei Nishiki',
    englishName: 'Scaleless metallic Sanke',
    description: 'The Doitsu Yamato Nishiki: metallic platinum, orange-red and black, with black mirror scales along the back.',
    look: {
      body: { color: '#e4e9ed', back: '#f6f8fa', belly: '#c3ccd3' },
      fins: { color: '#eef1f3' },
      sheen: 0.8,
      scales: { kind: 'doitsu', color: '#17181c' },
      patches: [
        { color: '#ea561f', count: [1, 1], size: [0.08, 0.095], placement: 'head', lateral: 0.1 },
        { color: '#ea561f', count: [2, 3], size: [0.09, 0.12], placement: 'back', lateral: 0.4 },
        { color: '#17181c', count: [2, 3], size: [0.03, 0.05], placement: 'back', lateral: 0.8, wobble: 0.55 },
      ],
      seed: 5151,
    },
  },
  {
    id: 'tora-ogon',
    name: 'Tora Ōgon',
    englishName: 'Tiger gold',
    description: 'Metallic gold with bold black (tiger) markings over the back; a clean golden head.',
    look: {
      body: { color: '#f0bb2e', back: '#ffd966', belly: '#d8961a' },
      fins: { color: '#f5cd58' },
      sheen: 0.85, scales: { kind: 'none' },
      patches: [
        { color: '#17181c', count: [4, 6], size: [0.035, 0.07], placement: 'back', lateral: 0.75, wobble: 0.7, aspect: [0.8, 1.6] },
        { color: '#17181c', count: [1, 2], size: [0.025, 0.04], placement: 'tail', lateral: 0.6, wobble: 0.6 },
      ],
      seed: 5252,
    },
  },
  {
    id: 'lemon-hariwake',
    name: 'Lemon Hariwake',
    englishName: 'Lemon two-tone metallic',
    description: 'Platinum with pale metallic lemon-yellow patches; cooler and lighter than the gold Hariwake.',
    look: {
      body: { color: '#e6eaed', back: '#f7f8f9', belly: '#c8d0d6' },
      fins: { color: '#eef1f3' },
      sheen: 0.8, scales: { kind: 'none' },
      patches: [
        { color: '#f2e04a', count: [1, 1], size: [0.07, 0.09], placement: 'head', lateral: 0.2 },
        { color: '#f2e04a', count: [3, 4], size: [0.08, 0.11], placement: 'body', lateral: 0.45, wobble: 0.45 },
      ],
      seed: 5353,
    },
  },
];

// ============================================================================
// Match-3 set: five koi, each readable at 48 px by ONE dominant colour
// ============================================================================

/** The five piece colours of Koi Splash, in board order. */
export const MATCH3_SET: KoiVariety[] = [
  {
    id: 'm3-red',
    name: 'Benigoi',
    englishName: 'Red',
    dominant: '#e5321f',
    description: 'Match-3 RED: a bright, chubby Benigoi, solid red with warm fins.',
    look: {
      build: 0.21,
      body: { color: '#e5321f', back: '#c92015', belly: '#ff6b45', bellyReach: 0.35 },
      fins: { color: '#ff7a55', opacity: 0.85 },
      sheen: 0.3, scales: { kind: 'none' }, patches: [],
      seed: 9001,
    },
  },
  {
    id: 'm3-gold',
    name: 'Yamabuki Ōgon',
    englishName: 'Gold',
    dominant: '#ffc629',
    description: 'Match-3 GOLD: a Yamabuki Ogon with strong metallic lustre.',
    look: {
      build: 0.21,
      body: { color: '#ffc629', back: '#ffe27a', belly: '#e59612', bellyReach: 0.3 },
      fins: { color: '#ffd650', opacity: 0.85 },
      sheen: 1, scales: { kind: 'none' }, patches: [],
      seed: 9002,
    },
  },
  {
    id: 'm3-white',
    name: 'Tanchō',
    englishName: 'White',
    dominant: '#ffffff',
    description: 'Match-3 WHITE: a snow-white Tancho with its small red crown.',
    look: {
      build: 0.21,
      body: { color: '#ffffff', belly: '#dfe6ee', bellyReach: 0.3 },
      fins: { color: '#ffffff', opacity: 0.85 },
      sheen: 0.2, scales: { kind: 'none' }, patches: [],
      headSpot: { color: '#e5321f', size: 0.075 },
      seed: 9003,
    },
  },
  {
    id: 'm3-blue',
    name: 'Asagi',
    englishName: 'Blue',
    dominant: '#5aa6ec',
    description: 'Match-3 BLUE: a brightened Asagi, sky-blue netted back, just a touch of orange at the cheeks and fin roots.',
    look: {
      build: 0.21,
      body: { color: '#72b8f2', back: '#3f8ad6', belly: '#ff8a4a', bellyReach: 0.14 },
      fins: { color: '#a9d6fa', base: '#ff9a5c', opacity: 0.85 },
      sheen: 0.25,
      scales: { kind: 'net', color: '#e2f2ff', alpha: 0.7, scale: 0.075, span: 0.85 },
      patches: [],
      seed: 9004,
    },
  },
  {
    id: 'm3-black',
    name: 'Karasugoi',
    englishName: 'Black',
    dominant: '#1c1f28',
    description: 'Match-3 BLACK: a Karasu with bright white fins and a pale rim light, so it never reads as a hole in dark water.',
    look: {
      build: 0.21,
      body: { color: '#161820', back: '#0e1015', belly: '#2c3240', bellyReach: 0.3 },
      fins: { color: '#ffffff', base: '#2a2e38', opacity: 0.95 },
      sheen: 0.35,
      scales: { kind: 'net', color: '#3c4454', alpha: 0.4, scale: 0.075, span: 0.85 },
      patches: [],
      rim: { color: '#d6e8ff', strength: 1 },
      seed: 9005,
    },
  },
];

// ============================================================================
// Dream koi: fantasy colours no real koi has, for extra match-3 pieces
// ============================================================================

/**
 * Ten fantasy koi in the same painted style. Each reads at 48 px as ONE colour
 * (its `dominant`) that differs from every other dream koi and from MATCH3_SET,
 * so any of them can join a board as an extra piece colour.
 */
export const DREAM_KOI: KoiVariety[] = [
  {
    id: 'dream-jade',
    name: 'Jade',
    englishName: 'Jade green',
    dominant: '#36bf48',
    description: 'Fantasy: polished jade green with a pale spring-green net over the back.',
    look: {
      build: 0.21,
      body: { color: '#36bf48', back: '#1f9a31', belly: '#a4ec86', bellyReach: 0.3 },
      fins: { color: '#b0f09c', opacity: 0.8 },
      sheen: 0.4,
      scales: { kind: 'net', color: '#e2ffd2', alpha: 0.5, scale: 0.075, span: 0.85 },
      patches: [],
      seed: 9101,
    },
  },
  {
    id: 'dream-amethyst',
    name: 'Amethyst',
    englishName: 'Violet',
    dominant: '#8a4ce0',
    description: 'Fantasy: deep crystal violet with a lilac sheen and a faceted net.',
    look: {
      build: 0.21,
      body: { color: '#8a4ce0', back: '#6429bf', belly: '#c49bff', bellyReach: 0.3 },
      fins: { color: '#c7a4ff', opacity: 0.8 },
      sheen: 0.45,
      scales: { kind: 'net', color: '#e6d4ff', alpha: 0.45, scale: 0.075, span: 0.85 },
      patches: [],
      seed: 9102,
    },
  },
  {
    id: 'dream-rose-gold',
    name: 'Rose Gold',
    englishName: 'Pink metallic',
    dominant: '#f39ab0',
    description: 'Fantasy: a mirror-bright Ogon in rose-gold pink.',
    look: {
      build: 0.21,
      body: { color: '#f39ab0', back: '#ffd0da', belly: '#d9667f', bellyReach: 0.3 },
      fins: { color: '#ffbccb', opacity: 0.85 },
      sheen: 1, scales: { kind: 'none' }, patches: [],
      seed: 9103,
    },
  },
  {
    id: 'dream-teal',
    name: 'Teal Lagoon',
    englishName: 'Teal',
    dominant: '#0eaab4',
    description: 'Fantasy: deep lagoon teal with an aqua net, like sunlight through shallow water.',
    look: {
      build: 0.21,
      body: { color: '#0eaab4', back: '#067d8a', belly: '#5ee4ea', bellyReach: 0.3 },
      fins: { color: '#7eecf0', opacity: 0.8 },
      sheen: 0.3,
      scales: { kind: 'net', color: '#c6fbff', alpha: 0.5, scale: 0.075, span: 0.85 },
      patches: [],
      seed: 9104,
    },
  },
  {
    id: 'dream-midnight',
    name: 'Midnight',
    englishName: 'Night blue',
    dominant: '#1f36a0',
    description: 'Fantasy: deep royal night-blue sprinkled with tiny golden stars.',
    look: {
      build: 0.21,
      body: { color: '#1f36a0', back: '#101c66', belly: '#3558cc', bellyReach: 0.3 },
      fins: { color: '#6d8cf0', edge: { color: '#b8c8ff', width: 0.3 }, opacity: 0.85 },
      sheen: 0.35, scales: { kind: 'none' },
      patches: [
        { color: '#fff3c0', count: [10, 13], size: [0.011, 0.017], placement: 'body', lateral: 0.8, wobble: 0, aspect: [1, 1] },
      ],
      rim: { color: '#a9bcff', strength: 0.6 },
      seed: 9105,
    },
  },
  {
    id: 'dream-sunset',
    name: 'Sunset',
    englishName: 'Orange to pink',
    dominant: '#ff8f26',
    description: 'Fantasy: a glowing orange head fading into a hot-pink tail, like the sky at dusk.',
    look: {
      build: 0.21,
      body: { color: '#ff9a1e', back: '#ff7c0e', belly: '#ffcc55', bellyReach: 0.3, fade: { color: '#ff3f9a', from: 0.32, to: 0.9 } },
      fins: { color: '#ff7ec0', base: '#ffb040', opacity: 0.85 },
      sheen: 0.4, scales: { kind: 'none' }, patches: [],
      seed: 9106,
    },
  },
  {
    id: 'dream-frost',
    name: 'Frost',
    englishName: 'Ice blue',
    dominant: '#86e2ef',
    description: 'Fantasy: pale glacier aqua with a white rime of frost along every scale edge.',
    look: {
      build: 0.21,
      body: { color: '#86e2ef', back: '#c4f5fc', belly: '#33b8d4', bellyReach: 0.35 },
      fins: { color: '#d0f6fc', opacity: 0.85 },
      sheen: 0.55,
      scales: { kind: 'net', color: '#ffffff', alpha: 0.6, scale: 0.075, span: 0.85 },
      patches: [],
      seed: 9107,
    },
  },
  {
    id: 'dream-ember',
    name: 'Ember',
    englishName: 'Glowing coal',
    dominant: '#a3160e',
    description: 'Fantasy: a smouldering dark-red koi whose flanks and fin tips glow gold like a live coal.',
    look: {
      build: 0.21,
      body: { color: '#a3160e', back: '#5a0906', belly: '#ffa51f', bellyReach: 0.3 },
      fins: { color: '#7a1109', edge: { color: '#ffc03a', width: 0.45 }, opacity: 0.9 },
      sheen: 0.2, scales: { kind: 'none' },
      patches: [
        { color: '#ffcf5a', count: [5, 7], size: [0.01, 0.016], placement: 'back', lateral: 0.5, wobble: 0, aspect: [1, 1], alpha: 0.9 },
      ],
      rim: { color: '#ffc94a', strength: 0.9 },
      seed: 9108,
    },
  },
  {
    id: 'dream-moonstone',
    name: 'Moonstone',
    englishName: 'Pearly lilac',
    dominant: '#c79ff0',
    description: 'Fantasy: pearly lilac with a milky blue shimmer, like a moonstone turned in the light.',
    look: {
      build: 0.21,
      body: { color: '#c79ff0', back: '#eadbff', belly: '#9a78d8', bellyReach: 0.3 },
      fins: { color: '#e4d2ff', opacity: 0.85 },
      sheen: 0.55, scales: { kind: 'none' }, patches: [],
      rim: { color: '#d8f0ff', strength: 0.5 },
      seed: 9109,
    },
  },
  {
    id: 'dream-aurora',
    name: 'Aurora',
    englishName: 'Teal to purple',
    dominant: '#7a6cf0',
    description: 'Fantasy: northern lights on a koi, luminous sea-green at the head flowing into violet at the tail.',
    look: {
      build: 0.21,
      body: { color: '#3ae89a', back: '#1cc27a', belly: '#a0f8cc', bellyReach: 0.3, fade: { color: '#a24cf4', from: 0.26, to: 0.84 } },
      fins: { color: '#bf8aff', base: '#6af0b8', opacity: 0.85 },
      sheen: 0.45, scales: { kind: 'none' }, patches: [],
      seed: 9110,
    },
  },
];

/** Relative luminance of a hex colour, 0 (black) .. 1 (white). */
function luma(hex: Hex): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/**
 * Four pattern variations of every dream colour, built from the real koi
 * recipes: Kohaku-style patches on white, a Tanchō head spot, Sumi (black)
 * markings (white "Snow" markings on the dark colours) and Gin Rin sparkle.
 * Ids are `<dream id>-kohaku|-tancho|-sumi|-ginrin`; each keeps its colour's
 * `dominant`, so a variation can stand in for its base colour on a board.
 */
export const DREAM_VARIANTS: KoiVariety[] = DREAM_KOI.flatMap((base, k) => {
  const b = base.look;
  const main = base.dominant ?? b.body.color;
  const headColor = b.body.color;
  const tailColor = b.body.fade?.color ?? b.body.color;
  const dark = luma(main) < 0.3;
  const mark = dark ? C.shiro : C.sumi;
  const seed = 9300 + k * 10;
  const white = { color: C.shiro, belly: C.shiroShade };
  return [
    {
      id: `${base.id}-kohaku`,
      name: `${base.name} Kohaku`,
      englishName: `${base.name} on white`,
      dominant: main,
      description: `Fantasy Kohaku: snow-white skin with ${base.name.toLowerCase()} patches stepping down the back.`,
      look: {
        ...(b.build === undefined ? {} : { build: b.build }),
        body: white,
        fins: { color: C.fin },
        sheen: b.sheen * 0.4, scales: { kind: 'none' },
        patches: [
          { color: headColor, count: [1, 1], size: [0.085, 0.1], placement: 'head', lateral: 0.1 },
          { color: tailColor, count: [2, 3], size: [0.095, 0.13], placement: 'back', lateral: 0.2 },
        ],
        seed: seed + 1,
      },
    },
    {
      id: `${base.id}-tancho`,
      name: `${base.name} Tanchō`,
      englishName: `${base.name} crown`,
      dominant: main,
      description: `Fantasy Tanchō: pure white with one round ${base.name.toLowerCase()} spot on the head.`,
      look: {
        ...(b.build === undefined ? {} : { build: b.build }),
        body: white,
        fins: { color: C.fin },
        sheen: b.sheen * 0.4, scales: { kind: 'none' }, patches: [],
        headSpot: { color: main, size: 0.08 },
        seed: seed + 2,
      },
    },
    {
      id: `${base.id}-sumi`,
      name: dark ? `${base.name} Snow` : `${base.name} Sumi`,
      englishName: dark ? `${base.name} with white` : `${base.name} with black`,
      dominant: main,
      description: dark
        ? `Fantasy: ${base.name.toLowerCase()} skin broken by snow-white patches, like a Hajiro turned inside out.`
        : `Fantasy: ${base.name.toLowerCase()} skin with ink-black sumi patches, Showa style.`,
      look: {
        ...b,
        fins: { ...b.fins, base: mark },
        patches: [
          ...b.patches,
          { color: mark, count: [2, 3], size: [0.06, 0.09], placement: 'body', lateral: 0.45 },
          { color: mark, count: [1, 1], size: [0.05, 0.065], placement: 'head', lateral: 0.3 },
        ],
        seed: seed + 3,
      },
    },
    {
      id: `${base.id}-ginrin`,
      name: `${base.name} Gin Rin`,
      englishName: `Sparkling ${base.name.toLowerCase()}`,
      dominant: main,
      description: `Fantasy Gin Rin: ${base.name.toLowerCase()} covered in glittering mirror scales.`,
      look: { ...b, sheen: Math.min(1, b.sheen + 0.25), ginRin: 0.9, seed: seed + 4 },
    },
  ];
});

const BY_ID = new Map<string, KoiVariety>([...KOI_VARIETIES, ...MATCH3_SET, ...DREAM_KOI, ...DREAM_VARIANTS].map(v => [v.id, v]));

/** Look up any variety (real, match-3 set or dream koi) by id. Throws on an unknown id. */
export function getVariety(id: string): KoiVariety {
  const v = BY_ID.get(id);
  if (!v) throw new Error(`koiBank: unknown variety '${id}'`);
  return v;
}

// ============================================================================
// Public painter API
// ============================================================================

/**
 * Paint one koi, top-down, into the square (0,0)-(size,size) of the current
 * transform. Deterministic from variety + seed; the tail wag only bends the pose.
 */
export function paintKoi(ctx: Ctx, variety: KoiVariety, opts: PaintOptions): void {
  const size = opts.size;
  const wag = clamp(opts.tailWag ?? 0, -1, 1);
  const look = opts.build != null ? { ...variety.look, build: clamp(opts.build, 0.1, 0.32) } : variety.look;
  const plan = planMarkings(look, opts.seed ?? 0); // all randomness happens here, before the pose
  const body = makeBody(look, size, wag);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(FACING_ANGLE[opts.facing ?? 'up']);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const parts = opts.parts ?? 'all';
  if (opts.shadow !== false && parts === 'all') paintDropShadow(ctx, body);
  if (parts !== 'body') {
    paintFins(ctx, look.fins, body, wag);
    paintTail(ctx, look.fins, body, wag);
  }
  if (parts !== 'fins') {
    paintBody(ctx, look, body, plan);
    paintDorsalFin(ctx, look.fins, body);
    paintHeadDetails(ctx, look, body);
  }

  ctx.restore();
}

/** Paint a koi into a fresh canvas (ready for PIXI.Texture.from(canvas)). */
export function bakeKoi(variety: KoiVariety, opts: BakeOptions): HTMLCanvasElement {
  const res = opts.resolution ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.max(1, Math.ceil(opts.size * res));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('koiBank: 2D canvas not available');
  ctx.scale(res, res);
  paintKoi(ctx, variety, opts);
  return canvas;
}

/**
 * Bake a looping swim cycle: `frames` poses of one full tail beat (for an
 * AnimatedSprite). Frame i uses tailWag = sin(2 PI i / frames).
 */
export function bakeSwimCycle(variety: KoiVariety, opts: BakeOptions, frames = 8): HTMLCanvasElement[] {
  return Array.from({ length: frames }, (_, i) =>
    bakeKoi(variety, { ...opts, tailWag: Math.sin((i / frames) * Math.PI * 2) }));
}

// ============================================================================
// Body geometry
//
// The fish is modelled in its own frame, head towards +x, centred on the
// origin. Every point on the skin is addressed by (t, s):
//   t: 0 at the snout .. 1 at the tail root (along the spine)
//   s: -1 .. +1 across the body (0 = on the spine, +-1 = the outline)
// The spine bends with the tail wag, and everything painted on the skin goes
// through `point(t, s)`, so patches, scales and fins all bend with the fish.
// ============================================================================

interface Vec { x: number; y: number }

interface Body {
  size: number;
  /** Body length (snout to tail root) in canvas units. */
  L: number;
  /** Maximum half-width in canvas units. */
  W: number;
  /** Half-width / body length. */
  build: number;
  halfWidth(t: number): number;
  point(t: number, s: number): Vec;
  /** Direction of the spine at t, pointing towards the tail, in radians. */
  angleToTail(t: number): number;
  /**
   * Traces the outline of the band |s| <= k (k = 1: the whole body). Starts a new
   * path unless `append` is set (used to build compound even-odd paths).
   */
  trace(ctx: Ctx, k?: number, append?: boolean): void;
}

/**
 * Body width as a fraction of body length for varieties that do not set their own: a balance between the slim
 * library koi (detailed, elegant) and the chubby match-3 koi (easy to read at 48 px).
 */
export const DEFAULT_BUILD = 0.2;

const SNOUT_X = 0.41; // snout position, fraction of the square
const BODY_LEN = 0.6; // body length (without tail), fraction of the square
const HEAD_CAP = 0.33; // snout-to-widest-point, fraction of body length
const PEDUNCLE = 0.28; // tail-root half-width, fraction of the max half-width
const OUTLINE_STEPS = 40;

function makeBody(look: KoiLook, size: number, wag: number): Body {
  const build = look.build ?? DEFAULT_BUILD;
  const L = BODY_LEN * size;
  const W = build * L;
  const x0 = SNOUT_X * size;
  const bend = wag * 0.16 * L; // sideways offset of the tail root at full wag

  // Width profile: a rounded head cap, full shoulders, a smooth taper to the tail root.
  const halfWidth = (t: number): number => {
    if (t <= 0) return 0;
    if (t < HEAD_CAP) {
      const q = (HEAD_CAP - t) / HEAD_CAP;
      return W * Math.pow(1 - q * q, 0.45); // a blunt, rounded snout
    }
    const p = Math.min(1, (t - HEAD_CAP) / (1 - HEAD_CAP));
    const ease = 0.5 * (1 + Math.cos(Math.PI * Math.pow(p, 1.35)));
    return W * (PEDUNCLE + (1 - PEDUNCLE) * ease);
  };
  // Spine: straight through the head, bending quadratically towards the tail.
  const spineY = (t: number): number => {
    const q = Math.max(0, (t - 0.25) / 0.75);
    return bend * q * q - bend * 0.08 * Math.max(0, 0.3 - t); // the head counter-sways a touch
  };
  const spineSlope = (t: number): number => (bend * 2 * Math.max(0, (t - 0.25) / 0.75)) / 0.75; // dy/dt

  const point = (t: number, s: number): Vec => {
    const dy = spineSlope(t);
    const len = Math.hypot(L, dy);
    const w = s * halfWidth(t);
    // normal of the tangent (-L, dy) is (dy, L) / len
    return { x: x0 - t * L + (dy / len) * w, y: spineY(t) + (L / len) * w };
  };

  const trace = (ctx: Ctx, k = 1, append = false): void => {
    const ring: Vec[] = [];
    for (let i = 0; i <= OUTLINE_STEPS; i++) ring.push(point(stepT(i), k));
    for (let i = OUTLINE_STEPS; i >= 0; i--) ring.push(point(stepT(i), -k));
    smoothClosed(ctx, ring, !append);
  };

  return {
    size, L, W, build, halfWidth, point, trace,
    angleToTail: t => Math.atan2(spineSlope(t), -L),
  };
}

/** Outline samples, denser at the snout and tail root where the curve turns fastest. */
function stepT(i: number): number {
  return 0.5 - 0.5 * Math.cos((Math.PI * i) / OUTLINE_STEPS);
}

// ============================================================================
// Markings plan: every random choice, made once per (variety, seed)
// ============================================================================

/** A blob outline in skin coordinates. */
type SkinShape = Array<{ t: number; s: number }>;

interface Plan {
  layers: Array<{ layer: PatchLayer; blobs: SkinShape[] }>;
  sparkles: Array<{ t: number; s: number; r: number }>;
  glints: Array<{ t: number; s: number; r: number; a: number }>;
}

const PLACEMENT_RANGE: Record<Placement, [number, number]> = {
  head: [0.1, 0.16],
  shoulder: [0.2, 0.42],
  back: [0.3, 0.74],
  tail: [0.7, 0.9],
  body: [0.14, 0.88],
};

const BLOB_POINTS = 32;
const GIN_RIN_SCALE = 0.042; // scale size (body lengths) of the Gin Rin sparkle grid

function planMarkings(look: KoiLook, seed: number): Plan {
  const rng = mulberry32(hashSeeds(look.seed, seed));
  const build = look.build ?? DEFAULT_BUILD;

  const layers = look.patches.map(layer => {
    const [lo, hi] = PLACEMENT_RANGE[layer.placement];
    const n = randInt(rng, layer.count[0], layer.count[1]);
    const blobs: SkinShape[] = [];
    for (let i = 0; i < n; i++) {
      // Stratified along the range, so blobs step down the fish instead of clumping.
      const t0 = lerp(lo, hi, (i + rng()) / Math.max(1, n));
      const s0 = (rng() * 2 - 1) * (layer.lateral ?? 0.4);
      const r = lerp(layer.size[0], layer.size[1], rng());
      const [aLo, aHi] = layer.aspect ?? [1, 1.5];
      const aspect = lerp(aLo, aHi, rng());
      blobs.push(blobShape(rng, t0, s0, r, aspect, layer.wobble ?? 0.35, build));
    }
    return { layer, blobs };
  });

  // Gin Rin sparkles sit on the scale grid, so they line up in rows like real reflective scales.
  const sparkles: Plan['sparkles'] = [];
  const ginRin = look.ginRin ?? 0;
  if (ginRin > 0) {
    const across = (GIN_RIN_SCALE * 0.9) / build;
    let row = 0;
    for (let t = 0.26; t < 0.92; t += GIN_RIN_SCALE * 0.75, row++) {
      for (let s = -0.8 + (row % 2 ? across / 2 : 0); s <= 0.8; s += across) {
        if (rng() < ginRin * 0.5) sparkles.push({ t, s, r: GIN_RIN_SCALE * lerp(0.55, 0.8, rng()) });
      }
    }
  }

  const glints: Plan['glints'] = [];
  const nGlints = Math.round(look.sheen * 26);
  for (let i = 0; i < nGlints; i++) {
    glints.push({ t: lerp(0.24, 0.92, rng()), s: (rng() * 2 - 1) * 0.7, r: lerp(0.02, 0.035, rng()), a: lerp(0.3, 0.8, rng()) });
  }
  return { layers, sparkles, glints };
}

/** An organic blob: an ellipse with a few seeded harmonics on its radius. */
function blobShape(rng: () => number, t0: number, s0: number, r: number, aspect: number, wobble: number, build: number): SkinShape {
  const phases = [rng(), rng(), rng()].map(p => p * Math.PI * 2);
  const amps = [0.2, 0.13, 0.08].map(a => a * wobble * (0.6 + rng() * 0.8));
  const shape: SkinShape = [];
  for (let k = 0; k < BLOB_POINTS; k++) {
    const a = (k / BLOB_POINTS) * Math.PI * 2;
    const rr = r * (1 + amps[0]! * Math.sin(2 * a + phases[0]!) + amps[1]! * Math.sin(3 * a + phases[1]!) + amps[2]! * Math.sin(5 * a + phases[2]!));
    shape.push({
      t: clamp(t0 + Math.cos(a) * rr, -0.05, 1.05),
      s: clamp(s0 + (Math.sin(a) * rr * aspect) / build, -1.35, 1.35), // across: body lengths -> skin units
    });
  }
  return shape;
}

// ============================================================================
// Painting passes
// ============================================================================

const FACING_ANGLE: Record<Facing, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

function paintDropShadow(ctx: Ctx, body: Body): void {
  // The shadow falls "down the screen" whatever the facing, so its offset is in device space.
  const u = body.size;
  fillSoft(ctx, () => body.trace(ctx, 1.25), 'rgba(0,10,28,0.42)', 0.06 * u, { x: 0, y: 0.045 * u });
}

/** Pectoral and pelvic fins, both sides, behind the body. */
function paintFins(ctx: Ctx, fins: FinLook, body: Body, wag: number): void {
  for (const side of [-1, 1]) {
    // pelvic: small, near the middle, swept back
    drawFin(ctx, fins, body, body.point(0.58, side * 0.7), body.angleToTail(0.58) - side * 0.62, side, 0.1 * body.L);
    // pectoral: big rounded paddles behind the head; they flutter against the tail beat
    const flutter = side * wag * 0.12;
    drawFin(ctx, fins, body, body.point(0.27, side * 0.82), body.angleToTail(0.27) - side * 0.98 + flutter, side, 0.23 * body.L * (0.75 + body.build * 1.6));
  }
}

function drawFin(ctx: Ctx, fins: FinLook, _body: Body, at: Vec, angle: number, side: number, F: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  if (side > 0) ctx.scale(1, -1); // mirror the +y fin so its leading edge still faces the head
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, 0.14 * F);
    ctx.quadraticCurveTo(0.55 * F, 0.34 * F, 0.93 * F, 0.2 * F); // leading edge
    ctx.quadraticCurveTo(1.14 * F, -0.08 * F, 0.9 * F, -0.3 * F); // rounded tip
    ctx.quadraticCurveTo(0.5 * F, -0.4 * F, 0.04 * F, -0.12 * F); // trailing edge
    ctx.closePath();
  };
  ctx.fillStyle = finGradient(ctx, fins, F);
  path();
  ctx.fill();
  // fin rays
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(fins.color, -0.35), 0.22);
  ctx.lineWidth = Math.max(0.5, 0.025 * F);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const e = lerp(0.26, -0.34, i / 5);
    ctx.moveTo(0.02 * F, 0);
    ctx.lineTo(1.1 * F, e * F * 1.2);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ffffff', 0.28);
  ctx.lineWidth = Math.max(0.5, 0.03 * F);
  path();
  ctx.stroke();
  ctx.restore();
}

/** Translucent fin fill: root colour -> fin colour -> optional contrasting edge. */
function finGradient(ctx: Ctx, fins: FinLook, len: number): CanvasGradient {
  const op = fins.opacity ?? 0.8;
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, rgba(fins.base ?? fins.color, Math.min(1, op + 0.12)));
  g.addColorStop(fins.base ? 0.45 : 0.3, rgba(fins.color, op));
  if (fins.edge) {
    g.addColorStop(Math.max(0.35, 0.92 - fins.edge.width), rgba(fins.color, op * 0.9));
    g.addColorStop(Math.min(0.99, 1.02 - fins.edge.width * 0.7), rgba(fins.edge.color, 0.95));
    g.addColorStop(1, rgba(fins.edge.color, 0.95));
  } else {
    g.addColorStop(1, rgba(fins.color, op * 0.55));
  }
  return g;
}

function paintTail(ctx: Ctx, fins: FinLook, body: Body, wag: number): void {
  const T = 0.32 * body.L * (0.85 + body.build);
  const root = body.point(0.97, 0);
  const lag = -wag * 0.07 * T; // the lobes trail slightly behind the beat
  const pw = body.halfWidth(0.97) * 0.9;
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(body.angleToTail(1) - wag * 0.5); // the tail fin continues the body's curve
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(-0.04 * T, -pw);
    for (const side of [-1, 1]) {
      const y = (v: number): number => side * v * T + lag;
      if (side < 0) {
        ctx.bezierCurveTo(0.3 * T, -0.12 * T, 0.7 * T, y(0.26), 0.98 * T, y(0.44)); // outer edge to the lobe tip
        ctx.quadraticCurveTo(1.06 * T, y(0.16), 0.8 * T, lag); // rounded lobe into the fork
      } else {
        ctx.quadraticCurveTo(1.06 * T, y(0.16), 0.98 * T, y(0.44));
        ctx.bezierCurveTo(0.7 * T, y(0.26), 0.3 * T, 0.12 * T, -0.04 * T, pw);
      }
    }
    ctx.closePath();
  };
  ctx.fillStyle = finGradient(ctx, fins, T);
  path();
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(fins.color, -0.35), 0.2);
  ctx.lineWidth = Math.max(0.5, 0.022 * T);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const e = lerp(-0.46, 0.46, i / 8);
    ctx.moveTo(0, 0);
    ctx.lineTo(1.1 * T, e * T + lag);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = Math.max(0.5, 0.02 * T);
  path();
  ctx.stroke();
  ctx.restore();
}

/** The body: skin colours, scales, patches, then light and shade on top. */
function paintBody(ctx: Ctx, look: KoiLook, body: Body, plan: Plan): void {
  const { W, L } = body;
  const skin = look.body;

  ctx.fillStyle = skin.color;
  body.trace(ctx);
  ctx.fill();

  ctx.save();
  body.trace(ctx);
  ctx.clip();

  // 1. Back and belly tones: soft bands along the spine and around the edge.
  if (skin.back) fillSoft(ctx, () => body.trace(ctx, 0.5), skin.back, 0.35 * W);
  if (skin.belly) {
    const reach = skin.bellyReach ?? 0.3;
    fillSoft(ctx, () => { body.trace(ctx, 1.4); body.trace(ctx, 1 - reach, true); }, skin.belly, 0.3 * W, undefined, 'evenodd');
  }
  if (skin.fade) {
    // Two-tone: blend towards the tail colour along the (bent) spine.
    const a = body.point(skin.fade.from ?? 0.3, 0), b = body.point(skin.fade.to ?? 0.85, 0);
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, rgba(skin.fade.color, 0));
    g.addColorStop(1, rgba(skin.fade.color, 1));
    ctx.fillStyle = g;
    body.trace(ctx, 1.1);
    ctx.fill();
  }

  // 2. Scale pattern.
  if (look.scales.kind === 'net') paintNet(ctx, body, look.scales.color, look.scales.alpha ?? 0.8, look.scales.scale ?? 0.05, look.scales.span ?? 0.85);
  else if (look.scales.kind === 'doitsu') paintDoitsu(ctx, body, look.scales.color, look.scales.size ?? 0.058);

  // 3. Patch layers, in data order.
  for (const { layer, blobs } of plan.layers) {
    ctx.save();
    ctx.globalAlpha = layer.alpha ?? 1;
    const path = (): void => { ctx.beginPath(); for (const b of blobs) traceSkinShape(ctx, body, b); };
    fillSoft(ctx, path, layer.color, (layer.softness ?? 0) * 0.5 * W);
    if (layer.net) {
      path();
      ctx.clip();
      paintNet(ctx, body, layer.net, 0.75, 0.05, 1.2);
    }
    ctx.restore();
  }

  // 4. Tancho spot: a true circle on the head.
  if (look.headSpot) {
    const c = body.point(0.17, 0); // on the crown, just behind the eyes
    const r = look.headSpot.size * L;
    ctx.fillStyle = look.headSpot.color;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * 0.97, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Roundness: shade the edge away from the light (light comes from the top-left of the screen).
  innerShadow(ctx, body, 'rgba(0,12,32,0.5)', 0.55 * W, { x: 0.12 * W, y: 0.16 * W });
  innerShadow(ctx, body, 'rgba(0,12,32,0.22)', 0.25 * W, { x: 0, y: 0 });

  // 6. Back highlight, stronger and sharper for metallic koi.
  fillSoft(ctx, () => body.trace(ctx, 0.42), rgba('#ffffff', 0.13 + 0.3 * look.sheen), 0.3 * W);
  if (look.sheen > 0) {
    fillSoft(ctx, () => body.trace(ctx, 0.16), rgba('#fffdf0', 0.55 * look.sheen), 0.12 * W);
    for (const g of plan.glints) glint(ctx, body, g.t, g.s, g.r, rgba('#fffef5', g.a * look.sheen * 0.5));
  }

  // 7. Gin Rin: individual sparkling scales.
  for (const sp of plan.sparkles) {
    glint(ctx, body, sp.t, sp.s, sp.r, 'rgba(255,255,255,0.3)', 2); // soft halo
    glint(ctx, body, sp.t, sp.s, sp.r, 'rgba(255,255,255,0.95)');
  }

  // 8. Rim light hugging the outline.
  const rim = look.rim ?? { color: '#ffffff', strength: 0.25 };
  ctx.strokeStyle = rgba(rim.color, Math.min(1, 0.35 + 0.5 * rim.strength));
  ctx.lineWidth = (0.06 + 0.1 * rim.strength) * W;
  body.trace(ctx);
  ctx.stroke();
  ctx.restore();

  // 9. Outline: a darker edge on light koi, the rim colour on dark ones.
  const dark = luminance(skin.color) < 0.2;
  ctx.strokeStyle = dark ? rgba(rim.color, 0.35 + 0.4 * rim.strength) : rgba(shade(skin.color, -0.45), 0.5);
  ctx.lineWidth = Math.max(0.6, 0.05 * W);
  body.trace(ctx);
  ctx.stroke();
}

/** Reticulated scales: the rear edge of every scale, fading out towards the flanks. */
function paintNet(ctx: Ctx, body: Body, color: Hex, alpha: number, scale: number, span: number): void {
  const across = (scale * 0.9) / body.build; // column spacing in skin units
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.5, 0.2 * scale * body.L);
  let row = 0;
  for (let t = 0.24; t < 1.0; t += scale * 0.75, row++) {
    const offset = row % 2 ? across / 2 : 0;
    for (let s = -1.2 + offset; s <= 1.2; s += across) {
      const fade = 1 - smoothstep(span - 0.3, span, Math.abs(s));
      if (fade <= 0.02) continue;
      ctx.globalAlpha = alpha * fade;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = lerp(-1.25, 1.25, k / 6);
        const p = body.point(t + Math.cos(a) * scale * 0.55, s + (Math.sin(a) * scale * 0.6) / body.build);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Doitsu: one row of large mirror scales on each side of the dorsal line. */
function paintDoitsu(ctx: Ctx, body: Body, color: Hex, size: number): void {
  for (const side of [-1, 1]) {
    for (let t = 0.26; t < 0.95; t += size * 1.05) {
      const r = size * (1 - 0.35 * t); // scales shrink towards the tail
      const shape: SkinShape = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        shape.push({ t: t + Math.cos(a) * r * 0.52, s: side * 0.3 + (Math.sin(a) * r * 0.45) / body.build });
      }
      ctx.beginPath();
      traceSkinShape(ctx, body, shape);
      ctx.fillStyle = rgba(color, 0.85);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(color, 0.5), 0.5);
      ctx.lineWidth = Math.max(0.5, 0.1 * r * body.L);
      ctx.stroke();
    }
  }
}

/** The dorsal fin seen from above: a thin translucent ridge along the spine. */
function paintDorsalFin(ctx: Ctx, fins: FinLook, body: Body): void {
  const pts: Vec[] = [];
  const N = 12;
  for (let i = 0; i <= N; i++) { const t = lerp(0.34, 0.74, i / N); pts.push(body.point(t, 0.09 * Math.sin((Math.PI * i) / N))); }
  for (let i = N; i >= 0; i--) { const t = lerp(0.34, 0.74, i / N); pts.push(body.point(t, -0.09 * Math.sin((Math.PI * i) / N))); }
  ctx.fillStyle = rgba(fins.base ?? fins.color, 0.25);
  smoothClosed(ctx, pts);
  ctx.fill();
  ctx.strokeStyle = rgba(shade(fins.base ?? fins.color, -0.3), 0.18);
  ctx.lineWidth = Math.max(0.5, 0.008 * body.L);
  ctx.beginPath();
  const a = body.point(0.34, 0), b = body.point(0.54, 0), c = body.point(0.74, 0);
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
  ctx.stroke();
}

/** Gill covers, barbels and eyes. Fine details are skipped at small sizes. */
function paintHeadDetails(ctx: Ctx, look: KoiLook, body: Body): void {
  const { L } = body;
  const detailed = body.size >= 96;
  const dark = luminance(look.body.color) < 0.2;
  if (detailed) {
    // gill-cover line
    ctx.strokeStyle = dark ? 'rgba(200,220,255,0.18)' : 'rgba(40,20,10,0.16)';
    ctx.lineWidth = 0.008 * L;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const s = lerp(-0.85, 0.85, k / 10);
      const p = body.point(0.235 + 0.035 * (1 - s * s), s);
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    // barbels
    ctx.strokeStyle = rgba(shade(look.body.color, dark ? 0.5 : -0.15), 0.6);
    ctx.lineWidth = 0.009 * L;
    for (const side of [-1, 1]) {
      const a = body.point(0.035, side * 0.55);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x + 0.02 * L, a.y + side * 0.03 * L, a.x + 0.005 * L, a.y + side * 0.055 * L);
      ctx.stroke();
    }
  }
  // eyes: a golden iris ring, dark pupil and a glint
  const r = Math.max(0.9, 0.024 * L);
  for (const side of [-1, 1]) {
    const e = body.point(0.1, side * 0.8);
    ctx.fillStyle = dark ? '#c9d6e6' : '#c8b27a';
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d1219';
    ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(e.x + r * 0.25, e.y - side * r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

// ============================================================================
// Canvas helpers
// ============================================================================

/** Trace a skin-space shape (closed, smooth) into the current path. */
function traceSkinShape(ctx: Ctx, body: Body, shape: SkinShape): void {
  smoothClosed(ctx, shape.map(p => body.point(p.t, p.s)), false);
}

/** Closed curve through the midpoints of a polygon (smooth, no overshoot). */
function smoothClosed(ctx: Ctx, pts: Vec[], begin = true): void {
  if (begin) ctx.beginPath();
  const n = pts.length;
  const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(pts[n - 1]!, pts[0]!);
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i]!, pts[(i + 1) % n]!);
    ctx.quadraticCurveTo(pts[i]!.x, pts[i]!.y, m.x, m.y);
  }
  ctx.closePath();
}

/**
 * Fill a path with a blurred edge. Canvas 2D only blurs shadows portably, so
 * the path is drawn far off-canvas and only its shadow lands back in place.
 * `blur` is in canvas units; `offset` (optional) is in canvas units of screen space.
 */
function fillSoft(ctx: Ctx, path: () => void, color: string, blur: number, offset?: Vec, rule: CanvasFillRule = 'nonzero'): void {
  if (blur <= 0.01 && !offset) {
    ctx.fillStyle = color;
    path();
    ctx.fill(rule);
    return;
  }
  const m = ctx.getTransform();
  const pxPerUnit = Math.hypot(m.a, m.b);
  const FAR = 20000; // device pixels
  const inv = m.inverse();
  ctx.save();
  ctx.translate(inv.a * FAR, inv.b * FAR); // user-space vector that moves FAR device pixels right
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * pxPerUnit;
  ctx.shadowOffsetX = -FAR + (offset ? offset.x * pxPerUnit : 0);
  ctx.shadowOffsetY = offset ? offset.y * pxPerUnit : 0;
  ctx.fillStyle = '#000';
  path();
  ctx.fill(rule);
  ctx.restore();
}

/** Darken the inside of the silhouette edge (call while clipped to the body). */
function innerShadow(ctx: Ctx, body: Body, color: string, blur: number, offset: Vec): void {
  const u = body.size;
  fillSoft(ctx, () => {
    ctx.beginPath();
    ctx.rect(-u * 2, -u * 2, u * 4, u * 4);
    body.trace(ctx, 1, true); // rect + body, filled even-odd, leaves a body-shaped hole
  }, color, blur, offset, 'evenodd');
}

/** A small bright crescent on one scale (metallic glints and Gin Rin). */
function glint(ctx: Ctx, body: Body, t: number, s: number, r: number, color: string, weight = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.6, 0.3 * weight * r * body.L);
  ctx.beginPath();
  for (let k = 0; k <= 5; k++) {
    const a = lerp(-1.1, 1.1, k / 5);
    const p = body.point(t + Math.cos(a) * r * 0.5, s + (Math.sin(a) * r * 0.6) / body.build);
    if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

// ============================================================================
// Small maths and colour utilities
// ============================================================================

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function smoothstep(a: number, b: number, v: number): number { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function randInt(rng: () => number, lo: number, hi: number): number { return lo + Math.floor(rng() * (hi - lo + 1)); }

/** Small, fast, seedable PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeeds(a: number, b: number): number { return (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0; }

function hexRgb(hex: Hex): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: Hex, a: number): string { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
/** Mix towards white (amount > 0) or black (amount < 0). */
function shade(hex: Hex, amount: number): Hex {
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return '#' + hexRgb(hex).map(c => Math.round(c + (target - c) * k).toString(16).padStart(2, '0')).join('');
}
function luminance(hex: Hex): number { const [r, g, b] = hexRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
