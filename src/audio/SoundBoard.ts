import type { GameEventBus, GameEvents } from '../game/events';
import type { SpecialType } from '../model/types';
import * as sounds from './recipes';
import type { Voice } from './Synth';

/** What each game event sounds like (a recipe per event, with its payload): the game's whole soundtrack, in one map. */
/** What each special sounds like as it's born (one per type: a new special asks for its sound here). */
const BORN_SOUND: Readonly<Record<SpecialType, (v: Voice) => void>> = {
  striped: sounds.special,
  whirlpool: sounds.whirlpoolCreated,
  rainbow: sounds.rainbowCreated,
};

type SoundMap = { readonly [K in keyof GameEvents]: (v: Voice, event: GameEvents[K]) => void };
const SOUND_OF: SoundMap = {
  swap: (v) => {
    sounds.swap(v);
  },
  invalidSwap: (v) => {
    sounds.invalid(v);
  },
  moveSpent: (v, { movesLeft, goalsMet }) => {
    sounds.tick(v, goalsMet ? Infinity : movesLeft); // a victory lap ticks calmly
  },
  match: (v, { roundIndex, size }) => {
    sounds.match(v, roundIndex, size);
  },
  dive: (v) => {
    sounds.dive(v);
  },
  land: (v) => {
    sounds.land(v);
  },
  budHit: (v) => {
    sounds.budHit(v);
  },
  bloom: (v) => {
    sounds.bloom(v);
  },
  padDrift: (v) => {
    sounds.padDrift(v);
  },
  reshuffle: (v) => {
    sounds.shuffle(v);
  },
  goalMet: (v, { n }) => {
    sounds.bonus(v, n + 4);
  },
  allGoalsMet: (v) => {
    sounds.special(v);
  },
  specialBorn: (v, { type }) => {
    BORN_SOUND[type](v);
  },
  stripedFired: (v) => {
    sounds.current(v);
  },
  whirlpoolFired: (v) => {
    sounds.whirlpoolFired(v);
  },
  whirlpoolPopped: (v) => {
    sounds.whirlpoolPopped(v);
  },
  rainbowRose: (v) => {
    sounds.special(v);
  },
  rainbowFired: (v) => {
    sounds.rainbow(v);
  },
  rainbowArcLanded: (v, { n }) => {
    sounds.rainbowArcLanded(v, n);
  },
  boosterArmed: (v, { slot }) => {
    sounds.boostArm(v, slot);
  },
  boosterCancelled: (v) => {
    sounds.boostCancel(v);
  },
  boosterRefused: (v) => {
    sounds.invalid(v);
  },
  koiLifted: (v) => {
    sounds.lift(v);
  },
  koiLeapt: (v, { duration }) => {
    sounds.whoosh(v, duration);
  },
  koiLanded: (v, { low }) => {
    sounds.plop(v, low);
  },
  pelletsThrown: (v) => {
    sounds.pellets(v);
  },
  koiFed: (v) => {
    sounds.gulp(v);
  },
  petalsOpened: (v) => {
    sounds.petals(v);
    sounds.lift(v);
  },
  koiMorphed: (v) => {
    sounds.morph(v);
  },
  levelStarted: () => undefined, // no sound of its own: the music settles back to calm (see Soundtrack)
  won: (v) => {
    sounds.win(v);
  },
  lost: (v) => {
    sounds.lose(v);
  },
  starLanded: (v, { k }) => {
    sounds.star(v, k);
  },
  buttonClicked: (v) => {
    sounds.click(v);
  },
};

/**
 * The game's sound effects: plays what each of the game's events sounds like on the voice (the effects channel), and
 * knows nothing of the game beyond its events. Returns a function that stops it.
 */
export function playSoundsOf(events: GameEventBus, voice: Voice): () => void {
  const stops = (Object.keys(SOUND_OF) as (keyof GameEvents)[]).map((type) =>
    playOn(events, type, SOUND_OF[type], voice),
  );
  return () => {
    for (const stop of stops) stop();
  };
}

/** Plays an event's recipe whenever it happens (the map pairs each event with a recipe for its own payload). */
function playOn<K extends keyof GameEvents>(
  events: GameEventBus,
  type: K,
  play: SoundMap[K],
  voice: Voice,
): () => void {
  return events.on(type, (event) => {
    play(voice, event);
  });
}
