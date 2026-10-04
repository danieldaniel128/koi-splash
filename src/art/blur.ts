/**
 * Soft shapes on a canvas without `ctx.filter`: Safari (so every iOS browser) ignores `filter = 'blur(...)'`, but
 * every browser blurs canvas shadows. So the shape is drawn off the canvas and only its shadow is cast back into
 * place, blurred.
 */

/**
 * Runs `draw` so that only its shadow lands on the canvas: in `color` (times the alpha of what `draw` paints),
 * blurred by `blur` (the Gaussian's standard deviation, like CSS blur()) and shifted by `offset`, both in the
 * drawing's own units. The transform may scale and move, but not rotate: a canvas shadow ignores the transform, so
 * its blur and offset are scaled here.
 */
export function drawShadowOnly(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  look: { readonly blur: number; readonly color: string; readonly offset?: readonly [number, number] },
): void {
  const scale = ctx.getTransform().a;
  const away = ctx.canvas.width * 2; // canvas px: far enough that nothing `draw` paints is left on the canvas
  const [offsetX, offsetY] = look.offset ?? [0, 0];
  ctx.save();
  ctx.shadowColor = look.color;
  ctx.shadowBlur = look.blur * scale * 2; // shadowBlur is twice the standard deviation
  ctx.shadowOffsetX = away + offsetX * scale;
  ctx.shadowOffsetY = offsetY * scale;
  ctx.translate(-away / scale, 0);
  draw();
  ctx.restore();
}

/** Draws `source`'s silhouette in `color`, blurred by `blur` px, with its top left at `at`. */
export function drawBlurred(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  at: readonly [number, number],
  blur: number,
  color: string,
): void {
  drawShadowOnly(
    ctx,
    () => {
      ctx.drawImage(source, at[0], at[1]);
    },
    { blur, color },
  );
}
