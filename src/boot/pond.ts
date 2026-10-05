import { Container } from 'pixi.js';
import type { Renderer, Sprite } from 'pixi.js';
import type { DistanceField } from '../art/distanceField';
import { SHORE_STYLES } from '../art/shoreStyles';
import { KOI_LOOK } from '../config/koi';
import { LAYOUT } from '../config/layout';
import { POND } from '../config/pond';
import type { PondProp, PondPropSpot } from '../config/pond';
import type { PropLook } from '../art/pondProps';
import { seeded } from '../core/Random';
import { placeOn } from '../layout/anchor';
import type { Rect } from '../layout/gameLayout';
import type { Outline } from '../layout/outline';
import { ringAlongShore } from '../layout/shore';
import { THEME } from '../theme/theme';
import { createBackdrop } from '../view/Backdrop';
import { Fireflies, fireflyGlow } from '../view/Fireflies';
import { ShoreRing } from '../view/ShoreRing';
import { PondProps } from '../view/water/PondProps';
import { PondWater } from '../view/water/PondWater';
import type { ArtSet } from './art';
import type { GameScreen } from './screen';

/** The bank, and the water below and above the board, inside the shore (its distance field, see bakeShoreField). */
export function createPond(renderer: Renderer, { layout }: GameScreen, shoreField: DistanceField): PondWater {
  return new PondWater(renderer, {
    stageWidth: layout.stage.width,
    stageHeight: layout.stage.height,
    board: layout.board,
    pond: layout.pond,
    shoreField,
    props: placeProps(layout.pond),
    moonAt: placeOn(layout.pond, POND.moonSpot),
  });
}

/**
 * The garden around the pond (see art/backdrop), baked once at exactly the screen's pixels per stage px (up to the
 * GPU's largest texture): above the pond on a tall phone, beside it on a wide screen.
 */
export function createGarden({ layout, resolution, maxTextureSize }: GameScreen): Sprite {
  const { stage, hud, pond, scene } = layout;
  const shore = LAYOUT.shoreWidth;
  return createBackdrop(
    {
      width: stage.width,
      height: stage.height,
      open: hud.y + hud.height,
      sceneBottom: scene.height,
      pond: { left: pond.x - shore, right: pond.x + pond.width + shore },
    },
    THEME.scene.backdrop,
    { resolution: resolution.screen, maxSize: maxTextureSize },
    POND.shore.seed,
  );
}

/** What stands round the pond: its stones and border (painted once), and the fireflies over the bank. */
export interface Scenery {
  readonly layer: Container;
  readonly fireflies: Fireflies;
}

/** The pond's border (painted once for its shore) and stones, and fireflies over the bank. */
export function createScenery({ layout, shore, resolution }: GameScreen, art: ArtSet): Scenery {
  const props = new PondProps(placeProps(layout.pond), { ...art, look: propLook() });
  // the ring is baked at exactly the screen's pixels per stage px (the layout is made for this screen)
  const border = createBorder(shore, resolution.screen);
  const screen = { x: 0, y: 0, width: layout.stage.width, height: layout.stage.height };
  const fireflies = new Fireflies(
    {
      spots: [
        ...POND.fireflies.top.map((spot) => placeOn(screen, spot)),
        ...POND.fireflies.belowPond.map((spot) => placeOn(layout.pond, spot)),
      ],
      roam: POND.fireflyRoam,
      size: POND.fireflySize,
    },
    fireflyGlow(art.book, THEME.scene.firefly),
  );
  const layer = new Container();
  layer.addChild(props, border, fireflies);
  return { layer, fireflies };
}

/** How the stones and pads are lit and inked: by the scene's moon, with the koi's ink outline. */
export function propLook(): PropLook {
  return { light: THEME.scene.light, shadow: POND.propShadow, padOutline: KOI_LOOK.outlineWidth };
}

/** The pond's stones in the water, each at its corner of this pond. O(props). */
function placeProps(pond: Rect, spots: readonly PondPropSpot[] = POND.props): PondProp[] {
  return spots.map((spot) => ({ ...spot, at: placeOn(pond, spot) }));
}

/** The border along the pond's shore, in the style the config picks. */
function createBorder(shore: readonly Outline[], resolution: number): ShoreRing {
  const { style, seed } = POND.shore;
  const rng = seeded(seed);
  const pieces = ringAlongShore(shore, POND.shore, rng);
  return new ShoreRing(pieces, SHORE_STYLES[style], { seed, resolution, look: propLook() });
}
