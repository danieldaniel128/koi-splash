import { GardenMusic } from '../audio/GardenMusic';
import { byBus, Mixer } from '../audio/Mixer';
import { NightAmbience } from '../audio/NightAmbience';
import { SampleTrack } from '../audio/SampleTrack';
import { playSoundsOf } from '../audio/SoundBoard';
import { Soundtrack } from '../audio/Soundtrack';
import { Synth } from '../audio/Synth';
import type { Track } from '../audio/Track';
import { AMBIENCE, AUDIO, BUSES, MUSIC } from '../config/audio';
import type { Bus } from '../config/audio';
import { SOUND_MENU } from '../config/ui';
import { storedSetting } from '../core/storedSetting';
import type { StoredSetting } from '../core/storedSetting';
import type { GameEventBus } from '../game/events';
import { placeSoundMenu } from '../layout/soundMenu';
import { SOUND_ICONS } from '../ui/icons';
import { SoundSettings } from '../ui/SoundSettings';
import type { GameScreen } from './screen';

/** The game's sound: the mixer, each channel's switch as the player left it, and the soundtrack. */
export interface Sound {
  readonly mixer: Mixer;
  readonly settings: Record<Bus, StoredSetting>;
  /** Written a little ahead on every frame. */
  readonly soundtrack: Soundtrack;
  /** Silences it for good (the game could not start): every channel off and the sound asleep. */
  stop(): void;
}

/**
 * The sound, on three channels: the effects (the prototype's synth playing what each game event sounds like), the
 * music and the ambience (made as they play, or recorded loops when the config names files). Each channel's switch
 * is kept between visits. Browsers only allow sound after the player's gesture, so the first tap, click or key starts
 * it; it sleeps while the page is hidden.
 */
export function startSound(events: GameEventBus): Sound {
  const settings = byBus((bus) => storedSetting(`${AUDIO.storageKey}.${bus}`));
  const mixer = new Mixer(byBus((bus) => settings[bus].load()));
  playSoundsOf(events, new Synth(mixer, 'sfx'));
  const soundtrack = new Soundtrack(events, [musicTrack(mixer), ambienceTrack(mixer)], mixer);
  mixer.listenForUnlock(window);
  const following = new AbortController(); // the page's visibility, until the sound is stopped
  document.addEventListener(
    'visibilitychange',
    () => {
      mixer.setAwake(!document.hidden);
    },
    { signal: following.signal },
  );
  const stop = (): void => {
    following.abort();
    for (const bus of BUSES) mixer.setOn(bus, false); // for this visit only: the player's choices stay stored
    mixer.setAwake(false);
  };
  return { mixer, settings, soundtrack, stop };
}

/** The menu at the end of the booster bar that switches each channel. Returned for the Escape key. */
export function addSoundMenu(
  screen: GameScreen,
  { mixer, settings }: Sound,
  events: GameEventBus,
): SoundSettings<Bus> {
  const { look, channels } = SOUND_MENU;
  const menu = new SoundSettings(screen.ui, placeSoundMenu(screen.layout.bar, channels.length, look), {
    channels: channels.map((channel) => ({ ...channel, icon: SOUND_ICONS[channel.id] })),
    isOn: (bus) => mixer.isOn(bus),
    onChange: (bus, on) => {
      mixer.setOn(bus, on);
      settings[bus].save(on);
    },
    onPress: () => {
      events.emit('buttonClicked');
    },
  });
  return menu;
}

/** The music: composed as it plays, or the recorded loop the config names. */
function musicTrack(mixer: Mixer): Track {
  return MUSIC.file
    ? new SampleTrack(mixer, 'music', MUSIC.file)
    : new GardenMusic(new Synth(mixer, 'music'));
}

/** The ambience: the pond at night made as it plays, or the recorded loop the config names. */
function ambienceTrack(mixer: Mixer): Track {
  return AMBIENCE.file
    ? new SampleTrack(mixer, 'ambience', AMBIENCE.file)
    : new NightAmbience(new Synth(mixer, 'ambience'));
}
