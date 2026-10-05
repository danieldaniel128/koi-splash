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
}

/**
 * The stage, back to front: the bank and the garden, the water under the koi, the boosters' marks, the koi, the
 * lily pads over them, the water's surface, the specials' light, the boosters' pellets and sparkles, the points,
 * and the stones and fireflies round the pond.
 */
export function buildStage(parts: GameParts, around: Surroundings): Container {
  const { boardView, pond, pads, specials, boosters, popups } = parts;
  const stage = new Container();
  stage.addChild(
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
  );
  return stage;
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
