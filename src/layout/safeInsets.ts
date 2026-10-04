import type { SafeInsets } from './gameLayout';

/**
 * The phone's notch and home bar, in screen px: CSS knows them as env(safe-area-inset-*) (with viewport-fit=cover),
 * so a hidden probe takes them as padding and we read it back. 0 on screens without them.
 */
export function readSafeInsets(): SafeInsets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  return insets;
}
