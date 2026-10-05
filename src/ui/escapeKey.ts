/** Something Escape can close: it closes and returns true, or returns false when it wasn't open. */
export type Closer = () => boolean;

/**
 * The game's one key handler: Escape closes the top thing that's open, and only that one. The closers are listed
 * top first, so one press never closes two things at once.
 */
export function closeOnEscape(target: Pick<Document, 'addEventListener'>, closers: readonly Closer[]): void {
  target.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && closers.some((close) => close())) event.preventDefault();
  });
}
