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
  readonly board: Rect & { readonly cellSize: number; readonly koiSize: number };
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
 * with the board in it and its shore around it, the specials bar. The cell is as big as the space allows while the
 * garden keeps its room (see cellSize). The HUD, the bar and the pill over the board are as wide as the pond with its
 * shore, so they line up on any screen, and never narrower than on the design screen.
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

  // as wide as the pond with its shore, but never narrower than on the design screen: the HUD needs its room
  const designPanel = config.designWidth - config.sidePadding * 2;
  const panelWidth = Math.min(
    Math.max(pond.width + config.shoreWidth * 2, designPanel),
    stage.width - config.sidePadding * 2,
  );
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
  const cell = cellSize({ x: roomX, y: bandBottom - bandTop }, stageWidth, config);
  const width = cell * config.cols;
  const height = cell * config.rows;
  const board = {
    x: (stageWidth - width - margin.left - margin.right) / 2 + margin.left,
    y: bandTop + (bandBottom - bandTop - height) * config.pondAlign,
    width,
    height,
    cellSize: cell,
    koiSize: cell - config.cellGap,
  };
  const pond = {
    x: board.x - margin.left,
    y: board.y - margin.top,
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
  };
  return { board, pond };
}

/**
 * The biggest cell that fits the board's room (px). If the garden can't go beside the pond, the cell gives up size so
 * the pond leaves the garden's strip of sky above it (a 16:9 phone, an upright tablet), but never below minCell.
 */
function cellSize(room: { x: number; y: number }, stageWidth: number, config: LayoutConfig): number {
  const fits = Math.min(room.x / config.cols, room.y / config.rows);
  if (gardenBeside(fits, stageWidth, config) || config.pondAlign <= 0) return fits;
  // the sky above the pond is sectionGap plus pondAlign of the height the board leaves over
  const skyRows = room.y - (config.garden.sky - config.sectionGap) / config.pondAlign;
  const keepsSky = Math.floor((skyRows / config.rows) * 100) / 100; // a hair under, so the sky is never just short
  return Math.min(fits, Math.max(config.minCell, keepsSky));
}

/** Whether a pond of this cell leaves the garden its room on both sides of it. */
function gardenBeside(cell: number, stageWidth: number, config: LayoutConfig): boolean {
  const margin = config.pondMargin;
  const pondWidth = cell * config.cols + margin.left + margin.right;
  return (stageWidth - pondWidth) / 2 - config.shoreWidth >= config.garden.beside;
}
