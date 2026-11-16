import type { MaybeRefOrGetter } from 'vue';

/**
 * Brings a list of results to the reader after it changed in place: another
 * page of a pagination, filters applied or reset. `focusResults()` moves focus
 * to the list's top (an element with `tabindex="-1"`), so a keyboard or
 * screen reader user goes on from the new results; `revealResults()` only
 * brings it into view, for when focus rightly stays on the control used.
 *
 * Not for the first load after a navigation: AppShell's route focus has that.
 *
 * The top scrolls into view only when it is out of view: above the room
 * that what sticks at the top takes (the scroll padding, which AppHeader
 * sets) or below the viewport. It lands right under that room, smoothly
 * unless the reader prefers reduced motion, so the list needs no scroll
 * margin of its own.
 */
export function useResultsFocus(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  async function revealResults() {
    await nextTick();

    const results = toValue(target);
    if (!results) return;

    const { top } = results.getBoundingClientRect();
    const covered =
      parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingBlockStart,
      ) || 0;
    if (top >= covered && top < window.innerHeight) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    results.scrollIntoView({
      block: 'start',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  async function focusResults() {
    await nextTick();

    // Without the browser's own jump: revealResults scrolls only if needed
    toValue(target)?.focus({ preventScroll: true });
    await revealResults();
  }

  return { focusResults, revealResults };
}
