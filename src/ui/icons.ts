/**
 * The UI's icons, drawn inline as SVG so they take the theme's colours (currentColor) and stay sharp at any scale.
 * Fixed strings from this file only, never user text, so they are safe to put in innerHTML.
 */

/** A plump five-pointed star with rounded points. */
export const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="currentColor"
  stroke-width="2" stroke-linejoin="round" d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1L3.2 9.3l6.1-.9z"/></svg>`;

/** A bold tick. */
export const CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.4"
  stroke-linecap="round" stroke-linejoin="round" d="M5.5 12.5l4.2 4.2 8.8-9.4"/></svg>`;

/** A padlock. */
export const LOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"
  fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/** Sets an element's content to one of these icons. */
export function setIcon(element: HTMLElement, icon: string): void {
  element.innerHTML = icon; // a fixed string from this file
}
