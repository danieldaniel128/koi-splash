import type { PointData } from 'pixi.js';
import { SPECIAL_MENU } from '../config/ui';
import type { PetalChoice } from '../config/ui';
import type { SpecialPicker } from '../game/BoosterControl';
import type { Cell, Special } from '../model/types';
import { THEME } from '../theme/theme';
import type { UiLayer } from './UiLayer';
import { button, el, image, setRect, wantsLessMotion } from './UiLayer';

/** Where the menu finds things: a cell's centre (stage px), the stage's width, and a koi's picture as a special. */
export interface MenuBoard {
  cellCentre(cell: Cell): PointData;
  readonly stageWidth: number;
  preview(cell: Cell, special: Special): string;
}

/**
 * Where three petals go round a koi (after the prototype): on an arc `reach` px out, `spread` rad apart, fanned up
 * (or down, for a koi in the top rows), left to right, the whole fan shifted to stay `edge` px inside the stage.
 */
export function petalSpots(
  centre: PointData,
  fanDown: boolean,
  look: { reach: number; spread: number; edge: number; stageWidth: number },
): PointData[] {
  const base = fanDown ? Math.PI / 2 : -Math.PI / 2;
  const spots = [0, 1, 2].map((k) => {
    const angle = base + (fanDown ? -1 : 1) * (k - 1) * look.spread;
    return { x: centre.x + Math.cos(angle) * look.reach, y: centre.y + Math.sin(angle) * look.reach };
  });
  const xs = spots.map((spot) => spot.x);
  const low = Math.min(...xs) - look.edge;
  const high = Math.max(...xs) + look.edge - look.stageWidth;
  const shift = low < 0 ? -low : high > 0 ? -high : 0;
  return spots.map((spot) => ({ x: spot.x + shift, y: spot.y }));
}

/**
 * The special booster's choice (after the prototype's petal menu): three frosted-glass petals bloom round the picked
 * koi, each showing the koi as that special with its name; tapping one chooses it, tapping anywhere else closes
 * them. The pond behind dims round the picked koi, fading in, and out again as the petals shrink away.
 *
 * The menu opens as the finger lifts off the koi, and on a touch screen the browser sends that tap's click a moment
 * later, right where the petals start to bloom. So the menu only takes a click whose press began on it once open.
 */
export class SpecialMenu implements SpecialPicker {
  private readonly root = el('div', 'petals');
  private settle: ((choice: Special['type'] | null) => void) | null = null;
  private pressed = false;
  /** The dim fading away after the menu closed, until it's gone or the menu opens again. */
  private leaving: Animation | null = null;

  constructor(
    private readonly layer: UiLayer,
    private readonly board: MenuBoard,
    private readonly choices: readonly PetalChoice[],
    private readonly cellSize: number,
  ) {
    this.root.addEventListener('pointerdown', () => {
      this.pressed = true;
    });
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root && this.takes(event)) this.finish(null); // tapped away from the petals
    });
  }

  pick(at: Cell, line: 'row' | 'col'): Promise<Special['type'] | null> {
    this.finish(null);
    this.leaving?.cancel();
    this.leaving = null;
    this.pressed = false;
    this.root.inert = false;
    const centre = this.board.cellCentre(at);
    const look = SPECIAL_MENU;
    const spots = petalSpots(centre, at.row < look.topRows, {
      reach: look.reach * this.cellSize,
      spread: look.spread,
      edge: look.edge,
      stageWidth: this.board.stageWidth,
    });
    const petals = this.choices.map((choice, k) => {
      const special: Special =
        choice.type === 'striped' ? { type: 'striped', along: line } : { type: choice.type };
      return this.petal(
        choice,
        this.board.preview(at, special),
        { spot: spots[k] ?? centre, from: centre },
        k,
      );
    });
    this.root.replaceChildren(...petals);
    this.root.style.setProperty('--dim-at', `${centre.x}px ${centre.y}px`);
    this.layer.root.append(this.root);
    this.root.animate([{ opacity: 0 }, { opacity: 1 }], timing(SPECIAL_MENU.fade));
    return new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  close(): void {
    this.finish(null);
  }

  /** A petal with the koi's picture as its special, flying out `from` the koi to its `spot`. */
  private petal(
    choice: PetalChoice,
    preview: string,
    { spot, from }: { spot: PointData; from: PointData },
    k: number,
  ): HTMLElement {
    const size = SPECIAL_MENU.petal * this.cellSize;
    const picture = image(
      choice.type === 'striped' ? 'petal__koi petal__koi--striped' : 'petal__koi',
      preview,
    );
    picture.draggable = false; // a click that drifts a little still picks the petal
    const petal = button('control petal', choice.name, picture, el('span', 'petal__name', choice.name));
    setRect(petal, { x: spot.x - size / 2, y: spot.y - size / 2, width: size, height: size });
    if (!wantsLessMotion()) {
      petal.animate(
        [
          { transform: `translate(${from.x - spot.x}px, ${from.y - spot.y}px) scale(0.2)`, opacity: 0 },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        ],
        {
          duration: SPECIAL_MENU.open * 1000,
          delay: k * SPECIAL_MENU.stagger * 1000,
          easing: THEME.ease.back,
          fill: 'backwards',
        },
      );
    }
    petal.addEventListener('click', (event) => {
      if (this.takes(event)) this.finish(choice.type);
    });
    return petal;
  }

  /** A click the menu answers: its press began on the open menu, or it came from a key (a click with no press). */
  private takes(click: MouseEvent): boolean {
    return this.pressed || click.detail === 0;
  }

  private finish(choice: Special['type'] | null): void {
    const settle = this.settle;
    this.settle = null;
    if (settle) this.leave();
    settle?.(choice);
  }

  /** The petals shrink and the dim fades away; meanwhile the menu takes no taps, so they go on to the board. */
  private leave(): void {
    this.root.inert = true;
    const time = { ...timing(SPECIAL_MENU.fade), fill: 'forwards' as const };
    for (const petal of this.root.children)
      petal.animate([{ scale: 1 }, { scale: SPECIAL_MENU.closeScale }], time);
    const out = this.root.animate([{ opacity: 1 }, { opacity: 0 }], time);
    out.onfinish = () => {
      this.root.remove();
    };
    this.leaving = out;
  }
}

/** How long a fade of the menu takes: `seconds`, or no time for players who ask for less motion. */
function timing(seconds: number): KeyframeAnimationOptions {
  return { duration: wantsLessMotion() ? 0 : seconds * 1000, easing: 'ease' };
}
