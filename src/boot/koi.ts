import { getVariety } from '../art/koiBank';
import { bakeInkedKoi } from '../art/koiInk';
import type { KoiInk } from '../art/koiInk';
import { bakeLotusPad } from '../art/pondProps';
import { KOI_COLORS, KOI_LOOK, KOI_SET } from '../config/koi';
import { SCORE } from '../config/level';
import { BOARD_PADS } from '../config/pond';
import { GOAL_TRAY } from '../config/ui';
import { WATER } from '../config/water';
import type { GameLayout } from '../layout/gameLayout';
import type { GoalIcons } from '../ui/GoalTray';
import { BoardView } from '../view/BoardView';
import { KoiTextures } from '../view/KoiTextures';
import type { KoiBake } from '../view/KoiTextures';
import { SpecialTextures } from '../view/SpecialTextures';
import type { BoardSpec } from '../model/types';

/** A lotus fully open (0 is a closed bud). */
const FULL_BLOOM = 1;

/** How the koi are baked: their size, the resolution, their build, tail beat, shadow, ink and waterline. */
export function koiBake(koiSize: number, resolution: number): KoiBake {
  return {
    size: koiSize,
    resolution,
    build: KOI_LOOK.build,
    frames: KOI_LOOK.swimFrames,
    contactFrames: KOI_LOOK.contactFrames,
    tailSwing: KOI_LOOK.tailSwing,
    shadowBlur: WATER.shadowBlur,
    ink: koiInk(),
    contact: { gap: WATER.contactGap, blur: WATER.contactBlur, finClear: WATER.contactFinClear },
    contactResolution: WATER.contactResolution,
  };
}

/** The koi of every colour in play, baked once. */
export function bakeKoi(bake: KoiBake): KoiTextures {
  return new KoiTextures(KOI_SET, bake);
}

/** The special koi of every colour in play, ready to be baked (see SpecialTextures). */
export function createSpecialKoi(bake: KoiBake): SpecialTextures {
  return new SpecialTextures(KOI_SET, bake, KOI_COLORS);
}

/** The goals' icons, painted by the same painters as the board: the lotus, and an inked koi of each colour. */
export function goalIcons(resolution: number): GoalIcons {
  const pose = { size: GOAL_TRAY.koiSize, resolution, build: KOI_LOOK.build, shadow: false };
  return {
    bonus: SCORE.goalBonus,
    lotus: bakeLotusPad(GOAL_TRAY.iconRadius, FULL_BLOOM, BOARD_PADS.lotusSeed, resolution).toDataURL(),
    koi: KOI_SET.map((id) => bakeInkedKoi(getVariety(id), pose, koiInk()).toDataURL()),
  };
}

/** The koi on the board, placed on the layout's board. */
export function createBoardView(
  textures: KoiTextures,
  specials: SpecialTextures,
  spec: BoardSpec,
  board: GameLayout['board'],
): BoardView {
  const view = new BoardView(textures, specials, { ...spec, cellSize: board.cell, koiSize: board.piece });
  view.position.set(board.x, board.y);
  return view;
}

/** How the koi are inked: outline, fins and tail under the water. Shared by the board's koi and the HUD's. */
function koiInk(): KoiInk {
  return {
    outline: KOI_LOOK.outline,
    outlineWidth: KOI_LOOK.outlineWidth,
    finOutlineAlpha: KOI_LOOK.finOutlineAlpha,
    water: KOI_LOOK.underwater,
    finsUnder: KOI_LOOK.finsUnder,
    tailUnder: KOI_LOOK.tailUnder,
  };
}
