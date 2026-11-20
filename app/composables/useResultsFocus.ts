import type { MaybeRefOrGetter } from 'vue';

/**
 * Brings a list of results to the reader after it changed in place (pagination,
 * filters). `focusResults()` focuses its top (`tabindex="-1"`); `revealResults()`
 * only scrolls it into view, below what sticks at the top, when it is out of
 * view, for when focus rightly stays on the control used. Not for the first
 * load after a navigation: AppShell has that.
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

    toValue(target)?.focus({ preventScroll: true });
    await revealResults();
  }

  return { focusResults, revealResults };
}
