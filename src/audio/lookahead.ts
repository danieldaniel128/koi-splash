import { AUDIO } from '../config/audio';

/**
 * Writes sounds ahead on the audio clock: plays each one due before now + the lookahead (`delay` s from now) and
 * returns when the next is due. The music (a bar at a time) and the ambience (a sound at a time) both keep time this
 * way when a frame is late.
 */
export function scheduleAhead(
  next: number,
  now: number,
  play: (delay: number) => void,
  gap: () => number,
): number {
  let at = next;
  while (at < now + AUDIO.lookahead) {
    play(Math.max(0, at - now));
    at += gap();
  }
  return at;
}
