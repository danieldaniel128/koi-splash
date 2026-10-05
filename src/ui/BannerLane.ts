import { BANNER } from '../config/ui';
import type { Rect } from '../layout/gameLayout';
import type { Banner } from './banners';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/** The player has asked the system for less motion. */
const LESS_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * The banner lane over the top of the pond: one banner at a time ('Combo x3', 'Whirlpool!', 'Swirl!'), the newest
 * replacing the one up. It pops in with an overshoot, holds, then drifts up as it fades. Display only: it lets taps
 * through to the pond.
 */
export class BannerLane {
  private readonly root: HTMLElement;
  private readonly text = el('span', 'banner__text');
  private readonly sub = el('span', 'banner__sub');
  private showing: Animation | null = null;

  constructor(layer: UiLayer, rect: Rect) {
    this.root = el('div', 'banner', el('div', 'banner__ribbon', this.text, this.sub));
    this.root.setAttribute('aria-live', 'polite');
    layer.place(this.root, rect);
  }

  show(banner: Banner): void {
    this.text.textContent = banner.text;
    this.sub.textContent = banner.sub;
    this.root.classList.toggle('banner--sub', banner.sub !== '');
    this.root.style.setProperty('--banner-color', banner.color);
    this.showing?.cancel();
    this.showing = this.root.animate(keyframes(banner.scale, window.matchMedia(LESS_MOTION).matches), {
      duration: BANNER.lasts * 1000,
      fill: 'forwards',
    });
  }
}

/** Pops in (to popIn), holds, then fades out drifting up (the last fadeOut), as shares of the banner's time. */
function keyframes(scale: number, calm: boolean): Keyframe[] {
  const popped = BANNER.popIn / BANNER.lasts;
  const fading = 1 - BANNER.fadeOut / BANNER.lasts;
  const size = (k: number): string => `scale(${String(calm ? scale : scale * k)})`;
  return [
    {
      offset: 0,
      opacity: 0,
      transform: `translateY(0) ${size(0.3)}`,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    { offset: popped * 0.6, opacity: 1 },
    { offset: popped, transform: `translateY(0) ${size(1)}` },
    { offset: fading, opacity: 1, transform: `translateY(0) ${size(1)}`, easing: 'ease-in' },
    { offset: 1, opacity: 0, transform: `translateY(-12px) ${size(0.94)}` },
  ];
}
