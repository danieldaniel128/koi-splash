import type { Rect } from '../layout/gameLayout';
import { setIcon, SPEAKER_OFF, SPEAKER_ON } from './icons';
import type { UiLayer } from './UiLayer';
import { button, el } from './UiLayer';

/** One channel the player can switch: its id, its name and its icon (a fixed SVG string from icons.ts). */
export interface SoundChannel<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly icon: string;
}

/** What the menu shows and whom it tells. */
export interface SoundSettingsOptions<Id extends string> {
  readonly channels: readonly SoundChannel<Id>[];
  isOn(id: Id): boolean;
  onChange(id: Id, on: boolean): void;
  /** A button was pressed (for its click sound). */
  onPress(): void;
}

/**
 * The speaker button at the end of the booster bar and the small glass menu it opens above it: a switch per sound
 * channel (music, ambience, effects). The speaker shows a cross when every channel is off. The menu closes on a
 * second press, a tap anywhere else or Escape (the game's key handler calls close). While it's open, a clear scrim
 * covers the rest of the UI and the board: a tap away lands on it and only closes the menu. The menu follows its
 * button for the keyboard: Tab goes from the speaker into the open menu, and opened from a key, it takes the focus.
 */
export class SoundSettings<Id extends string> {
  private readonly button = button('control pressable orb sound-button');
  private readonly menu = el('div', 'panel reveal sound-menu');
  private readonly scrim = el('div', 'sound-scrim');
  private readonly switches = new Map<Id, HTMLButtonElement>();

  constructor(
    layer: UiLayer,
    rects: { button: Rect; menu: Rect },
    private readonly options: SoundSettingsOptions<Id>,
  ) {
    this.menu.id = 'sound-menu'; // there is one, under the bar's speaker
    this.menu.setAttribute('role', 'group');
    this.menu.setAttribute('aria-label', 'Sound');
    for (const channel of options.channels) this.menu.append(this.row(channel));
    this.button.setAttribute('aria-controls', this.menu.id);
    this.button.addEventListener('click', (event) => {
      options.onPress();
      this.setOpen(!this.isOpen());
      if (this.isOpen() && event.detail === 0) [...this.switches.values()][0]?.focus(); // opened from a key
    });
    // closed on the click, not the press: the whole tap lands on the scrim, so none of it reaches what's under it
    this.scrim.addEventListener('click', () => {
      this.setOpen(false);
    });
    this.setOpen(false);
    this.showSpeaker();
    layer.root.append(this.scrim);
    layer.place(this.button, rects.button);
    layer.place(this.menu, rects.menu);
  }

  /** Closes the menu and gives the focus back to its button. False when it wasn't open. */
  close(): boolean {
    if (!this.isOpen()) return false;
    this.setOpen(false);
    this.button.focus();
    return true;
  }

  private isOpen(): boolean {
    return this.menu.classList.contains('reveal--shown');
  }

  private setOpen(open: boolean): void {
    this.menu.classList.toggle('reveal--shown', open);
    this.menu.inert = !open;
    this.scrim.hidden = !open;
    this.button.setAttribute('aria-expanded', `${open}`);
  }

  /** A row: the channel's icon and name, and its switch. The whole row is the switch's button. */
  private row(channel: SoundChannel<Id>): HTMLButtonElement {
    const icon = el('span', 'sound-menu__icon');
    setIcon(icon, channel.icon);
    const knob = el('span', 'switch', el('span', 'switch__knob'));
    const name = el('span', 'sound-menu__name', channel.name);
    const row = button('control sound-menu__row', undefined, icon, name, knob);
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', `${this.options.isOn(channel.id)}`);
    row.addEventListener('click', () => {
      const on = row.getAttribute('aria-checked') !== 'true';
      row.setAttribute('aria-checked', `${on}`);
      this.options.onChange(channel.id, on);
      this.options.onPress();
      this.showSpeaker();
    });
    this.switches.set(channel.id, row);
    return row;
  }

  /** The speaker crosses out when every channel is off. */
  private showSpeaker(): void {
    const any = [...this.switches.values()].some((row) => row.getAttribute('aria-checked') === 'true');
    setIcon(this.button, any ? SPEAKER_ON : SPEAKER_OFF);
    this.button.classList.toggle('sound-button--muted', !any);
    this.button.setAttribute('aria-label', any ? 'Sound settings' : 'Sound settings (all off)');
  }
}
