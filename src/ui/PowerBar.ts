import type { Rect } from '../layout/gameLayout';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/** A padlock, drawn inline so it takes the text colour. */
const LOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"
  fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/**
 * The specials bar under the pond: a button per power. The powers come later, so for now every slot is a locked
 * placeholder marked "soon"; the bar already holds its place in the layout on every screen.
 */
export function placePowerBar(layer: UiLayer, rect: Rect, slots: number): void {
  const buttons = Array.from({ length: slots }, () => lockedSlot());
  layer.place(el('div', 'powers', ...buttons), rect);
}

function lockedSlot(): HTMLButtonElement {
  const icon = el('span', 'power__icon');
  icon.innerHTML = LOCK; // a fixed string from this file, never user text
  const button = el('button', 'panel power', icon, el('span', 'tag', 'soon'));
  button.disabled = true;
  button.title = 'Coming soon';
  return button;
}
