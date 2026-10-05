import type { LayoutConfig } from '../config/layout';
/** A rectangle on the stage (stage px). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The phone's own unsafe edges (notch, home bar), in screen px (CSS env(safe-area-inset-*)). */
export interface SafeInsets {
  readonly top: number;
  readonly bottom: number;
}

export interface GameLayout {
  /** The stage covers the whole screen; `scale` maps stage px to screen px. */
  readonly stage: { readonly width: number; readonly height: number; readonly scale: number };
  readonly hud: Rect;
  /** The board: where the grid starts, its size, the distance between cell centres and the size of a piece. */
  readonly board: Rect & { readonly cell: number; readonly piece: number };
  readonly pond: Rect;
  /** The open ground above the pond and its shore, from the top of the screen (behind the HUD too): the backdrop. */
  readonly scene: Rect;
  readonly bar: Rect;
  /** The instruction pill over the board, as wide as the HUD. */
  readonly pill: Rect;
}

/**
 * Lays the game out for a screen: the stage is the design size scaled to fit, then grown to cover the whole screen
 * (tall phones get more height, tablets more width, never letterboxing). Top to bottom: the HUD, the pond centred
 * with the board in it and its shore around it, the specials bar. The cell is as big as the space allows, within
 * minCell..maxCell. The HUD, the bar and the pill over the board are as wide as the pond with its shore, so they
 * line up on any screen.
 */
export function layoutGame(
  screen: { width: number; height: number },
  insets: SafeInsets,
  config: LayoutConfig,
): GameLayout {
  const scale = Math.min(screen.width / config.designWidth, screen.height / config.designHeight);
  const stage = { width: screen.width / scale, height: screen.height / scale, scale };
  const top = insets.top / scale + config.sidePadding;
  const bottom = stage.height - insets.bottom / scale - config.sidePadding;
  const { board, pond } = placePond(stage.width, top + config.hudHeight, bottom - config.barHeight, config);

  const panelWidth = Math.min(pond.width + config.shoreWidth * 2, stage.width - config.sidePadding * 2);
  const panelX = (stage.width - panelWidth) / 2;
  return {
    stage,
    hud: { x: panelX, y: top, width: panelWidth, height: config.hudHeight },
    board,
    pond,
    scene: { x: 0, y: 0, width: stage.width, height: pond.y - config.shoreWidth },
    bar: { x: panelX, y: bottom - config.barHeight, width: panelWidth, height: config.barHeight },
    pill: {
      x: panelX,
      y: board.y - config.pillGap - config.pillHeight,
      width: panelWidth,
      height: config.pillHeight,
    },
  };
}

/** The pond centred between the HUD and the bar with its shore on screen, and the board in it. */
function placePond(
  stageWidth: number,
  hudBottom: number,
  barTop: number,
  config: LayoutConfig,
): Pick<GameLayout, 'board' | 'pond'> {
  const margin = config.pondMargin;
  const aroundPond = config.sectionGap + config.shoreWidth;
  const bandTop = hudBottom + aroundPond + margin.top;
  const bandBottom = barTop - aroundPond - margin.bottom;
  const roomX = stageWidth - (config.sidePadding + config.shoreWidth) * 2 - margin.left - margin.right;
  const cell = cellSize(roomX, bandBottom - bandTop, config);
  const width = cell * config.cols;
  const height = cell * config.rows;
  const board = {
    x: (stageWidth - width - margin.left - margin.right) / 2 + margin.left,
    y: bandTop + (bandBottom - bandTop - height) * config.pondAlign,
    width,
    height,
    cell,
    piece: cell - config.cellGap,
  };
  const pond = {
    x: board.x - margin.left,
    y: board.y - margin.top,
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
  };
  return { board, pond };
}

/** The biggest cell that fits the board's room, within minCell..maxCell. */
function cellSize(roomX: number, roomY: number, config: LayoutConfig): number {
  const fits = Math.min(roomX / config.cols, roomY / config.rows);
  return Math.min(Math.max(fits, config.minCell), config.maxCell);
}
