import { Texture } from 'pixi.js';
import { bakeKoi, getVariety } from '../art/koiBank';
import type { Kind } from '../model/types';

/**
 * One texture per koi kind, painted once at startup and shared by every sprite of that kind. Painting a koi is
 * expensive canvas work, so it must never happen during play.
 */
export class KoiTextures {
  private readonly textures: Texture[];

  constructor(varietyIds: readonly string[], size: number, resolution: number) {
    this.textures = varietyIds.map((id) => Texture.from(bakeKoi(getVariety(id), { size, resolution })));
  }

  get(kind: Kind): Texture {
    const texture = this.textures[kind];
    if (!texture) throw new RangeError(`no koi texture for kind ${kind}`);
    return texture;
  }

  destroy(): void {
    for (const texture of this.textures) texture.destroy(true);
    this.textures.length = 0;
  }
}
