import { AUDIO, MATCH_SOUND } from '../config/audio';
import { MIN_RUN } from '../model/rules';
import { LEVEL } from '../config/level';
import { SPECIALS_SOUND } from '../config/specials';
import type { Voice } from './Synth';

/**
 * The game's sounds, the prototype's recipes note for note: what each one plays on the synth (see Voice). Pure
 * functions of the voice and their arguments, so they can be heard in any order, or tested against a fake voice.
 */

const rand = (low: number, high: number): number => low + Math.random() * (high - low);

// --- the pond

/** Two koi swap: a rising sine and a breath of water. */
export function swap(v: Voice): void {
  v.tone(330, 0.16, 0.1, { glide: 540 });
  v.noise(0.16, 0.05, 700, { sweepTo: 2200 });
}

/** A swap that makes nothing: two soft knocks, down. */
export function invalid(v: Voice): void {
  v.tone(250, 0.11, 0.09, { type: 'triangle', glide: 200 });
  v.tone(196, 0.16, 0.08, { type: 'triangle', delay: 0.09, glide: 150 });
}

/** A move spent: a soft water tick, warmer at a few moves left, a gentle double knock on the last ones. */
export function tick(v: Voice, movesLeft: number): void {
  if (movesLeft <= LEVEL.movesWarning.last) {
    v.tone(330, 0.12, 0.08, { glide: 250 });
    v.tone(262, 0.16, 0.07, { delay: 0.13, glide: 200 });
  } else if (movesLeft <= LEVEL.movesWarning.low) {
    v.pluck(v.note(2), 0.07);
    v.tone(v.note(0), 0.2, 0.03, { type: 'triangle', delay: 0.06 });
  } else v.tone(rand(1100, 1250), 0.06, 0.035, { glide: 800 });
}

/** A match: plucked notes climbing with each round of a cascade, a splash, and plips. */
export function match(v: Voice, round: number, size: number): void {
  const root = MATCH_SOUND.firstNote + Math.min(round, MATCH_SOUND.maxClimb);
  v.pluck(v.note(root), 0.15);
  v.pluck(v.note(root + MATCH_SOUND.second), 0.1, 0.06);
  if (size > MIN_RUN) v.pluck(v.note(root + MATCH_SOUND.third), 0.09, 0.12);
  const splash = MATCH_SOUND.splash + Math.min(size, MATCH_SOUND.koiCap) * MATCH_SOUND.perKoi;
  v.noise(0.3, splash, 1300, { sweepTo: 380 });
  for (let k = 0; k < 3; k++) v.plip(0.04 + k * 0.05 + Math.random() * 0.03);
}

/** A koi slips under: a soft rising bloop (throttled, so a diving school stays gentle). */
export function dive(v: Voice): void {
  if (!v.throttle('dive', AUDIO.diveGap)) return;
  v.tone(rand(250, 330), 0.11, 0.05, { glide: rand(560, 720) });
}

/** A koi settles into its new cell: a soft low knock (throttled). */
export function land(v: Voice): void {
  if (!v.throttle('land', AUDIO.landGap)) return;
  v.tone(rand(150, 190), 0.09, 0.045, { glide: 95 });
}

/** A bud is hit: a pluck and a high bell. */
export function budHit(v: Voice): void {
  v.pluck(v.note(9), 0.1);
  v.tone(v.note(14), 0.4, 0.035, { delay: 0.05 });
}

/** A lotus blooms: a chime rising with the petals, then a bell chord at full bloom. */
export function bloom(v: Voice): void {
  const { unfold, stagger } = SPECIALS_SOUND.bloom;
  for (let k = 0; k < 8; k++) v.pluck(v.note(5 + k), 0.06 + k * 0.006, k * stagger * 2);
  v.pluck(v.note(12), 0.1, unfold);
  v.tone(v.note(15), 1.4, 0.05, { delay: unfold });
  v.tone(v.note(17), 1.2, 0.035, { delay: unfold + 0.04 });
}

/** An empty pad drifts away. */
export function padDrift(v: Voice): void {
  v.tone(rand(210, 250), 0.32, 0.05, { glide: 150 });
  v.noise(0.4, 0.035, 700, { delay: 0.03, sweepTo: 260 });
}

/** The board had no move left and is dealt again: a cascade of plucks down. */
export function shuffle(v: Voice): void {
  for (let k = 0; k < 6; k++) v.pluck(v.note(12 - k), 0.07, k * 0.05);
}

/** A goal is met: its bonus lands. */
export function bonus(v: Voice, step: number): void {
  v.pluck(v.note(8 + (step % 8)), 0.09);
  v.plip(0.03);
}

// --- the specials

/** A special is made. */
export function special(v: Voice): void {
  v.tone(v.note(5), 0.35, 0.1, { type: 'triangle', glide: v.note(10) });
  v.tone(v.note(12), 0.5, 0.05, { delay: 0.12 });
}

/** A rainbow koi is born: the special's sound and a glassy chime. */
export function rainbowBorn(v: Voice): void {
  special(v);
  prismHit(v, SPECIALS_SOUND.chimeMax);
}

/** A whirlpool is born: a swirl of water, the special's sound and plips. */
export function whirlBorn(v: Voice): void {
  v.noise(0.35, 0.08, 500, { sweepTo: 2400, attack: 0.2 });
  special(v);
  for (let k = 0; k < 3; k++) v.plip(0.12 + k * 0.05);
}

/** A striped koi fires: a rushing sweep and a rising sine. */
export function current(v: Voice): void {
  v.noise(0.5, 0.16, 450, { sweepTo: 2800 });
  v.tone(180, 0.4, 0.1, { glide: 720 });
}

/** A rainbow koi's beams fly: a harp glissando up the scale over a shimmering glass chord. */
export function rainbow(v: Voice): void {
  for (let k = 0; k < 9; k++) v.pluck(v.note(6 + k), 0.055, k * 0.03);
  v.tone(v.note(16), 1, 0.04, { delay: 0.08 });
  v.tone(v.note(16) * 1.006, 1, 0.035, { delay: 0.08 }); // two glasses a hair apart shimmer
  v.tone(v.note(18), 0.8, 0.025, { delay: 0.16 });
  v.noise(0.6, 0.05, 2400, { sweepTo: 7000, attack: 0.2 });
}

/** A prism beam lands: a glassy chime climbing with every hit. */
export function prismHit(v: Voice, n: number): void {
  const f = v.note(6 + Math.min(n, SPECIALS_SOUND.chimeMax));
  v.tone(f, 0.32, 0.055);
  v.tone(f * 2.005, 0.16, 0.02);
}

/** A whirlpool spins up: a whoosh swelling over a deep slide down the drain and gurgling blips. */
export function whirl(v: Voice): void {
  const d = SPECIALS_SOUND.whirl;
  v.noise(d + 0.1, 0.15, 260, { sweepTo: 2200, attack: d * 0.7 });
  v.tone(150, d + 0.1, 0.12, { glide: 50, attack: d * 0.3 });
  for (let k = 0; k < 5; k++)
    v.tone(rand(90, 160), 0.07, 0.055, { delay: 0.05 + (k * d) / 6, glide: rand(220, 340) });
}

/** The vortex closes: a splash and a deep plunk under a burst of rising bubbly bloops. */
export function whirlPop(v: Voice): void {
  v.noise(0.45, 0.15, 1700, { sweepTo: 280 });
  v.tone(115, 0.32, 0.14, { glide: 58 });
  for (let k = 0; k < 6; k++)
    v.tone(rand(300, 540), 0.09, 0.05, { delay: 0.02 + k * 0.035, glide: rand(800, 1350) });
}

// --- the boosters

/** A booster is armed: a pluck and a bell, higher for each booster on the bar. */
export function boostArm(v: Voice, slot: number): void {
  v.pluck(v.note(7 + slot * 2), 0.09);
  v.tone(v.note(12 + slot * 2), 0.5, 0.035, { delay: 0.05 });
  v.plip(0.05);
}

/** A booster is put away, or the petals fold. */
export function boostCancel(v: Voice): void {
  v.tone(540, 0.14, 0.05, { glide: 330 });
}

/** A koi rises out of the water. */
export function lift(v: Voice): void {
  v.tone(300, 0.22, 0.07, { glide: 600 });
  v.plip(0.06);
}

/** Two koi leap: a whoosh as long as the leap. */
export function whoosh(v: Voice, duration: number): void {
  v.noise(duration, 0.13, 420, { sweepTo: 2600, attack: duration * 0.45 });
  v.tone(200, duration * 0.9, 0.04, { glide: 460, attack: duration * 0.4 });
}

/** A koi drops back into the water (`low`: the second one, a little lower). */
export function plop(v: Voice, low: boolean): void {
  const f = low ? 0.82 : 1;
  v.tone(rand(175, 205) * f, 0.18, 0.13, { glide: 68 * f });
  v.noise(0.24, 0.08, 1500, { sweepTo: 320 });
  v.plip(0.05);
  v.plip(0.1);
}

/** Pellets are thrown: tiny high ticks. */
export function pellets(v: Voice): void {
  for (let k = 0; k < 6; k++)
    v.tone(rand(2300, 3300), 0.035, 0.022, { type: 'triangle', delay: 0.02 + k * 0.04 });
}

/** A fed koi reaches the food (throttled: a gathering school stays soft). */
export function gulp(v: Voice): void {
  if (!v.throttle('gulp', AUDIO.diveGap * 1.5)) return;
  v.tone(rand(200, 245), 0.12, 0.06, { glide: rand(95, 120) });
  v.plip(0.04);
}

/** The special booster's petals open. */
export function petals(v: Voice): void {
  for (let k = 0; k < 3; k++) v.pluck(v.note(9 + k * 2), 0.06, k * SPECIALS_SOUND.petalStagger);
}

/** A koi spins up into a special. */
export function morph(v: Voice): void {
  const d = SPECIALS_SOUND.morph;
  v.noise(d + 0.1, 0.07, 600, { sweepTo: 3200, attack: d * 0.7 });
  for (let k = 0; k < 5; k++) v.tone(v.note(8 + k), 0.2, 0.03, { delay: (k * d) / 5 });
}

// --- the level and the UI

/** The pond is won: a rising phrase and a high bell. */
export function win(v: Voice): void {
  [7, 9, 10, 12, 14].forEach((n, k) => {
    v.pluck(v.note(n), 0.12, k * 0.11);
  });
  v.tone(v.note(19), 1.2, 0.05, { delay: 0.55 });
}

/** Out of moves: a falling phrase. */
export function lose(v: Voice): void {
  [7, 5, 4, 2].forEach((n, k) => {
    v.pluck(v.note(n), 0.1, k * 0.16);
  });
}

/** A star lands on the end card: a chime climbing star by star over a soft splash. */
export function star(v: Voice, k: number): void {
  const f = v.note(9 + k * 2);
  v.pluck(f, 0.12);
  v.tone(f * 2, 0.5, 0.04, { delay: 0.04 });
  v.noise(0.25, 0.04, 2400, { sweepTo: 600 });
}

/** A button takes (play again, the sound toggle). */
export function click(v: Voice): void {
  v.tone(520, 0.06, 0.06, { type: 'triangle', glide: 720 });
}
