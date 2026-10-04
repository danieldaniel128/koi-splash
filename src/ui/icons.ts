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

/** Sets an element's content to one of these icons. */
export function setIcon(element: HTMLElement, icon: string): void {
  element.innerHTML = icon; // a fixed string from this file
}

/**
 * The boosters' icons, from the prototype, a little bolder: two koi leaping past each other (swap), a sparkle
 * powering a koi up (special), and pellets lobbed onto the water (feed).
 */
export const BOOSTER_ICONS = {
  swap: `<svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 33 Q20 37.5 35 33" stroke="#9fdcff" stroke-width="2.2" opacity=".75"/>
    <path d="M32 29 Q26 7 9 12.5" stroke="#ffb3d1" stroke-width="3.6"/><path d="M13.5 8.5 L8.5 12.5 L13 17" stroke="#ffb3d1" stroke-width="3.6"/>
    <path d="M8 29 Q14 7 31 12.5" stroke="#ffe6a6" stroke-width="3.6"/><path d="M26.5 8.5 L31.5 12.5 L27 17" stroke="#ffe6a6" stroke-width="3.6"/>
  </svg>`,
  special: `<svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 3.5 C22.4 14.3 25.7 17.6 36.5 20 C25.7 22.4 22.4 25.7 20 36.5 C17.6 25.7 14.3 22.4 3.5 20 C14.3 17.6 17.6 14.3 20 3.5Z" fill="#ffe6a6"/>
    <circle cx="20" cy="20" r="5" fill="#ffb3d1"/><circle cx="18.4" cy="18.4" r="1.8" fill="#fff"/>
    <path d="M31 5 C31.6 8.4 32.6 9.4 36 10 C32.6 10.6 31.6 11.6 31 15 C30.4 11.6 29.4 10.6 26 10 C29.4 9.4 30.4 8.4 31 5Z" fill="#ffb3d1"/>
  </svg>`,
  feed: `<svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" aria-hidden="true">
    <ellipse cx="25" cy="30" rx="10.5" ry="3.8" stroke="#9fdcff" stroke-width="2.2" opacity=".8"/>
    <ellipse cx="25" cy="30" rx="4.8" ry="1.7" stroke="#9fdcff" stroke-width="1.8" opacity=".6"/>
    <path d="M6 25 Q12 6 27 12" stroke="#ffe6a6" stroke-width="1.8" stroke-dasharray="1.5 4" opacity=".85"/>
    <circle cx="9" cy="18" r="3.8" fill="#ffd27a"/><circle cx="15.5" cy="10.5" r="3.2" fill="#ffe6a6"/>
    <circle cx="23" cy="9.5" r="2.8" fill="#ffb3d1"/><circle cx="21" cy="25" r="2.6" fill="#ffd27a"/>
    <circle cx="27.5" cy="23" r="2.6" fill="#ffe6a6"/><circle cx="30" cy="28" r="2.2" fill="#ffb3d1"/>
  </svg>`,
} as const;

export type BoosterIcon = keyof typeof BOOSTER_ICONS;
