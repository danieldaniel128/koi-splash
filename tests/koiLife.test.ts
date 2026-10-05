import { describe, expect, it } from 'vitest';
import type { Koi } from '../src/view/Koi';
import { KoiLife } from '../src/view/KoiLife';

/** Just what KoiLife reads and calls on a koi: where it is, its fade and size, and its swim and flick. */
interface FakeKoi {
  x: number;
  y: number;
  alpha: number;
  width: number;
  flicks: number;
  beats: number;
  swim(): void;
  flick(): void;
  tailPoint(): { x: number; y: number };
}

function fakeKoi(x: number, y: number): FakeKoi {
  return {
    x,
    y,
    alpha: 1,
    width: 40,
    flicks: 0,
    beats: 0,
    swim() {
      this.beats++;
    },
    flick() {
      this.flicks++;
    },
    tailPoint() {
      return { x: this.x, y: this.y + 14 };
    },
  };
}

/** The water: only counts the pushes. */
const water = {
  pushes: 0,
  push() {
    this.pushes++;
  },
};
const FRAME = 1 / 60;

/** Plays `frames` frames, moving `swimmer` down a little every frame. */
function play(life: KoiLife, fish: FakeKoi[], swimmer: FakeKoi, frames: number): void {
  for (let f = 0; f < frames; f++) {
    swimmer.y += 2;
    life.update(fish as unknown as Koi[], FRAME);
  }
}

describe('KoiLife', () => {
  it('never flicks a koi that is moving', () => {
    const swimmer = fakeKoi(0, 0);
    const fish = [swimmer];
    play(new KoiLife(water, { x: 0, y: 0 }, () => 0.5), fish, swimmer, 600);
    expect(swimmer.flicks).toBe(0);
  });

  it('flicks resting koi now and then', () => {
    const swimmer = fakeKoi(0, 0);
    const resting = fakeKoi(50, 0);
    const fish = [swimmer, resting];
    let toss = 0;
    const random = (): number => (toss++ % 2 === 0 ? 0.75 : 0.5); // picks the resting koi
    play(new KoiLife(water, { x: 0, y: 0 }, random), fish, swimmer, 600);
    expect(resting.flicks).toBeGreaterThan(0);
    expect(swimmer.flicks).toBe(0);
  });
});
