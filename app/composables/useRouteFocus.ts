import type { MaybeRefOrGetter } from 'vue';

/**
 * Moves focus to an element, the app's wrapper, after every navigation to
 * another page, and when the error page replaces the app or the app comes
 * back after it: a keyboard or screen reader user then starts at the top of
 * the new page, with the skip link as the next stop, instead of on a link of
 * the page that is gone. AppShell does this for its own wrapper.
 *
 * A page that moves focus itself, into its `<main>`, keeps it: the code field
 * of a second factor after signing in, AuthPage's frame after following a
 * link between the sign-in pages, or any element a page focuses when it
 * mounts. Focus elsewhere moves on to the shell: also after a link in a
 * modal dialog that stays open over the new page as it comes in, such as a
 * mobile menu or a search dialog in the header. The page under it is inert
 * (FocusLoop's `inert` attribute, or the top layer of the native modal
 * Dialog, which sets none) and the browser ignores the focus, so it waits for
 * the dialog's `close` event, after which the dialog has given focus back to
 * its opener, and moves it on from there. An address with a hash focuses the
 * element it names, when the page has it already (`useHashFocus()`; a page
 * whose content arrives later calls it itself).
 */
export function useRouteFocus(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const route = useRoute();
  const router = useRouter();
  const { focusHash } = useHashFocus();

  /** Where focus was when the navigation started: the link followed. */
  let focusBefore: Element | null = null;

  /** Stops waiting for a dialog to close: a newer navigation, or unmount */
  let stopWaiting = () => {};
  onScopeDispose(() => stopWaiting());

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

  /**
   * Whether an open modal dialog keeps the element from taking focus: one
   * that made the page inert with the attribute (FocusLoop, as MobileMenu
   * does), or a native modal dialog in the top layer that does not hold it
   */
  function blockedByDialog(element: HTMLElement) {
    const dialogs = Array.from(document.querySelectorAll('dialog[open]'));

    return (
      dialogs.length > 0 &&
      (!!element.closest('[inert]') ||
        dialogs.some(
          (dialog) => dialog.matches(':modal') && !dialog.contains(element),
        ))
    );
  }

  // After the new page has rendered, so its own focus is in place. A modal
  // dialog that is still closing, after a link in it was followed, keeps the
  // page inert and gives focus back to its opener once it has closed: after
  // that, and from there, so focus on the opener is not taken for the page's.
  function focusTarget(previous: Element | null) {
    stopWaiting();

    const timeout = setTimeout(() => {
      const element = toValue(target);

      if (element && blockedByDialog(element)) {
        const onClose = () => focusTarget(document.activeElement);
        document.addEventListener('close', onClose, {
          capture: true,
          once: true,
        });
        stopWaiting = () =>
          document.removeEventListener('close', onClose, { capture: true });
        return;
      }

      if (pageMovedFocus(previous) || focusHash()) return;

      element?.focus();
    });
    stopWaiting = () => clearTimeout(timeout);
  }

  // The path alone: a changed query or hash is the same page
  watch(
    () => route.path,
    () => focusTarget(focusBefore),
  );

  // Arriving from a page in another layout mounts the wrapper anew and the
  // watcher does not fire: focus the same way, unless something in the new
  // wrapper has focus already. So does the error page, which replaces the
  // app, and the app that comes back after it, also without a navigation.
  // Not on the first page of a visit, where the browser starts at the top; a
  // reload of a later page keeps its history state and counts as arriving.
  // Whether this is the first render is read now, in setup: by the time the
  // wrapper mounts, Nuxt may have ended the hydration already, depending on
  // what wraps it (a NuxtLayout holds it back, app.vue alone does not).
  const isFirstRender = useNuxtApp().isHydrating;
  onMounted(() => {
    if (window.history.state?.back || !isFirstRender) focusTarget(null);
  });
}
