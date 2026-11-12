import type { MaybeRefOrGetter } from 'vue';

/**
 * Moves focus to an element, the app's wrapper, after every navigation to
 * another page: a keyboard or screen reader user then starts at the top of
 * the new page, with the skip link as the next stop, instead of on a link of
 * the page that is gone. AppShell does this for its own wrapper.
 *
 * A page that moves focus itself, into its `<main>`, keeps it: the code field
 * of a second factor after signing in, AuthPage's frame after following a
 * link between the sign-in pages, or any element a page focuses when it
 * mounts. Focus elsewhere, such as the button a mobile menu gives it back to
 * as it closes, moves on to the shell. An address
 * with a hash focuses the element it names, when the page has it already
 * (`useHashFocus()`; a page whose content arrives later calls it itself).
 */
export function useRouteFocus(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const route = useRoute();
  const router = useRouter();
  const { focusHash } = useHashFocus();

  /** Where focus was when the navigation started: the link followed. */
  let focusBefore: Element | null = null;

  // In the browser only: a navigation while rendering on the server has no
  // focus to remember
  if (import.meta.client) {
    const removeGuard = router.beforeEach(() => {
      focusBefore = document.activeElement;
    });
    onScopeDispose(removeGuard);
  }

  /**
   * Whether the new page has put focus somewhere itself: in its `<main>`,
   * and not still on what had it before (a link there that stays). Focus on
   * the body (the link followed went with the old page) or outside main (a
   * menu's button in the header, which it returns to as it closes) is not the
   * page's.
   */
  function pageMovedFocus(previous: Element | null) {
    const active = document.activeElement;

    return !!active && active !== previous && !!active.closest('main');
  }

  // After the new page has rendered, so its own focus is in place
  function focusTarget(previous: Element | null) {
    setTimeout(() => {
      if (pageMovedFocus(previous) || focusHash()) return;

      toValue(target)?.focus();
    });
  }

  // The path alone: a changed query or hash is the same page
  watch(
    () => route.path,
    () => focusTarget(focusBefore),
  );

  // Arriving from a page in another layout mounts the wrapper anew and the
  // watcher does not fire: focus the same way, unless something in the new
  // wrapper has focus already. Not on the first page of a visit, where the
  // browser starts at the top; a reload of a later page keeps its history
  // state and counts as arriving.
  onMounted(() => {
    if (window.history.state?.back) focusTarget(null);
  });
}
