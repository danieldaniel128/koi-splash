import { ColorMatrixFilter, RenderTexture, Sprite } from 'pixi.js';
import type { Container, Renderer, Texture, TextureSource } from 'pixi.js';
import type { BootJob } from '../core/BootPipeline';

/**
 * The GPU takes a texture only the first time it's drawn, and builds a shader only the first time it runs. A phone
 * doing that while the game plays drops frames for seconds, as the koi swim through poses not yet drawn and new
 * looks appear. So the loading screen does it all instead: one job per texture (the pipeline lets the screen paint
 * between them), then one draw through the rainbow koi's filter, the only shader not on screen from the first frame.
 */
export function gpuWarmUpJobs(renderer: Renderer, textures: readonly Texture[]): BootJob[] {
  const sources = new Set<TextureSource>(textures.map((texture) => texture.source));
  const uploads = [...sources].map((source) => () => {
    renderer.texture.initSource(source);
  });
  const [anyTexture] = textures;
  if (!anyTexture) return uploads;
  return [
    ...uploads,
    () => {
      drawThroughRainbowFilter(renderer, anyTexture);
    },
  ];
}

/** Every sprite's texture under `root`, hidden ones included. */
export function spriteTextures(root: Container): Texture[] {
  const found: Texture[] = [];
  const visit = (node: Container): void => {
    if (node instanceof Sprite) found.push(node.texture);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return found;
}

/** Draws a sprite through a hue-turning filter like the rainbow koi's, off screen, so its shader is built now. */
function drawThroughRainbowFilter(renderer: Renderer, texture: Texture): void {
  const filter = new ColorMatrixFilter({ resolution: 'inherit' });
  const sprite = new Sprite({ texture, filters: [filter] });
  const target = RenderTexture.create({ width: texture.width, height: texture.height });
  renderer.render({ container: sprite, target });
  target.destroy(true);
  sprite.destroy();
  filter.destroy();
}
