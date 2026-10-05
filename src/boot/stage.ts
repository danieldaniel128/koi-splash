import { Container, Rectangle } from 'pixi.js';
import { WATER } from '../config/water';
import type { Rect } from '../layout/gameLayout';
import type { BoardView } from '../view/BoardView';
import { KoiLife } from '../view/KoiLife';
import type { PondWater } from '../view/water/PondWater';
import type { GameParts } from './game';

/** The layers round the game itself: the garden behind the pond, and the stones and fireflies round it. */
export interface Surroundings {
  readonly garden: Container;
  readonly scenery: Container;
  /** Over everything: the sparkles of a win and the white flash of a big moment. */
  readonly celebration: Container;
}

/** The stage fitted to the screen, and the world in it the camera moves (everything drawn on the canvas). */
export interface GameStage {
  readonly root: Container;
  readonly world: Container;
}

/**
 * The stage, back to front: the bank and the garden, the water under the koi, the boosters' marks, the koi, the
 * lily pads over them, the water's surface, the specials' light, the boosters' pellets and sparkles, the points,
 * the stones and fireflies round the pond, and the celebration's sparkles and flash. They all sit in one world layer the camera shakes and
 * pushes in (the HTML HUD stays still over it).
 */
export function buildStage(parts: GameParts, around: Surroundings): GameStage {
  const { boardView, pond, pads, specials, boosters, popups } = parts;
  const world = new Container();
  world.addChild(
    pond.bank,
    around.garden,
    pond.bottom,
    boosters.marks, // under the koi: the gold ring round a picked koi
    boardView,
    pads, // over the koi: a koi swimming past a pad goes under the leaf
    pond.surface,
    specials.fx, // the specials' light, over the water
    boosters.motions, // the feed's pellets and the special booster's sparkles
    popups,
    around.scenery,
    around.celebration,
  );
  const root = new Container();
  root.addChild(world);
  return { root, world };
}

/**
 * Puts the koi in the water: the pond's filter bends the whole board layer through the waves, and the koi's life
 * (see KoiLife) makes them swim and push the water back, frame by frame.
 */
export function putUnderWater(boardView: BoardView, pond: PondWater, board: Rect): KoiLife {
  const margin = WATER.koiReach;
  boardView.filters = [pond.koiFilter];
  boardView.filterArea = new Rectangle(-margin, -margin, board.width + margin * 2, board.height + margin * 2);
  return new KoiLife(pond, boardView.position);
}
