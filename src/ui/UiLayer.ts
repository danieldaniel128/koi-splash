import type { PointData } from 'pixi.js';
import { NOPE_SHAKE } from '../config/ui';
import type { Rect } from '../layout/gameLayout';
import { THEME } from '../theme/theme';

/**
 * The HTML UI over the canvas. It is laid out in stage px, like the Pixi stage, and scaled with it (fit), so a HUD
 * rect from the layout lands exactly where the layout says on any screen. Text stays sharp: the browser draws it.
 */
export class UiLayer {
  readonly root = el('div', 'ui');

  constructor(host: HTMLElement, size: { width: number; height: number }) {
    setRect(this.root, { x: 0, y: 0, ...size });
    host.appendChild(this.root);
  }

  /** Adds a component at its rect from the layout. */
  place(element: HTMLElement, rect: Rect): void {
    setRect(element, rect);
    this.root.appendChild(element);
  }

  /** Follows the stage: same scale and offset. --ui-scale lets full-screen overlays scale their cards to match. */
  fit(scale: number, offset: PointData): void {
    this.root.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
    document.documentElement.style.setProperty('--ui-scale', `${scale}`);
  }

  /**
   * The centre of an element in stage px (the points and the lotuses fly there). Offsets are layout values, so the
   * layer's scale doesn't affect them. O(depth).
   */
  centreOf(element: HTMLElement): PointData {
    let x = element.offsetWidth / 2;
    let y = element.offsetHeight / 2;
    let node: Element | null = element;
    while (node instanceof HTMLElement && node !== this.root) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y };
  }
}

/** Makes an element with these classes and children: the small helper every UI component builds with. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.append(...children);
  return element;
}

/**
 * A real button with these classes and children. It never submits anything (type=button), and `label` is its name
 * for screen readers when its content is only an icon.
 */
export function button(className: string, label?: string, ...children: (Node | string)[]): HTMLButtonElement {
  const element = el('button', className, ...children);
  element.type = 'button';
  if (label) element.setAttribute('aria-label', label);
  return element;
}

/** A picture; with no `alt` it is decoration only, and screen readers skip it. */
export function image(className: string, src: string, alt = ''): HTMLImageElement {
  const element = el('img', className);
  element.src = src;
  element.alt = alt;
  return element;
}

/** Puts an element at a rect, in the px of whatever it sits in (the stage, for the UI layer's children). */
export function setRect(element: HTMLElement, rect: Rect): void {
  Object.assign(element.style, {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

/** The player has asked the system for less motion. */
const LESS_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Fades an element in or out over `seconds`, at once for players who ask for less motion, and resolves when it's
 * done. Faded out, it stays invisible.
 */
export async function fade(element: HTMLElement, to: 'in' | 'out', seconds: number): Promise<void> {
  const opacity = to === 'in' ? [0, 1] : [1, 0];
  const animation = element.animate(
    opacity.map((value) => ({ opacity: value })),
    {
      duration: window.matchMedia(LESS_MOTION).matches ? 0 : seconds * 1000,
      easing: 'ease',
      fill: to === 'out' ? 'forwards' : 'none',
    },
  );
  await animation.finished;
}

/** Plays a quick swell on an element (a counter that changed). Web Animations: no class juggling, restarts cleanly. */
export function bump(element: HTMLElement, scale: number, seconds: number): void {
  element.animate([{ transform: `scale(${scale})` }, { transform: 'scale(1)' }], {
    duration: seconds * 1000,
    easing: THEME.ease.back,
  });
}

/**
 * Shakes an element side to side: a press the game can't take. It moves the element's `transform`; a pose it holds
 * (a lifted booster) is set with `translate` and `scale`, so it keeps that pose while it shakes.
 */
export function shake(element: HTMLElement): void {
  const steps = [0, ...NOPE_SHAKE.offsets, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  element.animate(steps, { duration: NOPE_SHAKE.time * 1000, easing: 'ease-out' });
}
