/**
 * Soft shapes on a canvas without `ctx.filter`: Safari (so every iOS browser) ignores `filter = 'blur(...)'`, but
 * every browser blurs canvas shadows. So the shape is drawn off the canvas and only its shadow is cast back into
 * place, blurred.
 */

/** How far (canvas px) a drawing is moved off the canvas to cast only its shadow: past anything a painter draws. */
const FAR_AWAY = 20000;

/**
 * Runs `draw` so that only its shadow lands on the canvas: in `color` (times the alpha of what `draw` paints),
 * blurred by `blur` (the Gaussian's standard deviation, like CSS blur()) in the drawing's own units, and shifted by
 * `offset` along the canvas's own axes (a shadow ignores the transform), in those units too. The transform may scale,
 * move and turn: the drawing is moved off the canvas along its pixels, whatever way the drawing faces.
 */
export function drawShadowOnly(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  look: { readonly blur: number; readonly color: string; readonly offset?: readonly [number, number] },
): void {
  const transform = ctx.getTransform();
  const scale = Math.hypot(transform.a, transform.b); // canvas px per unit of the drawing
  const back = transform.inverse(); // turns canvas px into the drawing's units
  const [offsetX, offsetY] = look.offset ?? [0, 0];
  ctx.save();
  ctx.shadowColor = look.color;
  ctx.shadowBlur = look.blur * scale * 2; // shadowBlur is twice the standard deviation
  ctx.shadowOffsetX = -FAR_AWAY + offsetX * scale;
  ctx.shadowOffsetY = offsetY * scale;
  ctx.translate(back.a * FAR_AWAY, back.b * FAR_AWAY); // that many canvas px to the right
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
