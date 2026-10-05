/** Blends two 0xRRGGBB colours channel by channel: `t` = 0 gives `from`, 1 gives `to`. Pure. */
export function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
