/** The koi variety (from the koi bank) used for each piece kind. Kind 0 is the first entry. */
export const KOI_SET = ['m3-red', 'm3-gold', 'm3-white', 'm3-blue', 'm3-black'] as const;

export const KOI_LOOK = {
  /** Koi size as a share of the cell, so neighbours don't touch. */
  scale: 0.92,
  /** Bake textures at this multiple of the screen resolution, so they stay sharp when the stage is scaled up. */
  bakeResolution: 2,
} as const;
