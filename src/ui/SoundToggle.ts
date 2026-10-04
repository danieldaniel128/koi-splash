import type { Rect } from '../layout/gameLayout';
import { setIcon } from './icons';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/** A speaker, with sound waves (on) or a cross (off). */
const SPEAKER_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
  <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round"/></svg>`;
const SPEAKER_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
  <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/** The sound on or off, kept between visits (a private window may refuse to keep it: then it's just on). */
export interface SoundSetting {
  load(): boolean;
  save(on: boolean): void;
}

/** The sound setting kept in the browser's local storage under `key`. */
export function storedSetting(key: string): SoundSetting {
  return {
    load: () => {
      try {
        return localStorage.getItem(key) !== 'off';
      } catch {
        return true;
      }
    },
    save: (on) => {
      try {
        localStorage.setItem(key, on ? 'on' : 'off');
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
    },
  };
}

/** A small glass button that turns the sound on and off, its speaker showing which. */
export class SoundToggle {
  private readonly button = el('button', 'orb sound-toggle');

  constructor(layer: UiLayer, rect: Rect, on: boolean, onChange: (on: boolean) => void) {
    this.button.type = 'button';
    this.show(on);
    this.button.addEventListener('click', () => {
      const next = this.button.getAttribute('aria-pressed') !== 'true';
      this.show(next);
      onChange(next);
    });
    layer.place(this.button, rect);
  }

  private show(on: boolean): void {
    setIcon(this.button, on ? SPEAKER_ON : SPEAKER_OFF);
    this.button.setAttribute('aria-pressed', `${on}`);
    this.button.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
  }
}
