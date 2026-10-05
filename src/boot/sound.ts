import { GardenMusic } from '../audio/GardenMusic';
import { byBus, Mixer } from '../audio/Mixer';
import type { Bus } from '../audio/Mixer';
import { NightAmbience } from '../audio/NightAmbience';
import { SampleTrack } from '../audio/SampleTrack';
import { SoundBoard } from '../audio/SoundBoard';
import { Soundtrack } from '../audio/Soundtrack';
import { Synth } from '../audio/Synth';
import type { Track } from '../audio/Track';
import { AMBIENCE, AUDIO, MUSIC } from '../config/audio';
import { SOUND_MENU } from '../config/ui';
import { storedSetting } from '../core/storedSetting';
import type { GameEventBus } from '../game/events';
import { placeSoundMenu } from '../layout/soundMenu';
import { SOUND_ICONS } from '../ui/icons';
import { SoundSettings } from '../ui/SoundSettings';
import type { GameScreen } from './screen';

/** The game's sound: the soundtrack, written a little ahead on every frame, and the menu that switches it. */
export interface Sound {
  readonly soundtrack: Soundtrack;
  readonly menu: SoundSettings<Bus>;
}

/**
 * The sound, on three channels: the effects (the prototype's synth playing what each game event sounds like), the
 * music and the ambience (made as they play, or recorded loops when the config names files). A menu at the end of
 * the booster bar switches each channel (kept between visits). Browsers only allow sound after the player's gesture,
 * so the first tap, click or key starts it; it sleeps while the page is hidden.
 */
export function startSound(events: GameEventBus, screen: GameScreen): Sound {
  const settings = byBus((bus) => storedSetting(`${AUDIO.storageKey}.${bus}`));
  const mixer = new Mixer(byBus((bus) => settings[bus].load()));
  new SoundBoard(events, new Synth(mixer, 'sfx'));
  const soundtrack = new Soundtrack(events, [musicTrack(mixer), ambienceTrack(mixer)], mixer);
  mixer.listenForUnlock(window);
  document.addEventListener('visibilitychange', () => {
    mixer.setAwake(!document.hidden);
  });
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
  return { soundtrack, menu };
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
