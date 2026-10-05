import { gsap } from 'gsap';
import { UPDATE_PRIORITY } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { Soundtrack } from '../audio/Soundtrack';
import type { BoardMarks } from '../view/BoardMarks';
import type { BoardView } from '../view/BoardView';
import type { Fireflies } from '../view/Fireflies';
import type { Impact } from '../view/Impact';
import type { KoiLife } from '../view/KoiLife';
import type { PadView } from '../view/PadView';
import type { PondWater } from '../view/water/PondWater';

/** Everything that moves on the app's clock. */
export interface FrameParts {
  readonly soundtrack: Soundtrack;
  readonly pond: PondWater;
  readonly pads: PadView;
  readonly marks: BoardMarks;
  readonly koiLife: KoiLife;
  readonly fireflies: Fireflies;
  readonly boardView: BoardView;
  readonly impact: Impact;
}

/** After every normal update, before the frame is drawn (Pixi draws at LOW). */
const AFTER_MOTION = UPDATE_PRIORITY.NORMAL - 1;
/** After the frame is drawn. */
const AFTER_DRAWING = UPDATE_PRIORITY.UTILITY;

/**
 * The game's work on every frame, in one place and in this order: the music and the ambience are written a little
 * ahead, the water steps, the lily pads rock, the booster's marks follow their koi, the koi swim and push the water
 * back (wakes when they move, tail flicks when they rest) and the fireflies drift. Then, once everything has moved,
 * the shadows follow the koi and the pond marks where they touch the water, for the foam around them, and the camera
 * and the flash settle. Once the frame is drawn, the pond lets go of its filter's input (see releaseFilterInput).
 */
export function addFrameLoop(ticker: Ticker, parts: FrameParts): void {
  const { soundtrack, pond, pads, marks, koiLife, fireflies, boardView, impact } = parts;
  // the tweens move on the app's clock, first in each frame, so a tween and the frame that draws it never drift apart
  gsap.ticker.remove(gsap.updateRoot);
  ticker.add(
    () => {
      gsap.updateRoot(performance.now() / 1000);
    },
    undefined,
    UPDATE_PRIORITY.HIGH,
  );
  ticker.add(({ deltaMS }) => {
    const seconds = deltaMS / 1000;
    soundtrack.update();
    pond.tick(seconds);
    pads.tick(seconds);
    marks.follow(seconds);
    koiLife.update([...boardView.koi()], seconds);
    fireflies.tick(seconds);
    impact.tick(seconds);
  });
  ticker.add(
    ({ deltaMS }) => {
      boardView.follow(deltaMS / 1000);
      pond.touch(boardView.contacts);
    },
    undefined,
    AFTER_MOTION,
  );
  ticker.add(
    () => {
      pond.releaseFilterInput();
    },
    undefined,
    AFTER_DRAWING,
  );
}
