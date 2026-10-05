import { describe, expect, it } from 'vitest';
import { Soundtrack } from '../src/audio/Soundtrack';
import type { Mood, Track } from '../src/audio/Track';
import { MUSIC } from '../src/config/audio';
import type { Bus } from '../src/config/audio';
import { LEVEL } from '../src/config/level';
import { createGameEvents } from '../src/game/events';
import type { GameEventBus } from '../src/game/events';

/** A soundtrack on one fake track, writing down the moods it was told and the dips it asked for. */
function rig(): { events: GameEventBus; moods: Mood[]; dips: [Bus, number, number][] } {
  const events = createGameEvents();
  const moods: Mood[] = [];
  const dips: [Bus, number, number][] = [];
  const track: Track = { update: () => undefined, setMood: (mood) => void moods.push(mood) };
  new Soundtrack(events, [track], { duck: (bus, depth, seconds) => void dips.push([bus, depth, seconds]) });
  return { events, moods, dips };
}

describe('Soundtrack', () => {
  it('turns the music tense at the low-moves mark, not a move before', () => {
    const { events, moods } = rig();
    const { low } = LEVEL.movesWarning;
    for (const movesLeft of [low + 1, low, low - 1]) events.emit('moveSpent', { movesLeft });
    expect(moods).toEqual(['calm', 'tense', 'tense']);
  });

  it('dips the music under every special that fires, as deep as its config says, and brings it back', () => {
    const { events, dips } = rig();
    events.emit('lineFired');
    events.emit('whirlPopped');
    events.emit('rainbowFired');
    const dip: [Bus, number, number] = ['music', MUSIC.duck.special, MUSIC.duck.back];
    expect(dips).toEqual([dip, dip, dip]);
  });

  it('dips the music under a match by its own depth, and under nothing else', () => {
    const { events, dips } = rig();
    events.emit('match', { round: 0, size: 3 });
    events.emit('swap');
    events.emit('bloom');
    expect(dips).toEqual([['music', MUSIC.duck.match, MUSIC.duck.back]]);
  });

  it('follows the level to its end, won or lost', () => {
    const won = rig();
    won.events.emit('won');
    const lost = rig();
    lost.events.emit('lost');
    expect([...won.moods, ...lost.moods]).toEqual(['won', 'lost']);
  });
});
