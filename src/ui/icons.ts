import type { Bus } from '../config/audio';
import type { BoosterType } from '../model/boosters';
import { THEME } from '../theme/theme';

/**
 * The UI's icons, drawn inline as SVG so they take the theme's colors (currentColor) and stay sharp at any scale.
 * Fixed strings from this file and the theme only, never user text, so setIcon may put them in innerHTML.
 */

/** An icon's <svg>: a square `size` units across, hidden from screen readers (its control carries the name). */
function svg(body: string, size = 24, attributes = ''): string {
  return `<svg class="icon" viewBox="0 0 ${size} ${size}" aria-hidden="true" ${attributes}>${body}</svg>`;
}

/** Sets an element's content to one of these icons: the only place an icon's markup is written into the page. */
export function setIcon(element: HTMLElement, icon: string): void {
  element.innerHTML = icon;
}

/** A plump five-pointed star with rounded points. */
export const STAR =
  svg(`<path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"
  d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1L3.2 9.3l6.1-.9z"/>`);

/** A bold tick. */
export const CHECK = svg(`<path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"
  stroke-linejoin="round" d="M5.5 12.5l4.2 4.2 8.8-9.4"/>`);

/** A cross, for closing. */
export const CROSS = svg(
  `<path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  16,
);

const { pink, cream, amber, water } = THEME.booster;

/**
 * The boosters' icons, from the prototype, a little bolder: two koi leaping past each other (swap), a sparkle
 * powering a koi up (special), and pellets lobbed onto the water (feed). Their colors are the theme's booster set.
 */
export const BOOSTER_ICONS: Readonly<Record<BoosterType, string>> = {
  swap: svg(
    `<path d="M5 33 Q20 37.5 35 33" stroke="${water}" stroke-width="2.2" opacity=".75"/>
    <path d="M32 29 Q26 7 9 12.5" stroke="${pink}" stroke-width="3.6"/><path d="M13.5 8.5 L8.5 12.5 L13 17" stroke="${pink}" stroke-width="3.6"/>
    <path d="M8 29 Q14 7 31 12.5" stroke="${cream}" stroke-width="3.6"/><path d="M26.5 8.5 L31.5 12.5 L27 17" stroke="${cream}" stroke-width="3.6"/>`,
    40,
    'fill="none" stroke-linecap="round" stroke-linejoin="round"',
  ),
  special: svg(
    `<path d="M20 3.5 C22.4 14.3 25.7 17.6 36.5 20 C25.7 22.4 22.4 25.7 20 36.5 C17.6 25.7 14.3 22.4 3.5 20 C14.3 17.6 17.6 14.3 20 3.5Z" fill="${cream}"/>
    <circle cx="20" cy="20" r="5" fill="${pink}"/><circle cx="18.4" cy="18.4" r="1.8" fill="${THEME.color.shine}"/>
    <path d="M31 5 C31.6 8.4 32.6 9.4 36 10 C32.6 10.6 31.6 11.6 31 15 C30.4 11.6 29.4 10.6 26 10 C29.4 9.4 30.4 8.4 31 5Z" fill="${pink}"/>`,
    40,
  ),
  feed: svg(
    `<ellipse cx="25" cy="30" rx="10.5" ry="3.8" stroke="${water}" stroke-width="2.2" opacity=".8"/>
    <ellipse cx="25" cy="30" rx="4.8" ry="1.7" stroke="${water}" stroke-width="1.8" opacity=".6"/>
    <path d="M6 25 Q12 6 27 12" stroke="${cream}" stroke-width="1.8" stroke-dasharray="1.5 4" opacity=".85"/>
    <circle cx="9" cy="18" r="3.8" fill="${amber}"/><circle cx="15.5" cy="10.5" r="3.2" fill="${cream}"/>
    <circle cx="23" cy="9.5" r="2.8" fill="${pink}"/><circle cx="21" cy="25" r="2.6" fill="${amber}"/>
    <circle cx="27.5" cy="23" r="2.6" fill="${cream}"/><circle cx="30" cy="28" r="2.2" fill="${pink}"/>`,
    40,
    'fill="none" stroke-linecap="round"',
  ),
};

/** A speaker, with sound waves (on) or a cross (off). */
const SPEAKER = `<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>`;
export const SPEAKER_ON = svg(`${SPEAKER}<path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`);
export const SPEAKER_OFF = svg(`${SPEAKER}<path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round"/>`);

/** The sound channels: a pair of notes (music), ripples under the moon (ambience), a sparkle (effects). */
export const SOUND_ICONS: Readonly<Record<Bus, string>> = {
  music:
    svg(`<path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.6" fill="currentColor"/>`),
  ambience: svg(`<path d="M15.5 3.5a5 5 0 1 0 5 6.2 4 4 0 0 1-5-6.2z" fill="currentColor"/>
    <path d="M3 16q2.5-2 5 0t5 0 5 0 3 0M5 20q2-1.6 4 0t4 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round"/>`),
  sfx: svg(`<path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="currentColor"/>
    <circle cx="19" cy="4.5" r="1.4" fill="currentColor"/>`),
};
