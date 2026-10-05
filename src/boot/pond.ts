import { Container } from 'pixi.js';
import type { Renderer, Sprite } from 'pixi.js';
import { SHORE_STYLES } from '../art/shoreStyles';
import { LAYOUT } from '../config/layout';
import { POND } from '../config/pond';
import type { PondProp } from '../config/pond';
import { Random } from '../core/Random';
import { placeOn } from '../layout/anchor';
import type { Rect } from '../layout/gameLayout';
import type { Outline } from '../layout/outline';
import { ringAlongShore } from '../layout/shore';
import { THEME } from '../theme/theme';
import { createBackdrop } from '../view/Backdrop';
import { Fireflies } from '../view/Fireflies';
import { ShoreRing } from '../view/ShoreRing';
import { PondProps } from '../view/water/PondProps';
import { PondWater } from '../view/water/PondWater';
import type { GameScreen } from './screen';

/** The bank, and the water below and above the board. */
export function createPond(renderer: Renderer, { layout, shore }: GameScreen): PondWater {
  return new PondWater(renderer, {
    stageWidth: layout.stage.width,
    stageHeight: layout.stage.height,
    board: layout.board,
    pond: layout.pond,
    shore,
    props: placeProps(layout.pond),
    moonAt: placeOn(layout.pond, POND.moonSpot),
  });
}

/**
 * The garden around the pond (see art/backdrop), baked once at exactly the screen's pixels per stage px: above the
 * pond on a tall phone, beside it on a wide screen.
 */
export function createGarden({ layout, resolution }: GameScreen): Sprite {
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
    resolution.screen,
    POND.shore.seed,
  );
}

/** What stands round the pond: its stones and border (painted once), and the fireflies over the bank. */
export interface Scenery {
  readonly layer: Container;
  readonly fireflies: Fireflies;
}

/** The pond's border and stones, painted once, and fireflies over the bank. */
export function createScenery({ layout, shore, resolution }: GameScreen): Scenery {
  const props = new PondProps(placeProps(layout.pond), resolution.art);
  // the ring is baked at exactly the screen's pixels per stage px (the layout is made for this screen)
  const border = createBorder(shore, resolution.screen);
  const screen = { x: 0, y: 0, width: layout.stage.width, height: layout.stage.height };
  const fireflies = new Fireflies({
    spots: [
      ...POND.fireflies.top.map((spot) => placeOn(screen, spot)),
      ...POND.fireflies.belowPond.map((spot) => placeOn(layout.pond, spot)),
    ],
    roam: POND.fireflyRoam,
    size: POND.fireflySize,
    color: THEME.scene.firefly,
  });
  const layer = new Container();
  layer.addChild(props, border, fireflies);
  return { layer, fireflies };
}

/** The pond's stones in the water, each at its corner of this pond. O(props). */
function placeProps(pond: Rect): PondProp[] {
  return POND.props.map((spot) => ({ ...spot, at: placeOn(pond, spot) }));
}

/** The border along the pond's shore, in the style the config picks. */
function createBorder(shore: readonly Outline[], resolution: number): ShoreRing {
  const { style, seed } = POND.shore;
  const rng = new Random(seed);
  const pieces = ringAlongShore(shore, POND.shore, () => rng.next());
  return new ShoreRing(pieces, SHORE_STYLES[style], seed, resolution);
}
